import hmac
import json
import os
from datetime import date

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from models import Exercise, Routine, RoutineExercise, SetLog, Workout, db

IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
_here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_here, "catalog_slim.json"), encoding="utf8") as _f:
    CATALOG = json.load(_f)

# "Casa" = barra, mancuernas, discos, pesas rusas. Everything else counts as gym.
HOME_EQUIPMENT = {"barbell", "dumbbell", "kettlebells", "e-z curl bar"}


def is_home(c):
    return c["e"] in HOME_EQUIPMENT or "plate" in c["n"].lower()


# Spanish -> English terms so searching in Spanish works against the English catalog.
ALIASES = {
    "press": "press", "banca": "bench", "pecho": "chest", "espalda": "back", "hombro": "shoulder",
    "hombros": "shoulders", "biceps": "biceps", "triceps": "triceps", "pierna": "leg", "piernas": "legs",
    "sentadilla": "squat", "peso muerto": "deadlift", "remo": "row", "dominada": "pull-up",
    "dominadas": "pull-up", "flexion": "push-up", "flexiones": "push-up", "abdominales": "abdominals",
    "abdomen": "abdominals", "gluteo": "glutes", "gluteos": "glutes", "cuadriceps": "quadriceps",
    "isquios": "hamstrings", "gemelos": "calves", "pantorrilla": "calves", "mancuerna": "dumbbell",
    "mancuernas": "dumbbell", "barra": "barbell", "polea": "cable", "maquina": "machine",
    "curl": "curl", "zancada": "lunge", "zancadas": "lunge", "elevaciones": "raise", "laterales": "lateral",
    "jalon": "pulldown", "fondos": "dip", "trapecio": "traps", "antebrazo": "forearms",
}


def migrate_place():
    """Add Exercise.place to databases created before it existed, and backfill it from the catalog."""
    cols = [r[1] for r in db.session.execute(db.text("PRAGMA table_info(exercise)"))]
    if "place" not in cols:
        db.session.execute(db.text("ALTER TABLE exercise ADD COLUMN place VARCHAR(10) DEFAULT ''"))
        db.session.commit()
    by_image = {IMG_BASE + c["i"][0]: ("home" if is_home(c) else "gym") for c in CATALOG}
    for e in Exercise.query.filter((Exercise.place == "") | (Exercise.place.is_(None))).all():
        if e.image_url in by_image:
            e.place = by_image[e.image_url]
    db.session.commit()


