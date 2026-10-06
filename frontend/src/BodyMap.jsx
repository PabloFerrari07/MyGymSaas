import { useState } from 'react'

// [catalog key, Spanish label]. The labels are the same ones the catalog shows for each exercise.
export const MUSCLES = [
  ['chest', 'pecho'],
  ['shoulders', 'hombros'],
  ['biceps', 'bíceps'],
  ['triceps', 'tríceps'],
  ['forearms', 'antebrazos'],
  ['abdominals', 'abdominales'],
  ['lats', 'dorsales'],
  ['middle back', 'espalda media'],
  ['lower back', 'espalda baja'],
  ['traps', 'trapecios'],
  ['neck', 'cuello'],
  ['quadriceps', 'cuádriceps'],
  ['hamstrings', 'isquiotibiales'],
  ['glutes', 'glúteos'],
  ['adductors', 'aductores'],
  ['abductors', 'abductores'],
  ['calves', 'gemelos'],
]
export const MUSCLE_LABEL = Object.fromEntries(MUSCLES)
export const keyFromLabel = (label) => MUSCLES.find(([, l]) => l === label)?.[0]

// Muscles a routine works: the ones chosen on the drawing, or those of its exercises.
export const routineMuscles = (r) =>
  r.muscles?.length ? r.muscles : [...new Set(r.exercises.map((e) => keyFromLabel(e.muscle_group)).filter(Boolean))]

const e = (cx, cy, rx, ry) => ({ t: 'ellipse', cx, cy, rx, ry })
const r = (x, y, w, h, rx) => ({ t: 'rect', x, y, width: w, height: h, rx })
const NECK = [r(54, 33, 12, 9, 3)]
const SHOULDERS = [e(34, 52, 9, 9), e(86, 52, 9, 9)]
const FOREARMS = [e(28, 103, 5.5, 13), e(92, 103, 5.5, 13)]
const CALVES = [e(49, 202, 7, 17), e(71, 202, 7, 17)]

// Drawings: simple silhouettes with the muscles as tappable shapes (viewBox 120 x 232).
const VIEWS = {
  front: {
    chest: [e(51, 64, 10, 8), e(69, 64, 10, 8)],
    abdominals: [r(54, 76, 12, 38, 5)],
    biceps: [e(28, 70, 6, 12), e(92, 70, 6, 12)],
    quadriceps: [e(50, 152, 8.5, 24), e(70, 152, 8.5, 24)],
    adductors: [e(57, 140, 3, 12), e(63, 140, 3, 12)],
    neck: NECK,
    shoulders: SHOULDERS,
    forearms: FOREARMS,
    calves: CALVES,
  },
  back: {
    traps: [{ t: 'path', d: 'M60 40 L47 45 L41 56 L52 68 L60 64 L68 68 L79 56 L73 45 Z' }],
    lats: [e(46, 88, 6.5, 15), e(74, 88, 6.5, 15)],
    'middle back': [r(54, 72, 12, 14, 4)],
    'lower back': [r(54, 90, 12, 16, 4)],
    triceps: [e(28, 70, 6, 12), e(92, 70, 6, 12)],
    glutes: [e(51, 127, 9.5, 9), e(69, 127, 9.5, 9)],
    abductors: [e(41, 137, 3, 8), e(79, 137, 3, 8)],
    hamstrings: [e(50, 160, 8.5, 20), e(70, 160, 8.5, 20)],
    neck: NECK,
    shoulders: SHOULDERS,
    forearms: FOREARMS,
    calves: CALVES,
  },
}

function Shape({ s }) {
  const { t, ...p } = s
  if (t === 'ellipse') return <ellipse {...p} />
  if (t === 'rect') return <rect {...p} />
  return <path {...p} />
}

function Silhouette() {
  return (
    <g className="sil">
      <circle cx="60" cy="20" r="13" />
      <rect x="40" y="40" width="40" height="80" rx="14" />
      <rect x="22" y="44" width="13" height="78" rx="6.5" />
      <rect x="85" y="44" width="13" height="78" rx="6.5" />
      <rect x="41" y="118" width="18" height="110" rx="9" />
      <rect x="61" y="118" width="18" height="110" rx="9" />
    </g>
  )
}

function Figure({ view, selected, onToggle }) {
  return (
    <>
      <Silhouette />
      {Object.entries(VIEWS[view]).map(([key, shapes]) => {
        const on = selected.includes(key)
        const props = onToggle
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': MUSCLE_LABEL[key],
              'aria-pressed': on,
              onClick: () => onToggle(key),
              onKeyDown: (ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), onToggle(key)),
            }
          : {}
        return (
          <g key={key} className={`muscle ${on ? 'on' : ''} ${onToggle ? 'tap' : ''}`} {...props}>
            {shapes.map((s, i) => <Shape key={i} s={s} />)}
          </g>
        )
      })}
    </>
  )
}

// Interactive drawing: tap muscles to select them. Front / back switch above.
export function BodyPicker({ selected, onToggle }) {
  const [view, setView] = useState('front')
  return (
    <div className="body-picker">
      <div className="seg" role="group" aria-label="Vista">
        <button type="button" className={view === 'front' ? 'on' : ''} onClick={() => setView('front')}>Frente</button>
        <button type="button" className={view === 'back' ? 'on' : ''} onClick={() => setView('back')}>Espalda</button>
      </div>
      <svg className="body-svg" viewBox="0 0 120 232" role="group" aria-label="Dibujo del cuerpo">
        <Figure view={view} selected={selected} onToggle={onToggle} />
      </svg>
      <div className="chips">
        {selected.length === 0 && <span className="muted small">Toca los músculos que vas a trabajar.</span>}
        {selected.map((k) => (
          <button type="button" key={k} className="chip on" onClick={() => onToggle(k)}>
            {MUSCLE_LABEL[k]} ×
          </button>
        ))}
      </div>
    </div>
  )
}

// Small read-only drawing (front and back) with the worked muscles highlighted.
export function BodyMini({ muscles, height = 72 }) {
  return (
    <svg className="body-mini" viewBox="0 0 250 232" height={height} role="img" aria-label="Músculos trabajados">
      <Figure view="front" selected={muscles} />
      <g transform="translate(130 0)">
        <Figure view="back" selected={muscles} />
      </g>
    </svg>
  )
}
