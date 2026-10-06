import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { BodyMini, MUSCLE_LABEL, routineMuscles } from '../BodyMap.jsx'
import { formatDate, useLoad } from '../components.jsx'

const today = () => new Date().toLocaleDateString('sv')
const PREVIEW = 3

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
        <Link className="btn primary" to="/routines/new">Nueva</Link>
      </header>
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p className="muted">Aún no tienes rutinas. Crea una para empezar.</p>}
      <ul className="list">
        {data?.map((r) => {
          const muscles = routineMuscles(r)
          const rest = r.exercises.length - PREVIEW
          return (
            <li key={r.id} className="card routine">
              <div className="routine-top">
                <BodyMini muscles={muscles} height={104} />
                <div className="grow">
                  <h2 className="trunc">{r.name}</h2>
                  {r.last_done === today() ? (
                    <span className="ok">Hecho hoy ✓</span>
                  ) : (
                    <span className="muted small">
                      {r.last_done ? `Última vez ${formatDate(r.last_done)}` : 'Sin entrenar'}
                    </span>
                  )}
                  <div className="muted small">
                    {r.exercises.length} {r.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                    {muscles.length > 0 && ` · ${muscles.map((m) => MUSCLE_LABEL[m]).join(', ')}`}
                  </div>
                </div>
              </div>
              <ul className="plan">
                {r.exercises.slice(0, PREVIEW).map((e) => (
                  <li key={e.id}>
                    <span className="trunc">{e.name}</span>
                    <span className="muted nowrap">{e.target_sets} × {e.target_reps}</span>
                  </li>
                ))}
                {rest > 0 && <li className="muted small">+ {rest} más</li>}
              </ul>
              <div className="actions">
                <Link className="btn primary" to={`/routines/${r.id}/train`}>Entrenar</Link>
                <Link className="btn" to={`/routines/${r.id}/edit`}>Editar</Link>
                <button className="btn ghost" onClick={() => remove(r)}>Borrar</button>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
