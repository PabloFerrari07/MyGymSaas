import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { Thumb, fmt, formatDate, useLoad } from '../components.jsx'

function Chart({ sessions }) {
  const pts = [...sessions].reverse().map((s) => s.top_weight)
  if (pts.length < 2) return null
  const W = 320, H = 80, pad = 6
  const min = Math.min(...pts), max = Math.max(...pts)
  const span = max - min || 1
  const xy = pts.map((v, i) => [
    pad + (i * (W - 2 * pad)) / (pts.length - 1),
    H - pad - ((v - min) / span) * (H - 2 * pad),
  ])
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Peso máximo por sesión">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={xy.map((p) => p.join(',')).join(' ')} />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />)}
    </svg>
  )
}

export default function ExerciseHistory() {
  const { id } = useParams()
  const { data, error } = useLoad(() => api.history(id), [id])
  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Cargando…</p>
  const { exercise: e, sessions, best } = data

  return (
    <>
      <header className="head">
        <div className="item">
          <Thumb src={e.image_url} name={e.name} size={56} />
          <div>
            <h1>{e.name}</h1>
            {e.muscle_group && <div className="muted small">{e.muscle_group}</div>}
          </div>
        </div>
      </header>

      {best && (
        <div className="card stat">
          <span className="muted small">Mejor serie</span>
          <strong>{fmt(best.weight)} kg × {best.reps}</strong>
          <span className="muted small">{formatDate(best.date)}</span>
        </div>
      )}

      <Chart sessions={sessions} />

      {sessions.length === 0 && <p className="muted">Sin registros todavía.</p>}
      <ul className="list">
        {sessions.map((s) => (
          <li key={s.workout_id} className="card">
            <div className="row">
              <strong>{formatDate(s.date)}</strong>
              <span className="muted small">vol. {fmt(s.volume)} kg</span>
            </div>
            <div className="sets-line">
              {s.sets.map((x) => (
                <span key={x.set_number} className="pill">{fmt(x.weight)} × {x.reps}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Link className="btn" to="/exercises">Volver</Link>
    </>
  )
}
