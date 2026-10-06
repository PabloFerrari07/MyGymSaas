import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Routines from './pages/Routines.jsx'
import RoutineEditor from './pages/RoutineEditor.jsx'
import Workout from './pages/Workout.jsx'
import Exercises from './pages/Exercises.jsx'
import ExerciseHistory from './pages/ExerciseHistory.jsx'
import Log from './pages/Log.jsx'
import Progress from './pages/Progress.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './auth.jsx'

export default function App() {
  const { user, loading, logout } = useAuth()
  if (loading) return <p className="muted center">Cargando…</p>
  if (!user) return <div className="app"><Login /></div>
  return (
    <div className="app">
      <nav className="nav">
        <span className="brand">mygym</span>
        <NavLink to="/routines">Rutinas</NavLink>
        <NavLink to="/exercises">Ejercicios</NavLink>
        <NavLink to="/progress">Progreso</NavLink>
        <NavLink to="/log">Historial</NavLink>
        <button className="icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">⎋</button>
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
          <Route path="/progress" element={<Progress />} />
          <Route path="/log" element={<Log />} />
        </Routes>
      </main>
    </div>
  )
}
