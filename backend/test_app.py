import pytest

from app import create_app


@pytest.fixture
def client():
    app = create_app("sqlite:///:memory:")
    return app.test_client()


def make_exercise(client, name="Press banca"):
    return client.post("/api/exercises", json={"name": name, "image_url": "https://x/y.jpg"}).get_json()


def test_exercise_requires_name(client):
    assert client.post("/api/exercises", json={"name": " "}).status_code == 400


def test_routine_with_exercises(client):
    e = make_exercise(client)
    r = client.post("/api/routines", json={"name": "Push", "exercises": [{"exercise_id": e["id"], "target_sets": 4}]})
    assert r.status_code == 201
    got = client.get(f"/api/routines/{r.get_json()['id']}").get_json()
    assert got["exercises"][0]["name"] == "Press banca"
    assert got["exercises"][0]["target_sets"] == 4


def test_workout_history_and_best(client):
    e = make_exercise(client)
    for day, w in [("2026-10-01", 60), ("2026-10-05", 65)]:
        res = client.post("/api/workouts", json={
            "date": day,
            "entries": [{"exercise_id": e["id"], "sets": [{"weight": w, "reps": 8}, {"weight": w, "reps": 6}, {"weight": "", "reps": ""}]}],
        })
        assert res.status_code == 201 and res.get_json()["sets"] == 2
    h = client.get(f"/api/exercises/{e['id']}/history").get_json()
    assert [s["date"] for s in h["sessions"]] == ["2026-10-05", "2026-10-01"]
    assert h["best"]["weight"] == 65 and h["best"]["reps"] == 8
    assert h["sessions"][0]["volume"] == 65 * 8 + 65 * 6


def test_empty_workout_rejected(client):
    e = make_exercise(client)
    res = client.post("/api/workouts", json={"entries": [{"exercise_id": e["id"], "sets": [{"weight": "", "reps": ""}]}]})
    assert res.status_code == 400


def test_cannot_delete_used_exercise(client):
    e = make_exercise(client)
    client.post("/api/workouts", json={"entries": [{"exercise_id": e["id"], "sets": [{"weight": 10, "reps": 5}]}]})
    assert client.delete(f"/api/exercises/{e['id']}").status_code == 409


def test_catalog_search_spanish(client):
    res = client.get("/api/catalog?q=press banca").get_json()
    assert res and all(r["image_url"].startswith("https://") for r in res)
    assert any("bench" in r["name"].lower() for r in res)


def test_recent_includes_exercise_breakdown_and_last_done(client):
    e = make_exercise(client)
    r = client.post("/api/routines", json={"name": "Pecho", "exercises": [{"exercise_id": e["id"], "target_sets": 3, "target_reps": 10}]}).get_json()
    client.post("/api/workouts", json={"routine_id": r["id"], "date": "2026-10-05", "entries": [
        {"exercise_id": e["id"], "sets": [{"weight": 60, "reps": 10}, {"weight": 60, "reps": 9}]}]})
    w = client.get("/api/workouts/recent").get_json()[0]
    ex = w["exercises"][0]
    assert w["routine"] == "Pecho" and ex["target_sets"] == 3 and len(ex["sets"]) == 2
    assert client.get("/api/routines").get_json()[0]["last_done"] == "2026-10-05"


def test_catalog_place_filter(client):
    home = client.get("/api/catalog?place=home").get_json()
    gym = client.get("/api/catalog?place=gym").get_json()
    assert home and gym
    assert {r["equipment"] for r in home} <= {"barbell", "dumbbell", "kettlebells", "e-z curl bar", "other", "body only", ""}
    assert all(r["place"] == "home" for r in home) and all(r["place"] == "gym" for r in gym)
    assert not any(r["equipment"] in ("machine", "cable") for r in home)


def test_exercise_stores_place(client):
    e = client.post("/api/exercises", json={"name": "Curl", "place": "home"}).get_json()
    assert e["place"] == "home"
    assert client.post("/api/exercises", json={"name": "X", "place": "bogus"}).get_json()["place"] == ""


def test_password_protects_everything_but_manifest(monkeypatch):
    import base64

    monkeypatch.setenv("APP_PASSWORD", "secreto")
    c = create_app("sqlite:///:memory:").test_client()
    assert c.get("/api/exercises").status_code == 401
    assert c.get("/manifest.webmanifest").status_code != 401
    ok = base64.b64encode(b"yo:secreto").decode()
    assert c.get("/api/exercises", headers={"Authorization": f"Basic {ok}"}).status_code == 200
    bad = base64.b64encode(b"yo:mal").decode()
    assert c.get("/api/exercises", headers={"Authorization": f"Basic {bad}"}).status_code == 401


def test_unknown_api_is_json_404(client):
    assert client.get("/api/nope").status_code == 404
