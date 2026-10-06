import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { MUSCLES, MUSCLE_LABEL, keyFromLabel } from './BodyMap.jsx'
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

function Results({ q, place, muscles, picked, onPick }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const mkey = muscles.join('|')

  useEffect(() => {
    let live = true
    setLoading(true)
    const t = setTimeout(() => {
      api
        .catalog(q, place, mkey ? mkey.split('|') : [])
        .then((r) => live && setResults(r))
        .finally(() => live && setLoading(false))
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q, place, mkey])

  return (
    <>
      {loading && results.length === 0 && <p className="muted small">Buscando…</p>}
      {!loading && results.length === 0 && <p className="muted small">Sin resultados.</p>}
      <Tiles items={results} picked={picked} onPick={onPick} />
    </>
  )
}

// Full-screen sheet to pick exercises. Stays open so several can be added in a row.
// Controls (tabs, filters, search) are pinned on top; only the results scroll.
// `muscles`: muscles chosen for the routine; the sheet starts filtered by them.
export default function ExerciseSheet({ title, library, picked, onPick, onClose, muscles = [] }) {
  const [tab, setTab] = useState('search')
  const [place, setPlace] = useState('')
  const [q, setQ] = useState('')
  const [active, setActive] = useState(muscles) // muscle filter, empty = all
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const bodyRef = useRef(null)
  const options = muscles.length ? muscles : MUSCLES.map(([k]) => k)

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
  }, [tab, place, active])

  const toggleMuscle = (k) => setActive((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
  const close = () => (window.history.state?.sheet ? window.history.back() : onClose())
  const searching = tab === 'search' || !library
  const mine =
    library?.filter(
      (e) => (!place || e.place === place) && (!active.length || active.includes(keyFromLabel(e.muscle_group))),
    ) || []

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
        <div className="chips-scroll" role="group" aria-label="Músculo">
          <button type="button" className={`chip ${active.length === 0 ? 'on' : ''}`} onClick={() => setActive([])}>
            Todos
          </button>
          {options.map((k) => (
            <button type="button" key={k} className={`chip ${active.includes(k) ? 'on' : ''}`} onClick={() => toggleMuscle(k)}>
              {MUSCLE_LABEL[k]}
            </button>
          ))}
        </div>
        <PlaceFilter value={place} onChange={setPlace} />
        {searching && (
          <input
            className="input"
            type="search"
            placeholder="Buscar por nombre…"
            value={q}
            enterKeyHint="search"
            onChange={(ev) => setQ(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault()
                ev.currentTarget.blur() // hide the keyboard and show the results
              }
            }}
          />
        )}
      </div>

      <div className="sheet-body" ref={bodyRef}>
        {searching ? (
          <Results q={q} place={place} muscles={active} picked={picked} onPick={onPick} />
        ) : mine.length === 0 ? (
          <p className="muted">No tienes ejercicios guardados con este filtro.</p>
        ) : (
          <Tiles items={mine} picked={picked} onPick={onPick} />
        )}
      </div>
    </div>
  )
}
