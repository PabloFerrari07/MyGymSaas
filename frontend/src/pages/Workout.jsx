import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { Thumb, fmt, formatDate } from '../components.jsx'
import Icon from '../icons.jsx'
import { useToast } from '../toast.jsx'

const today = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD, local time
const topWeight = (list) => Math.max(0, ...list.map((x) => Number(x.weight)))

export default function Workout() {
  const { id } = useParams()
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [routine, setRoutine] = useState(null)
  const [last, setLast] = useState({}) // exercise_id -> most recent session
  const [sets, setSets] = useState({}) // exercise_id -> [{weight, reps, done}]
  const [open, setOpen] = useState(null) // exercise being trained (one open at a time)
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    api.routine(id).then(async (r) => {
      const hist = await Promise.all(r.exercises.map((e) => api.history(e.id)))
      if (!live) return
      const lastMap = {}
      const init = {}
      r.exercises.forEach((e, i) => {
        lastMap[e.id] = hist[i].sessions[0] || null
        const prev = lastMap[e.id]?.sets || []
        init[e.id] = Array.from({ length: e.target_sets }, (_, k) => {
          const ref = prev[k] || prev[prev.length - 1]
          // The weight chosen in the routine wins; otherwise start from the last session.
          const weight = e.target_weight > 0 ? String(e.target_weight) : ref ? String(ref.weight) : ''
          return { weight, reps: ref ? String(ref.reps) : String(e.target_reps), done: false }
        })
      })
      setRoutine(r)
      setLast(lastMap)
      setSets(init)
      setOpen(r.exercises[0]?.id ?? null)
    })
    return () => {
      live = false
    }
  }, [id])

  function patch(eid, i, field, value) {
    const list = sets[eid].map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    setSets((cur) => ({ ...cur, [eid]: list }))
    // Finished every set of this exercise: move on to the next one that is not finished.
    if (field === 'done' && value && list.every((s) => s.done)) {
      const order = routine.exercises
      const from = order.findIndex((e) => e.id === eid)
      const next = [...order.slice(from + 1), ...order.slice(0, from)].find(
        (e) => !(e.id === eid ? list : sets[e.id]).every((s) => s.done),
      )
      setOpen(next ? next.id : null)
    }
  }
  const addSet = (eid) =>
    setSets((cur) => {
      const list = cur[eid]
      const lastSet = list[list.length - 1]
      return { ...cur, [eid]: [...list, { weight: lastSet?.weight ?? '', reps: lastSet?.reps ?? '', done: false }] }
    })
  const removeSet = (eid, i) => setSets((cur) => ({ ...cur, [eid]: cur[eid].filter((_, idx) => idx !== i) }))
  const doneCount = Object.values(sets).flat().filter((s) => s.done).length
  const totalCount = Object.values(sets).flat().length

  async function finish() {
    setError('')
    setSaving(true)
    const entries = routine.exercises.map((e) => ({
      exercise_id: e.id,
      sets: sets[e.id]
        .filter((s) => s.done && Number(s.reps) > 0)
        .map((s) => ({ weight: s.weight === '' ? 0 : s.weight, reps: s.reps })),
    }))
    try {
      const res = await api.saveWorkout({ routine_id: routine.id, date, entries })
      const records = routine.exercises.filter((e) => {
        const top = topWeight(entries.find((x) => x.exercise_id === e.id).sets)
        const before = last[e.id] ? last[e.id].top_weight : null
        return before !== null && top > before
      })
      const volume = entries.flatMap((x) => x.sets).reduce((a, x) => a + Number(x.weight) * Number(x.reps), 0)
      // The routine follows your progress: next time it starts from the weight you just lifted.
      const items = routine.exercises.map((e) => ({
        exercise_id: e.id,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: topWeight(entries.find((x) => x.exercise_id === e.id).sets) || e.target_weight,
      }))
      await api.updateRoutine(routine.id, { exercises: items }).catch(() => {})
      toast('Entreno guardado')
      setSummary({ sets: res.sets, volume, records })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (!routine) return <p className="muted">Cargando…</p>

  if (summary) {
    return (
      <div className="done-screen">
        <div className="big-check">✓</div>
        <h1>¡Entreno guardado!</h1>
        <p className="muted">
          {routine.name} · {summary.sets} series · {fmt(summary.volume)} kg de volumen
        </p>
        {summary.records.length > 0 && (
          <div className="card">
            <strong>Superaste tu marca anterior en:</strong>
            <ul className="plan">
              {summary.records.map((e) => <li key={e.id}><span>{e.name}</span></li>)}
            </ul>
          </div>
        )}
        <div className="actions">
          <Link className="btn primary" to="/log">Ver historial</Link>
          <Link className="btn" to="/routines">Volver a rutinas</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="head">
        <h1 className="trunc">{routine.name}</h1>
        <input className="input date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </header>

      <ul className="ex-compact">
        {routine.exercises.map((e, n) => {
          const prev = last[e.id]
          const list = sets[e.id]
          const done = list.filter((x) => x.done).length
          const complete = list.length > 0 && done === list.length
          const isOpen = open === e.id
          return (
            <li key={e.id} className={`ex-row ${isOpen ? 'open' : ''} ${complete ? 'complete' : ''}`}>
              <button type="button" className="ex-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)}>
                <span className="ex-num">{complete ? '✓' : n + 1}</span>
                <Thumb src={e.image_url} name={e.name} size={40} />
                <span className="ex-main">
                  <strong className="trunc">{e.name}</strong>
                  <span className="muted small">
                    {done}/{list.length} series
                    {e.target_weight > 0 ? ` · ${fmt(e.target_weight)} kg` : ''}
                  </span>
                </span>
                <span className="chev"><Icon name="chevron" size={18} /></span>
              </button>

              {isOpen && (
                <div className="ex-edit">
                  {prev ? (
                    <p className="beat">
                      Última vez ({formatDate(prev.date)}):{' '}
                      {prev.sets.map((s) => `${fmt(s.weight)}×${s.reps}`).join(' · ')}
                    </p>
                  ) : (
                    <p className="beat muted">Primera vez, marca tu punto de partida.</p>
                  )}

                  <div className="sets">
                    <span className="muted small">#</span>
                    <span className="muted small">kg</span>
                    <span className="muted small">reps</span>
                    <span />
                    <span />
                    {list.map((s, i) => (
                      <SetRow key={i} n={i + 1} s={s} ref0={prev?.sets[i]}
                        onChange={(f, v) => patch(e.id, i, f, v)} onRemove={() => removeSet(e.id, i)} />
                    ))}
                  </div>
                  <div className="ex-actions">
                    <button type="button" className="btn ghost" onClick={() => addSet(e.id)}>+ Serie</button>
                    <Link className="btn ghost" to={`/exercises/${e.id}`}>Ver historial</Link>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {error && <p className="error">{error}</p>}
      <div className="bar">
        <Link className="btn" to="/routines">Cancelar</Link>
        <button className="btn primary grow" disabled={saving || doneCount === 0} onClick={finish}>
          {doneCount === 0 ? 'Marca tus series con ✓' : `Terminar entreno · ${doneCount}/${totalCount}`}
        </button>
      </div>
    </>
  )
}

function SetRow({ n, s, ref0, onChange, onRemove }) {
  const diff = ref0 ? s.weight !== '' && Number(s.weight) - ref0.weight : 0
  return (
    <>
      <span className="muted">{n}</span>
      <input className="input" type="number" inputMode="decimal" step="0.5" min="0"
        value={s.weight} onChange={(e) => onChange('weight', e.target.value)} />
      <input className="input" type="number" inputMode="numeric" min="0"
        value={s.reps} onChange={(e) => onChange('reps', e.target.value)} />
      <button type="button" className={`check ${s.done ? 'on' : ''}`} aria-label="Serie hecha"
        aria-pressed={s.done} onClick={() => onChange('done', !s.done)}>✓</button>
      <button type="button" className="icon" aria-label={`Quitar serie ${n}`} onClick={onRemove}>
        <Icon name="x" size={18} />
      </button>
      {s.done && diff > 0 && <span className="up small">+{fmt(diff)} kg vs última vez</span>}
    </>
  )
}
