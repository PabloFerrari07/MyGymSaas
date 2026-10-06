import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Thumb, formatDate, useLoad } from '../components.jsx'

const today = () => new Date().toLocaleDateString('sv')

export default function Routines() {
  const { data, error, reload } = useLoad(api.routines)

  async function remove(r) {
    if (!confirm(`¿Borrar la rutina "${r.name}"?`)) return
    await api.deleteRoutine(r.id)
    reload()
  }

  return (
    <>
      <header className="head">
        <h1>Rutinas</h1>
        <Link className="btn" to="/routines/new">Nueva</Link>
      </header>
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p className="muted">Aún no tienes rutinas. Crea una para empezar.</p>}
      <ul className="list">
        {data?.map((r) => (
          <li key={r.id} className="card">
            <div className="row">
              <h2>{r.name}</h2>
              {r.last_done === today() ? (
                <span className="ok">Hecho hoy ✓</span>
              ) : (
                <span className="muted small">
                  {r.last_done ? `Última vez ${formatDate(r.last_done)}` : 'Sin entrenar'}
                </span>
              )}
            </div>
            <ul className="plan">
              {r.exercises.map((e) => (
                <li key={e.id}>
                  <span>{e.name}</span>
                  <span className="muted">{e.target_sets} × {e.target_reps}</span>
                </li>
              ))}
            </ul>
            <div className="thumbs">
              {r.exercises.slice(0, 6).map((e) => (
                <Thumb key={e.id} src={e.image_url} name={e.name} size={32} />
              ))}
            </div>
            <div className="actions">
              <Link className="btn primary" to={`/routines/${r.id}/train`}>Entrenar</Link>
              <Link className="btn" to={`/routines/${r.id}/edit`}>Editar</Link>
              <button className="btn ghost" onClick={() => remove(r)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
