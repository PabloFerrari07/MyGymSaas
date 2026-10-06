import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Routines from './pages/Routines.jsx'
import RoutineEditor from './pages/RoutineEditor.jsx'
import Workout from './pages/Workout.jsx'
import Exercises from './pages/Exercises.jsx'
import ExerciseHistory from './pages/ExerciseHistory.jsx'
import Log from './pages/Log.jsx'

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <span className="brand">mygym</span>
        <NavLink to="/routines">Rutinas</NavLink>
        <NavLink to="/exercises">Ejercicios</NavLink>
        <NavLink to="/log">Historial</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/routines" replace />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/new" element={<RoutineEditor />} />
          <Route path="/routines/:id/edit" element={<RoutineEditor />} />
          <Route path="/routines/:id/train" element={<Workout />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseHistory />} />
          <Route path="/log" element={<Log />} />
        </Routes>
      </main>
    </div>
  )
}
