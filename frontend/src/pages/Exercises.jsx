import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ExerciseSheet from '../CatalogPicker.jsx'
import { PlaceFilter, Thumb, useLoad } from '../components.jsx'
import Icon from '../icons.jsx'
import { useToast } from '../toast.jsx'

const EMPTY = { name: '', image_url: '', muscle_group: '' }

export default function Exercises() {
  const toast = useToast()
  const { data, reload } = useLoad(api.exercises)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [place, setPlace] = useState('')
  const visible = data?.filter((e) => !place || e.place === place)
  // Grouped by muscle so a long list stays easy to scan.
  const groups = {}
  visible?.forEach((e) => (groups[e.muscle_group || 'Otros'] ||= []).push(e))
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b))

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const mine = data?.map((e) => e.image_url) || []

  async function pick(item) {
    if (mine.includes(item.image_url)) {
      toast(`Ya tienes ${item.name}`, 'info')
      return
    }
    try {
      await api.createExercise({
        name: item.name,
        image_url: item.image_url,
        muscle_group: item.muscle_group,
        place: item.place,
      })
      toast(`Añadido: ${item.name}`)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function submit(ev) {
    ev.preventDefault()
    try {
      await api.updateExercise(editing, form)
      toast('Ejercicio actualizado')
      setForm(EMPTY)
      setEditing(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  function edit(e) {
    setEditing(e.id)
    setForm({ name: e.name, image_url: e.image_url, muscle_group: e.muscle_group })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(e) {
    if (!confirm(`¿Borrar "${e.name}"?`)) return
    try {
      await api.deleteExercise(e.id)
      toast(`Borrado: ${e.name}`, 'info')
      reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <>
      <header className="head">
        <h1>Ejercicios</h1>
        <button className="btn primary" onClick={() => setAdding(true)}>+ Añadir</button>
      </header>

      {editing && (
        <form className="card form" onSubmit={submit}>
          <input className="input" placeholder="Nombre" value={form.name} onChange={set('name')} required />
          <input className="input" placeholder="URL de la imagen" value={form.image_url} onChange={set('image_url')} />
          <input className="input" placeholder="Grupo muscular" value={form.muscle_group} onChange={set('muscle_group')} />
          <div className="actions">
            <button className="btn primary" type="submit">Guardar</button>
            <button type="button" className="btn" onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>
          </div>
        </form>
      )}

      {data && data.length > 0 && <PlaceFilter value={place} onChange={setPlace} />}
      {data && data.length === 0 && (
        <p className="muted">Aún no tienes ejercicios. Toca “Añadir” y elige con su imagen.</p>
      )}
      {data && data.length > 0 && visible.length === 0 && (
        <p className="muted">No tienes ejercicios de {place === 'home' ? 'casa' : 'gym'} todavía.</p>
      )}
      {groupNames.map((g) => (
        <section key={g}>
          <h2 className="section">{g} · {groups[g].length}</h2>
          <ul className="ex-compact">
            {groups[g].map((e) => (
              <li key={e.id} className="ex-row">
                <div className="ex-head static">
                  <Thumb src={e.image_url} name={e.name} size={40} />
                  <Link className="ex-main" to={`/exercises/${e.id}`}>
                    <strong className="trunc">{e.name}</strong>
                  </Link>
                  <button className="icon" onClick={() => edit(e)} aria-label={`Editar ${e.name}`}>
                    <Icon name="edit" size={18} />
                  </button>
                  <button className="icon" onClick={() => remove(e)} aria-label={`Borrar ${e.name}`}>
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {adding && (
        <ExerciseSheet
          title="Añadir ejercicios"
          picked={mine}
          onPick={pick}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  )
}
