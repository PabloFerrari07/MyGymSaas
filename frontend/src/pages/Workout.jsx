import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { Thumb, fmt, formatDate } from '../components.jsx'
import { useToast } from '../toast.jsx'

const today = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD, local time

export default function Workout() {
  const { id } = useParams()
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [routine, setRoutine] = useState(null)
  const [last, setLast] = useState({}) // exercise_id -> most recent session
  const [sets, setSets] = useState({}) // exercise_id -> [{weight, reps}]
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
    })
    return () => {
      live = false
    }
  }, [id])

  const patch = (eid, i, field, value) =>
    setSets((cur) => ({
      ...cur,
      [eid]: cur[eid].map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    }))
  const addSet = (eid) =>
    setSets((cur) => {
      const list = cur[eid]
      const lastSet = list[list.length - 1]
      return { ...cur, [eid]: [...list, { weight: lastSet?.weight ?? '', reps: lastSet?.reps ?? '', done: false }] }
    })
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
        const top = Math.max(0, ...entries.find((x) => x.exercise_id === e.id).sets.map((x) => Number(x.weight)))
        const before = last[e.id] ? last[e.id].top_weight : null
        return before !== null && top > before
      })
      const volume = entries.flatMap((x) => x.sets).reduce((a, x) => a + Number(x.weight) * Number(x.reps), 0)
      // The routine follows your progress: next time it starts from the weight you just lifted.
      const items = routine.exercises.map((e) => {
        const top = Math.max(0, ...entries.find((x) => x.exercise_id === e.id).sets.map((x) => Number(x.weight)))
        return { exercise_id: e.id, target_sets: e.target_sets, target_reps: e.target_reps, target_weight: top || e.target_weight }
      })
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
        <h1>{routine.name}</h1>
        <input className="input date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </header>

      {routine.exercises.map((e) => {
        const prev = last[e.id]
        return (
          <section key={e.id} className={`card ${sets[e.id].every((x) => x.done) ? 'complete' : ''}`}>
            <div className="item">
              <Thumb src={e.image_url} name={e.name} size={48} />
              <div className="grow">
                <Link to={`/exercises/${e.id}`}><strong>{e.name}</strong></Link>
                <div className="muted small">
                  Objetivo {e.target_sets} × {e.target_reps}{e.target_weight > 0 ? ` @ ${fmt(e.target_weight)} kg` : ''} · hechas {sets[e.id].filter((x) => x.done).length}/{sets[e.id].length}
                </div>
              </div>
            </div>

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
              <span className="muted small"></span>
              {sets[e.id].map((s, i) => (
                <SetRow key={i} n={i + 1} s={s} ref0={prev?.sets[i]}
                  onChange={(f, v) => patch(e.id, i, f, v)} />
              ))}
            </div>
            <button className="btn ghost" onClick={() => addSet(e.id)}>+ Serie</button>
          </section>
        )
      })}

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

function SetRow({ n, s, ref0, onChange }) {
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
      {s.done && diff > 0 && <span className="up small">+{fmt(diff)} kg vs última vez</span>}
    </>
  )
}