def create_app(db_uri=None):
    app = Flask(__name__)
    base = os.path.dirname(os.path.abspath(__file__))
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri or f"sqlite:///{os.path.join(base, 'mygym.db')}"
    CORS(app)
    web_dir = os.path.join(base, "web")

    # Optional single-user password (HTTP Basic). Set APP_PASSWORD on the server to enable it.
    password = os.environ.get("APP_PASSWORD")
    open_paths = {"/manifest.webmanifest", "/sw.js", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"}

    @app.before_request
    def require_password():
        if not password or request.path in open_paths:
            return None
        auth = request.authorization
        if auth and hmac.compare_digest(auth.password or "", password):
            return None
        return Response("Login required", 401, {"WWW-Authenticate": 'Basic realm="MyGym"'})

    db.init_app(app)
    with app.app_context():
        db.create_all()
        migrate_place()

    def bad(msg, code=400):
        return jsonify({"error": msg}), code

    # ---------- Catalog (public exercise images) ----------
    @app.get("/api/catalog")
    def search_catalog():
        words = []
        for w in (request.args.get("q") or "").lower().split():
            words.append(ALIASES.get(w, w))
        place = request.args.get("place")
        out = []
        for c in CATALOG:
            if place == "home" and not is_home(c):
                continue
            if place == "gym" and is_home(c):
                continue
            hay = f"{c['n']} {c['m']} {c['e']}".lower()
            if all(w in hay for w in words):
                out.append({
                    "name": c["n"],
                    "muscle_group": c["m"],
                    "equipment": c["e"],
                    "place": "home" if is_home(c) else "gym",
                    "image_url": IMG_BASE + c["i"][0],
                    "alt_image_url": IMG_BASE + c["i"][-1],
                })
                if len(out) >= 40:
                    break
        return jsonify(out)

    # ---------- Exercises ----------
    @app.get("/api/exercises")
    def list_exercises():
        rows = Exercise.query.order_by(Exercise.name).all()
        return jsonify([e.to_dict() for e in rows])

    @app.post("/api/exercises")
    def create_exercise():
        d = request.get_json(silent=True) or {}
        name = (d.get("name") or "").strip()
        if not name:
            return bad("name is required")
        e = Exercise(
            name=name,
            image_url=(d.get("image_url") or "").strip(),
            muscle_group=(d.get("muscle_group") or "").strip(),
            place=d.get("place") if d.get("place") in ("home", "gym") else "",
        )
        db.session.add(e)
        db.session.commit()
        return jsonify(e.to_dict()), 201

    @app.put("/api/exercises/<int:eid>")
    def update_exercise(eid):
        e = db.get_or_404(Exercise, eid)
        d = request.get_json(silent=True) or {}
        if "name" in d:
            name = (d["name"] or "").strip()
            if not name:
                return bad("name is required")
            e.name = name
        if "image_url" in d:
            e.image_url = (d["image_url"] or "").strip()
        if "muscle_group" in d:
            e.muscle_group = (d["muscle_group"] or "").strip()
        if d.get("place") in ("home", "gym", ""):
            e.place = d["place"]
        db.session.commit()
        return jsonify(e.to_dict())

    @app.delete("/api/exercises/<int:eid>")
    def delete_exercise(eid):
        e = db.get_or_404(Exercise, eid)
        used = RoutineExercise.query.filter_by(exercise_id=eid).first() or SetLog.query.filter_by(exercise_id=eid).first()
        if used:
            return bad("exercise is used in routines or history", 409)
        db.session.delete(e)
        db.session.commit()
        return "", 204

    # ---------- History ----------
    def exercise_history(eid):
        rows = (
            db.session.query(SetLog, Workout)
            .join(Workout, SetLog.workout_id == Workout.id)
            .filter(SetLog.exercise_id == eid)
            .order_by(Workout.date.desc(), Workout.id.desc(), SetLog.set_number)
            .all()
        )
        sessions, index = [], {}
        for s, w in rows:
            if w.id not in index:
                index[w.id] = {"workout_id": w.id, "date": w.date.isoformat(), "sets": []}
                sessions.append(index[w.id])
            index[w.id]["sets"].append({"set_number": s.set_number, "weight": s.weight, "reps": s.reps})
        for sess in sessions:
            sess["top_weight"] = max(x["weight"] for x in sess["sets"])
            sess["volume"] = sum(x["weight"] * x["reps"] for x in sess["sets"])
        return sessions

    @app.get("/api/exercises/<int:eid>/history")
    def get_history(eid):
        e = db.get_or_404(Exercise, eid)
        sessions = exercise_history(eid)
        best = None
        for sess in sessions:
            for s in sess["sets"]:
                if best is None or (s["weight"], s["reps"]) > (best["weight"], best["reps"]):
                    best = {**s, "date": sess["date"]}
        return jsonify({"exercise": e.to_dict(), "sessions": sessions, "best": best})

    # ---------- Routines ----------
    def apply_items(routine, items):
        routine.items.clear()
        for pos, it in enumerate(items):
            ex = db.session.get(Exercise, it.get("exercise_id"))
            if not ex:
                raise ValueError(f"exercise {it.get('exercise_id')} not found")
            routine.items.append(
                RoutineExercise(
                    exercise_id=ex.id,
                    position=pos,
                    target_sets=int(it.get("target_sets") or 3),
                    target_reps=int(it.get("target_reps") or 10),
                )
            )

    @app.get("/api/routines")
    def list_routines():
        out = []
        for r in Routine.query.order_by(Routine.name).all():
            d = r.to_dict()
            last = Workout.query.filter_by(routine_id=r.id).order_by(Workout.date.desc()).first()
            d["last_done"] = last.date.isoformat() if last else None
            out.append(d)
        return jsonify(out)

    @app.get("/api/routines/<int:rid>")
    def get_routine(rid):
        return jsonify(db.get_or_404(Routine, rid).to_dict())

    @app.post("/api/routines")
    def create_routine():
        d = request.get_json(silent=True) or {}
        name = (d.get("name") or "").strip()
        if not name:
            return bad("name is required")
        r = Routine(name=name)
        try:
            apply_items(r, d.get("exercises") or [])
        except ValueError as err:
            return bad(str(err))
        db.session.add(r)
        db.session.commit()
        return jsonify(r.to_dict()), 201

    @app.put("/api/routines/<int:rid>")
    def update_routine(rid):
        r = db.get_or_404(Routine, rid)
        d = request.get_json(silent=True) or {}
        if "name" in d:
            name = (d["name"] or "").strip()
            if not name:
                return bad("name is required")
            r.name = name
        if "exercises" in d:
            try:
                apply_items(r, d["exercises"] or [])
            except ValueError as err:
                return bad(str(err))
        db.session.commit()
        return jsonify(r.to_dict())

    @app.delete("/api/routines/<int:rid>")
    def delete_routine(rid):
        r = db.get_or_404(Routine, rid)
        Workout.query.filter_by(routine_id=rid).update({"routine_id": None})
        db.session.delete(r)
        db.session.commit()
        return "", 204

    # ---------- Workouts ----------
    @app.post("/api/workouts")
    def create_workout():
        d = request.get_json(silent=True) or {}
        try:
            day = date.fromisoformat(d["date"]) if d.get("date") else date.today()
        except ValueError:
            return bad("invalid date")
        w = Workout(routine_id=d.get("routine_id"), date=day)
        count = 0
        for entry in d.get("entries") or []:
            if not db.session.get(Exercise, entry.get("exercise_id")):
                return bad(f"exercise {entry.get('exercise_id')} not found")
            n = 0
            for s in entry.get("sets") or []:
                try:
                    weight, reps = float(s.get("weight")), int(s.get("reps"))
                except (TypeError, ValueError):
                    continue  # skip empty/invalid rows
                if reps <= 0:
                    continue
                n += 1
                count += 1
                w.sets.append(SetLog(exercise_id=entry["exercise_id"], set_number=n, weight=weight, reps=reps))
        if count == 0:
            return bad("no valid sets to save")
        db.session.add(w)
        db.session.commit()
        return jsonify({"id": w.id, "sets": count}), 201

    @app.get("/api/workouts/recent")
    def recent_workouts():
        ws = Workout.query.order_by(Workout.date.desc(), Workout.id.desc()).limit(120).all()
        out = []
        for w in ws:
            r = db.session.get(Routine, w.routine_id) if w.routine_id else None
            targets = {i.exercise_id: i for i in r.items} if r else {}
            by_ex = {}
            for s in sorted(w.sets, key=lambda x: (x.exercise_id, x.set_number)):
                by_ex.setdefault(s.exercise_id, []).append(s)
            exercises = []
            for eid, sets in by_ex.items():
                ex = db.session.get(Exercise, eid)
                t = targets.get(eid)
                exercises.append({
                    "id": eid,
                    "name": ex.name,
                    "image_url": ex.image_url or "",
                    "target_sets": t.target_sets if t else None,
                    "target_reps": t.target_reps if t else None,
                    "sets": [{"weight": s.weight, "reps": s.reps} for s in sets],
                })
            out.append({
                "id": w.id,
                "date": w.date.isoformat(),
                "routine": r.name if r else None,
                "sets": len(w.sets),
                "volume": sum(s.weight * s.reps for s in w.sets),
                "exercises": exercises,
            })
        return jsonify(out)

    @app.delete("/api/workouts/<int:wid>")
    def delete_workout(wid):
        w = db.get_or_404(Workout, wid)
        db.session.delete(w)
        db.session.commit()
        return "", 204

    # ---------- Frontend (built React app) ----------
    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        if path.startswith("api/"):
            return bad("not found", 404)
        full = os.path.join(web_dir, path)
        if path and os.path.isfile(full):
            return send_from_directory(web_dir, path)
        if not os.path.isfile(os.path.join(web_dir, "index.html")):
            return bad("frontend not built: run `npm run build` in frontend/", 404)
        return send_from_directory(web_dir, "index.html")

    return app



if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
