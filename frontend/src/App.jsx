import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Routines from './pages/Routines.jsx'
import RoutineEditor from './pages/RoutineEditor.jsx'
import Workout from './pages/Workout.jsx'
import Exercises from './pages/Exercises.jsx'
import ExerciseHistory from './pages/ExerciseHistory.jsx'
import Log from './pages/Log.jsx'
import Progress from './pages/Progress.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './auth.jsx'
import Icon from './icons.jsx'

const TABS = [
  ['/routines', 'routines', 'Rutinas'],
  ['/exercises', 'exercises', 'Ejercicios'],
  ['/progress', 'progress', 'Progreso'],
  ['/log', 'history', 'Historial'],
]

export default function App() {
  const { user, loading, logout } = useAuth()
  const { pathname } = useLocation()
  // Focus screens (editing a routine, training) have their own action bar, so the tabs hide there.
  const focus = /^\/routines\/(new|[^/]+\/(edit|train))/.test(pathname)
  if (loading) return <p className="muted center">Cargando…</p>
  if (!user) return <div className="app"><Login /></div>
  return (
    <div className={`app ${focus ? '' : 'has-tabs'}`}>
      <header className="topbar">
        <span className="brand">mygym</span>
        <button className="icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={20} /></button>
      </header>
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
      {!focus && (
        <nav className="tabs" aria-label="Menú principal">
          {TABS.map(([to, icon, label]) => (
            <NavLink key={to} to={to} className="tab" aria-label={label}>
              <Icon name={icon} />
              <span className="tab-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
