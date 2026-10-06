import Icon from './icons.jsx'

// - [ value ] + control, easy to use with a thumb.
export default function Stepper({ label, value, onChange, min = 0, step = 1, unit = '' }) {
  const num = Number(value) || 0
  const set = (n) => onChange(String(Math.max(min, Math.round(n * 100) / 100)))
  return (
    <div className="stepper">
      <span className="muted small">{label}</span>
      <div className="stepper-row">
        <button type="button" className="step" aria-label={`Menos ${label}`} onClick={() => set(num - step)}>
          <Icon name="minus" size={16} />
        </button>
        <input
          className="step-input"
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          placeholder="0"
          aria-label={label}
          onChange={(ev) => onChange(ev.target.value)}
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.preventDefault(), ev.currentTarget.blur())}
        />
        <button type="button" className="step" aria-label={`Más ${label}`} onClick={() => set(num + step)}>
          <Icon name="plus" size={16} />
        </button>
      </div>
      {unit && <span className="muted small">{unit}</span>}
    </div>
  )
}
