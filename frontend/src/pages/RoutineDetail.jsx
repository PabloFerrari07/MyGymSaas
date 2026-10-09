import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { BodyMini, MUSCLE_LABEL, routineMuscles } from '../BodyMap.jsx'
import { Thumb, fmt, useLoad } from '../components.jsx'
import ExerciseInfo from '../ExerciseInfo.jsx'
import Icon from '../icons.jsx'

// A routine opened from the list: all its exercises, each one explained, before training.
export default function RoutineDetail() {
  const { id } = useParams()
  const { data: r, error } = useLoad(() => api.routine(id), [id])
  const [open, setOpen] = useState(null)

  if (error) return <p className="error">{error}</p>
  if (!r) return <p className="muted">Cargando…</p>
  const muscles = routineMuscles(r)

  return (
    <>
      <header className="head">
        <Link className="icon back" to="/routines" aria-label="Volver a rutinas"><Icon name="back" size={20} /></Link>
        <h1 className="trunc grow">{r.name}</h1>
      </header>

      <div className="routine-top">
        <BodyMini muscles={muscles} height={104} />
        <div className="grow">
          <div className="muted small">
            {r.exercises.length} {r.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            {muscles.length > 0 && ` · ${muscles.map((m) => MUSCLE_LABEL[m]).join(', ')}`}
          </div>
          <div className="actions">
            <Link className="btn primary" to={`/routines/${r.id}/train`}>Entrenar</Link>
            <Link className="btn" to={`/routines/${r.id}/edit`}>Editar</Link>
          </div>
        </div>
      </div>

      <h2 className="section">Ejercicios</h2>
      <ul className="ex-compact">
        {r.exercises.map((e, i) => {
          const isOpen = open === e.id
          return (
            <li key={e.id} className={`ex-row ${isOpen ? 'open' : ''}`}>
              <button type="button" className="ex-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)}>
                <span className="ex-num">{i + 1}</span>
                <Thumb src={e.image_url} name={e.name} size={40} />
                <span className="ex-main">
                  <strong className="trunc">{e.name}</strong>
                  <span className="muted small">
                    {e.target_sets} × {e.target_reps}
                    {e.target_weight > 0 ? ` · ${fmt(e.target_weight)} kg` : ''}
                  </span>
                </span>
                <span className="chev"><Icon name="chevron" size={18} /></span>
              </button>
              {isOpen && (
                <div className="ex-edit">
                  <ExerciseInfo exercise={e} />
                  <div className="ex-actions">
                    <Link className="btn ghost" to={`/exercises/${e.id}`}>Ver historial</Link>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
