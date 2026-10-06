from datetime import UTC, date, datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Exercise(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    image_url = db.Column(db.String(500), default="")
    muscle_group = db.Column(db.String(60), default="")
    place = db.Column(db.String(10), default="")  # "home" | "gym" | "" (unknown)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "image_url": self.image_url or "",
            "muscle_group": self.muscle_group or "",
            "place": self.place or "",
        }


class Routine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    items = db.relationship(
        "RoutineExercise",
        order_by="RoutineExercise.position",
        cascade="all, delete-orphan",
        backref="routine",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "exercises": [i.to_dict() for i in self.items],
        }


class RoutineExercise(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    routine_id = db.Column(db.Integer, db.ForeignKey("routine.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercise.id"), nullable=False)
    position = db.Column(db.Integer, default=0)
    target_sets = db.Column(db.Integer, default=3)
    target_reps = db.Column(db.Integer, default=10)
    exercise = db.relationship("Exercise")

    def to_dict(self):
        return {
            **self.exercise.to_dict(),
            "target_sets": self.target_sets,
            "target_reps": self.target_reps,
        }


class Workout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    routine_id = db.Column(db.Integer, db.ForeignKey("routine.id"), nullable=True)
    date = db.Column(db.Date, default=date.today, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    sets = db.relationship("SetLog", cascade="all, delete-orphan", backref="workout")


class SetLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workout.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercise.id"), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False, default=0)
    reps = db.Column(db.Integer, nullable=False, default=0)
