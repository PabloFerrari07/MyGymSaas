import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { fmt, useLoad } from '../components.jsx'
import { useToast } from '../toast.jsx'

const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // week runs Sunday to Saturday
const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const iso = (d) => d.toLocaleDateString('sv')
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const weekStart = (d) => addDays(d, -d.getDay())
const short = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' })

function Bars({ items, unit }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="bars">
      {items.map((it, i) => (
        <div key={i} className="bar-col">
          <span className="bar-val">{it.value ? fmt(Math.round(it.value * 10) / 10) : ''}</span>
          <div className="bar-track">
            <div
              className={`bar-fill ${i === items.length - 1 ? 'last' : ''}`}
              style={{ height: `${(it.value / max) * 100}%` }}
              title={`${it.label}: ${fmt(it.value)} ${unit}`}
            />
          </div>
          <span className="bar-label">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function WeekStrip({ workouts, restDays, onToggleRest }) {
  const [offset, setOffset] = useState(0) // weeks from the current one
  const start = weekStart(addDays(new Date(), offset * 7))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const trained = new Set(workouts.map((w) => w.date))
  const today = iso(new Date())
  const trainedCount = days.filter((d) => trained.has(iso(d))).length
  const planned = 7 - restDays.length

  return (
    <section className="card">
      <div className="row">
        <button className="icon" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior">‹</button>
        <strong>{short(days[0])} – {short(days[6])}</strong>
        <button className="icon" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Semana siguiente">›</button>
      </div>
      <div className="week">
        {days.map((d) => {
          const key = iso(d)
          const done = trained.has(key)
          const rest = restDays.includes(d.getDay())
          return (
            <button
              key={key}
              className={`wday ${done ? 'done' : ''} ${rest && !done ? 'rest' : ''} ${key === today ? 'today' : ''}`}
              onClick={() => onToggleRest(d.getDay())}
              aria-label={`${DAY_NAMES[d.getDay()]} ${d.getDate()}: ${done ? 'entrenaste' : rest ? 'descanso' : 'entreno'}`}
            >
              <span className="small">{DAYS[d.getDay()]}</span>
              <strong>{d.getDate()}</strong>
              <span className="wmark">{done ? '✓' : rest ? 'zzz' : ''}</span>
            </button>
          )
        })}
      </div>
      <p className="muted small">
        {trainedCount} de {planned} entrenos
        {restDays.length > 0 && ` · descanso: ${[...restDays].sort().map((d) => DAY_NAMES[d]).join(', ')}`}
      </p>
      <p className="muted small">Toca un día para marcarlo o quitarlo como descanso.</p>
    </section>
  )
}

function ExerciseProgress({ exercises }) {
  const withHistory = exercises
  const [id, setId] = useState('')
  const current = id || withHistory[0]?.id || ''
  const { data } = useLoad(() => (current ? api.history(current) : Promise.resolve(null)), [current])

  if (exercises.length === 0) return <p className="muted">Crea ejercicios para ver su progreso.</p>
  const sessions = data ? [...data.sessions].reverse().slice(-10) : []
  const first = sessions[0]?.top_weight
  const last = sessions[sessions.length - 1]?.top_weight
  const diff = sessions.length > 1 ? last - first : null

  return (
    <>
      <select className="input" value={current} onChange={(e) => setId(e.target.value)} aria-label="Ejercicio">
        {withHistory.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
      {data && sessions.length === 0 && <p className="muted">Todavía no registraste este ejercicio.</p>}
      {sessions.length > 0 && (
        <>
          <Bars
            unit="kg"
            items={sessions.map((s) => ({
              value: s.top_weight,
              label: new Date(s.date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'numeric' }),
            }))}
          />
          <p className="muted small">
            Peso máximo por sesión (kg)
            {diff !== null && ` · ${diff >= 0 ? '+' : ''}${fmt(diff)} kg desde la primera sesión`}
          </p>
        </>
      )}
    </>
  )
}

export default function Progress() {
  const toast = useToast()
  const { data: workouts, error } = useLoad(api.recentWorkouts)
  const { data: exercises } = useLoad(api.exercises)
  const { data: prefs } = useLoad(api.settings)
  const [restDays, setRestDays] = useState([])

  useEffect(() => {
    if (prefs) setRestDays(prefs.rest_days)
  }, [prefs])

  async function toggleRest(day) {
    const next = restDays.includes(day) ? restDays.filter((d) => d !== day) : [...restDays, day]
    setRestDays(next)
    try {
      await api.saveSettings({ rest_days: next })
    } catch (e) {
      setRestDays(restDays)
      toast(e.message, 'error')
    }
  }

  // Volume per week, last 8 weeks (Sunday to Saturday).
  const weekly = useMemo(() => {
    const thisWeek = weekStart(new Date())
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, (i - 7) * 7))
    const totals = Object.fromEntries(weeks.map((w) => [iso(w), 0]))
    workouts?.forEach((w) => {
      const key = iso(weekStart(new Date(w.date + 'T00:00:00')))
      if (key in totals) totals[key] += w.volume
    })
    return weeks.map((w) => ({ value: totals[iso(w)], label: short(w) }))
  }, [workouts])

  return (
    <>
      <header className="head"><h1>Progreso</h1></header>
      {error && <p className="error">{error}</p>}
      {workouts && <WeekStrip workouts={workouts} restDays={restDays} onToggleRest={toggleRest} />}

      <h2 className="section">Volumen por semana</h2>
      <div className="card">
        <Bars items={weekly} unit="kg" />
        <p className="muted small">Kilos totales levantados (peso × repeticiones), últimas 8 semanas.</p>
      </div>

      <h2 className="section">Por ejercicio</h2>
      <div className="card form">
        {exercises && <ExerciseProgress exercises={exercises} />}
      </div>
    </>
  )
}
