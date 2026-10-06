import { useEffect, useState } from 'react'

export function Thumb({ src, name, size = 48 }) {
  const [badSrc, setBadSrc] = useState(null)
  const broken = badSrc === src
  const style = { width: size, height: size }
  if (!src || broken) {
    return (
      <div className="thumb ph" style={style}>
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    )
  }
  return <img className="thumb" style={style} src={src} alt={name} onError={() => setBadSrc(src)} />
}

export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setError('')
    fn()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { data, error, reload: () => setTick((t) => t + 1) }
}

export function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const fmt = (n) => (Number.isInteger(n) ? n : Number(n.toFixed(1)))

export const PLACES = [
  ['', 'Todo'],
  ['home', 'Casa'],
  ['gym', 'Gym'],
]

export function PlaceFilter({ value, onChange }) {
  return (
    <div className="seg" role="group" aria-label="Equipamiento">
      {PLACES.map(([k, label]) => (
        <button type="button" key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}
