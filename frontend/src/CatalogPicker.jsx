import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { PlaceFilter, Thumb } from './components.jsx'

function Tiles({ items, picked, onPick }) {
  return (
    <div className="grid">
      {items.map((r) => {
        const added = picked.includes(r.image_url)
        return (
          <button
            type="button"
            key={r.image_url || r.name}
            className={`tile ${added ? 'on' : ''}`}
            onClick={() => onPick(r)}
          >
            <Thumb src={r.image_url} name={r.name} size={96} />
            <span className="tile-name">{r.name}</span>
            <span className={added ? 'ok small' : 'muted small'}>{added ? '✓ Añadido' : r.muscle_group}</span>
          </button>
        )
      })}
    </div>
  )
}

function Results({ q, place, picked, onPick }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    const t = setTimeout(() => {
      api
        .catalog(q, place)
        .then((r) => live && setResults(r))
        .finally(() => live && setLoading(false))
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q, place])

  return (
    <>
      {loading && results.length === 0 && <p className="muted small">Buscando…</p>}
      {!loading && results.length === 0 && <p className="muted small">Sin resultados.</p>}
      <Tiles items={results} picked={picked} onPick={onPick} />
    </>
  )
}

// Full-screen sheet to pick exercises. Stays open so several can be added in a row.
// Controls (tabs, filter, search) are pinned on top; only the results scroll.
export default function ExerciseSheet({ title, library, picked, onPick, onClose }) {
  const [tab, setTab] = useState('search')
  const [place, setPlace] = useState('')
  const [q, setQ] = useState('')
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const bodyRef = useRef(null)

  // The sheet gets its own history entry: the phone's Back button closes the sheet, not the page.
  useEffect(() => {
    if (!window.history.state?.sheet) window.history.pushState({ ...window.history.state, sheet: true }, '')
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Changing tab or filter always shows the results from the top.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [tab, place])

  const close = () => (window.history.state?.sheet ? window.history.back() : onClose())
  const searching = tab === 'search' || !library
  const mine = library?.filter((e) => !place || e.place === place) || []

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-head">
        <strong>{title}</strong>
        <button type="button" className="btn primary" onClick={close}>
          Listo{picked.length ? ` (${picked.length})` : ''}
        </button>
      </div>

      <div className="sheet-controls">
        {library && (
          <div className="seg">
            <button type="button" className={tab === 'search' ? 'on' : ''} onClick={() => setTab('search')}>Buscar</button>
            <button type="button" className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
              Mis ejercicios ({library.length})
            </button>
          </div>
        )}
        <PlaceFilter value={place} onChange={setPlace} />
        {searching && (
          <input
            className="input"
            type="search"
            placeholder="Buscar: press banca, sentadilla, remo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        )}
      </div>

      <div className="sheet-body" ref={bodyRef}>
        {searching ? (
          <Results q={q} place={place} picked={picked} onPick={onPick} />
        ) : mine.length === 0 ? (
          <p className="muted">No tienes ejercicios guardados con este filtro.</p>
        ) : (
          <Tiles items={mine} picked={picked} onPick={onPick} />
        )}
      </div>
    </div>
  )
}
