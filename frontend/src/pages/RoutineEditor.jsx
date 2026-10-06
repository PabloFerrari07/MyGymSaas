import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { BodyPicker } from '../BodyMap.jsx'
import ExerciseSheet from '../CatalogPicker.jsx'
import { Thumb, fmt, useLoad } from '../components.jsx'
import Icon from '../icons.jsx'
import Stepper from '../Stepper.jsx'
import { useToast } from '../toast.jsx'

export default function RoutineEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: library, reload } = useLoad(api.exercises)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState('')
  const [muscles, setMuscles] = useState([])
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(null) // exercise being edited (only one open at a time)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let live = true
    api.routine(id).then((r) => {
      if (!live) return
      setName(r.name)
      setMuscles(r.muscles)
      // Keep anything added while this was loading.
      setItems((cur) => [...r.exercises.map((e) => ({ ...e, exercise_id: e.id })), ...cur])
    })
    return () => {
      live = false
    }
  }, [id])

  const toggleMuscle = (k) => setMuscles((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))

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
  const remove = (i) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i))
    setOpen(null)
  }
  const move = (i, d) => {
    setItems((cur) => {
      const j = i + d
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setOpen(null)
  }

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
      muscles,
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
    <>
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
          enterKeyHint="done"
        />

        <h2 className="section">Músculos a trabajar</h2>
        <div className="card">
          <BodyPicker selected={muscles} onToggle={toggleMuscle} />
        </div>

        <h2 className="section">Ejercicios ({items.length})</h2>
        {items.length === 0 && (
          <p className="muted">Todavía no hay ejercicios. {muscles.length ? 'Se filtrarán por los músculos elegidos.' : ''}</p>
        )}
        <ul className="ex-compact">
          {items.map((it, i) => {
            const key = `${it.exercise_id}-${i}`
            const isOpen = open === key
            return (
              <li key={key} className={`ex-row ${isOpen ? 'open' : ''}`}>
                <button type="button" className="ex-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                  <span className="ex-num">{i + 1}</span>
                  <Thumb src={it.image_url} name={it.name} size={40} />
                  <span className="ex-main">
                    <strong className="trunc">{it.name}</strong>
                    <span className="muted small">
                      {it.target_sets} × {it.target_reps}
                      {Number(it.target_weight) > 0 ? ` · ${fmt(Number(it.target_weight))} kg` : ''}
                    </span>
                  </span>
                  <span className="chev"><Icon name="chevron" size={18} /></span>
                </button>
                {isOpen && (
                  <div className="ex-edit">
                    <div className="steppers">
                      <Stepper label="Series" value={it.target_sets} min={1} onChange={(v) => patch(i, 'target_sets', v)} />
                      <Stepper label="Reps" value={it.target_reps} min={1} onChange={(v) => patch(i, 'target_reps', v)} />
                      <Stepper label="Kg" value={it.target_weight} min={0} step={2.5} onChange={(v) => patch(i, 'target_weight', v)} />
                    </div>
                    <div className="ex-actions">
                      <button type="button" className="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                        <Icon name="up" size={18} />
                      </button>
                      <button type="button" className="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar">
                        <Icon name="down" size={18} />
                      </button>
                      <button type="button" className="btn ghost danger" onClick={() => remove(i)}>Quitar</button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
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
      </form>

      {/* Outside the form: the keyboard's Enter key must never save the routine. */}
      {picking && (
        <ExerciseSheet
          title="Añadir a la rutina"
          library={library || []}
          muscles={muscles}
          picked={items.map((i) => i.image_url)}
          onPick={toggle}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}
