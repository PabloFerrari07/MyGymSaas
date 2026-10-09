import { useEffect, useState } from 'react'
import { api } from './api.js'

// How an exercise is done: start/end photos, equipment, level and the steps.
export default function ExerciseInfo({ exercise }) {
  const [info, setInfo] = useState(undefined) // undefined = loading, null = no description

  useEffect(() => {
    let live = true
    setInfo(undefined)
    api
      .exerciseInfo(exercise)
      .then((i) => live && setInfo(i))
      .catch(() => live && setInfo(null))
    return () => {
      live = false
    }
  }, [exercise.image_url]) // eslint-disable-line react-hooks/exhaustive-deps

  if (info === undefined) return <p className="muted small">Cargando descripción…</p>
  if (!info) return <p className="muted small">Este ejercicio no tiene descripción.</p>

  return (
    <div className="info">
      {info.images.length > 0 && (
        <div className="info-photos">
          {info.images.map((src, i) => (
            <figure key={src}>
              <img src={src} alt={`${exercise.name}: ${i === 0 ? 'posición inicial' : 'posición final'}`} loading="lazy" />
              <figcaption className="muted small">{i === 0 ? 'Inicio' : 'Final'}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="chips">
        {info.equipment && <span className="pill">{info.equipment}</span>}
        {info.level && <span className="pill">{info.level}</span>}
        {info.secondary.map((m) => (
          <span key={m} className="pill">+ {m}</span>
        ))}
      </div>
      {info.steps.length > 0 ? (
        <ol className="steps">
          {info.steps.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      ) : (
        <p className="muted small">Sin pasos escritos para este ejercicio.</p>
      )}
    </div>
  )
}
