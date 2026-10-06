import { useState } from 'react'
import { api } from '../api.js'
import { Thumb, fmt, formatDate, useLoad } from '../components.jsx'

const iso = (d) => d.toLocaleDateString('sv')

function Calendar({ month, setMonth, byDay, selected, onSelect }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7 // week starts Monday
  const today = iso(new Date())
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div className="card cal">
      <div className="row">
        <button className="icon" onClick={() => shift(-1)} aria-label="Mes anterior">‹</button>
        <strong>{month.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</strong>
        <button className="icon" onClick={() => shift(1)} aria-label="Mes siguiente">›</button>
      </div>
      <div className="cal-grid">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <span key={d} className="muted small">{d}</span>
        ))}
        {cells.map((n, i) => {
          if (!n) return <span key={i} />
          const key = iso(new Date(month.getFullYear(), month.getMonth(), n))
          const done = byDay[key]
          return (
            <button
              key={i}
              className={`day ${done ? 'done' : ''} ${key === today ? 'today' : ''} ${selected === key ? 'sel' : ''}`}
              onClick={() => onSelect(selected === key ? null : key)}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Entry({ w, onDelete }) {
  return (
    <li className="card">
      <div className="row">
        <div>
          <strong>{w.routine || 'Entreno libre'}</strong>
          <div className="muted small">
            {formatDate(w.date)} · {w.sets} series · {fmt(w.volume)} kg
          </div>
        </div>
        <button className="icon" onClick={() => onDelete(w)} aria-label="Borrar">×</button>
      </div>
      <ul className="ex-list">
        {w.exercises.map((e) => {
          const complete = e.target_sets && e.sets.length >= e.target_sets
          return (
            <li key={e.id} className="item">
              <Thumb src={e.image_url} name={e.name} size={36} />
              <div className="grow">
                <div className="row">
                  <span>{e.name}</span>
                  <span className={complete ? 'ok' : 'muted small'}>
                    {e.target_sets ? `${e.sets.length}/${e.target_sets}${complete ? ' ✓' : ''}` : `${e.sets.length}`}
                  </span>
                </div>
                <div className="sets-line">
                  {e.sets.map((s, i) => (
                    <span key={i} className="pill">{fmt(s.weight)} kg × {s.reps}</span>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

export default function Log() {
  const { data, error, reload } = useLoad(api.recentWorkouts)
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(null)

  async function remove(w) {
    if (!confirm('¿Borrar este entrenamiento?')) return
    await api.deleteWorkout(w.id)
    reload()
  }

  const byDay = {}
  data?.forEach((w) => (byDay[w.date] = true))
  const shown = data?.filter((w) => !selected || w.date === selected)

  return (
    <>
      <header className="head"><h1>Historial</h1></header>
      {error && <p className="error">{error}</p>}
      <Calendar month={month} setMonth={setMonth} byDay={byDay} selected={selected} onSelect={setSelected} />
      {data && shown.length === 0 && (
        <p className="muted">{selected ? 'Ese día no entrenaste.' : 'Todavía no has registrado entrenos.'}</p>
      )}
      <ul className="list">
        {shown?.map((w) => <Entry key={w.id} w={w} onDelete={remove} />)}
      </ul>
    </>
  )
}
