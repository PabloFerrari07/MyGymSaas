import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import ExerciseSheet from '../CatalogPicker.jsx'
import { Thumb, useLoad } from '../components.jsx'
import { useToast } from '../toast.jsx'

export default function RoutineEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: library, reload } = useLoad(api.exercises)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api.routine(id).then((r) => {
      setName(r.name)
      setItems(r.exercises.map((e) => ({ ...e, exercise_id: e.id })))
    })
  }, [id])

  // Tap in the sheet toggles the exercise in this routine.
  async function toggle(item) {
    const idx = items.findIndex((i) => i.image_url === item.image_url && i.name === item.name)
    if (idx >= 0) {
      setItems((cur) => cur.filter((_, k) => k !== idx))
      toast(`Quitado: ${item.name}`, 'info')
      return
    }
    try {
      let ex = library?.find((e) => e.image_url === item.image_url && e.name === item.name)
      if (!ex) {
        ex = await api.createExercise({ name: item.name, image_url: item.image_url, muscle_group: item.muscle_group, place: item.place })
        reload()
      }
      setItems((cur) => [...cur, { ...ex, exercise_id: ex.id, target_sets: 3, target_reps: 10, target_weight: '' }])
      toast(`Añadido: ${item.name}`)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const patch = (i, field, value) =>
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))
  const remove = (i) => setItems((cur) => cur.filter((_, idx) => idx !== i))
  const move = (i, d) =>
    setItems((cur) => {
      const j = i + d
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  async function save(ev) {
    ev.preventDefault()
    setError('')
    if (items.length === 0) {
      setError('Añade al menos un ejercicio.')
      return
    }
    setSaving(true)
    const body = {
      name,
      exercises: items.map((it) => ({
        exercise_id: it.exercise_id,
        target_sets: Number(it.target_sets) || 3,
        target_reps: Number(it.target_reps) || 10,
        target_weight: Number(it.target_weight) || 0,
      })),
    }
    try {
      if (id) await api.updateRoutine(id, body)
      else await api.createRoutine(body)
      toast(id ? `Rutina "${name}" actualizada` : `Rutina "${name}" creada`)
      nav('/routines')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <header className="head">
        <h1>{id ? 'Editar rutina' : 'Nueva rutina'}</h1>
      </header>
      <input
        className="input"
        placeholder="Nombre (ej. Pecho, Pierna…)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <h2 className="section">Ejercicios ({items.length})</h2>
      {items.length === 0 && (
        <p className="muted">Todavía no hay ejercicios. Añade el primero con el botón de abajo.</p>
      )}
      <ul className="list">
        {items.map((it, i) => (
          <li key={`${it.exercise_id}-${i}`} className="card item">
            <Thumb src={it.image_url} name={it.name} size={48} />
            <div className="grow">
              <strong>{it.name}</strong>
              <div className="target">
                <input className="input mini" type="number" inputMode="numeric" min="1" value={it.target_sets}
                  onChange={(e) => patch(i, 'target_sets', e.target.value)} aria-label="Series" />
                <span className="small">series ×</span>
                <input className="input mini" type="number" inputMode="numeric" min="1" value={it.target_reps}
                  onChange={(e) => patch(i, 'target_reps', e.target.value)} aria-label="Repeticiones" />
                <span className="small">reps</span>
                <span className="small">@</span>
                <input className="input mini" type="number" inputMode="decimal" step="0.5" min="0"
                  placeholder="kg" value={it.target_weight || ''}
                  onChange={(e) => patch(i, 'target_weight', e.target.value)} aria-label="Peso en kilos" />
                <span className="small">kg</span>
              </div>
            </div>
            <div className="col">
              <button type="button" className="icon" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
              <button type="button" className="icon" onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
            </div>
            <button type="button" className="icon" onClick={() => remove(i)} aria-label="Quitar">×</button>
          </li>
        ))}
      </ul>

      <button type="button" className="btn add" onClick={() => setPicking(true)}>
        + Añadir ejercicios
      </button>

      {error && <p className="error">{error}</p>}
      <div className="bar">
        <Link className="btn" to="/routines">Cancelar</Link>
        <button className="btn primary grow" type="submit" disabled={saving}>
          {id ? 'Guardar cambios' : 'Crear rutina'}
        </button>
      </div>

      {picking && (
        <ExerciseSheet
          title="Añadir a la rutina"
          library={library || []}
          picked={items.map((i) => i.image_url)}
          onPick={toggle}
          onClose={() => setPicking(false)}
        />
      )}
    </form>
  )
}
