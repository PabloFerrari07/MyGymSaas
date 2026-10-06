// Data layer on Firestore. Everything lives under users/{uid}/..., so each account only sees its own data.
// Method names and return shapes are the same the pages already use.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase.js'

const col = (name) => collection(db, 'users', auth.currentUser.uid, name)
const ref = (name, id) => doc(db, 'users', auth.currentUser.uid, name, id)
const list = async (name) => (await getDocs(col(name))).docs.map((d) => ({ id: d.id, ...d.data() }))

const clean = (s) => (s || '').trim()
const byDateDesc = (a, b) => (a.date === b.date ? (b.created || 0) - (a.created || 0) : a.date < b.date ? 1 : -1)
const created = (w) => w.createdAt?.toMillis?.() ?? Date.now()

// ---------- Catalog (public exercise images) ----------
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const HOME_EQUIPMENT = ['barbell', 'dumbbell', 'kettlebells', 'e-z curl bar']
const ALIASES = {
  banca: 'bench', pecho: 'chest', espalda: 'back', hombro: 'shoulder', hombros: 'shoulders',
  biceps: 'biceps', bíceps: 'biceps', triceps: 'triceps', tríceps: 'triceps', pierna: 'leg', piernas: 'legs',
  sentadilla: 'squat', remo: 'row', dominada: 'pull-up', dominadas: 'pull-up', flexion: 'push-up',
  flexiones: 'push-up', abdominales: 'abdominals', abdomen: 'abdominals', gluteo: 'glutes',
  gluteos: 'glutes', cuadriceps: 'quadriceps', isquios: 'hamstrings', gemelos: 'calves',
  pantorrilla: 'calves', mancuerna: 'dumbbell', mancuernas: 'dumbbell', barra: 'barbell',
  polea: 'cable', maquina: 'machine', zancada: 'lunge', zancadas: 'lunge', elevaciones: 'raise',
  laterales: 'lateral', jalon: 'pulldown', fondos: 'dip', trapecio: 'traps', antebrazo: 'forearms',
}
let catalogPromise
const loadCatalog = () =>
  (catalogPromise ??= fetch('/catalog.json').then((r) => {
    if (!r.ok) throw new Error('No se pudo cargar el catálogo')
    return r.json()
  }))
const isHome = (c) => HOME_EQUIPMENT.includes(c.e) || c.n.toLowerCase().includes('plate')

async function catalog(q = '', place = '') {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map((w) => ALIASES[w] || w)
  const out = []
  for (const c of await loadCatalog()) {
    const home = isHome(c)
    if ((place === 'home' && !home) || (place === 'gym' && home)) continue
    const hay = `${c.n} ${c.m} ${c.e}`.toLowerCase()
    if (!words.every((w) => hay.includes(w))) continue
    out.push({
      name: c.n,
      muscle_group: c.m,
      equipment: c.e,
      place: home ? 'home' : 'gym',
      image_url: IMG_BASE + c.i[0],
    })
    if (out.length >= 40) break
  }
  return out
}

// ---------- Exercises ----------
const exercises = async () => (await list('exercises')).sort((a, b) => a.name.localeCompare(b.name))

async function createExercise(b) {
  const name = clean(b.name)
  if (!name) throw new Error('El nombre es obligatorio')
  const data = {
    name,
    image_url: clean(b.image_url),
    muscle_group: clean(b.muscle_group),
    place: ['home', 'gym'].includes(b.place) ? b.place : '',
  }
  const r = await addDoc(col('exercises'), data)
  return { id: r.id, ...data }
}

async function updateExercise(id, b) {
  const data = {}
  if ('name' in b) {
    data.name = clean(b.name)
    if (!data.name) throw new Error('El nombre es obligatorio')
  }
  if ('image_url' in b) data.image_url = clean(b.image_url)
  if ('muscle_group' in b) data.muscle_group = clean(b.muscle_group)
  if (['home', 'gym', ''].includes(b.place)) data.place = b.place
  await updateDoc(ref('exercises', id), data)
}

async function deleteExercise(id) {
  const [routines, workouts] = await Promise.all([list('routines'), list('workouts')])
  const used =
    routines.some((r) => r.items?.some((i) => i.exercise_id === id)) ||
    workouts.some((w) => w.entries?.some((e) => e.exercise_id === id))
  if (used) throw new Error('Este ejercicio está en una rutina o en el historial')
  await deleteDoc(ref('exercises', id))
}

// ---------- Routines ----------
const exerciseMap = async () => Object.fromEntries((await exercises()).map((e) => [e.id, e]))

function resolveRoutine(r, exMap) {
  return {
    id: r.id,
    name: r.name,
    exercises: (r.items || [])
      .filter((i) => exMap[i.exercise_id])
      .map((i) => ({ ...exMap[i.exercise_id], target_sets: i.target_sets, target_reps: i.target_reps })),
  }
}

const toItems = (exs) =>
  (exs || []).map((e) => ({
    exercise_id: e.exercise_id,
    target_sets: Number(e.target_sets) || 3,
    target_reps: Number(e.target_reps) || 10,
  }))

async function routines() {
  const [rs, ws, exMap] = await Promise.all([list('routines'), list('workouts'), exerciseMap()])
  return rs
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => ({
      ...resolveRoutine(r, exMap),
      last_done: ws.filter((w) => w.routine_id === r.id).map((w) => w.date).sort().pop() || null,
    }))
}

async function routine(id) {
  const snap = await getDoc(ref('routines', id))
  if (!snap.exists()) throw new Error('Rutina no encontrada')
  return resolveRoutine({ id: snap.id, ...snap.data() }, await exerciseMap())
}

async function createRoutine(b) {
  const name = clean(b.name)
  if (!name) throw new Error('El nombre es obligatorio')
  const r = await addDoc(col('routines'), { name, items: toItems(b.exercises), createdAt: serverTimestamp() })
  return { id: r.id }
}

async function updateRoutine(id, b) {
  const data = {}
  if ('name' in b) {
    data.name = clean(b.name)
    if (!data.name) throw new Error('El nombre es obligatorio')
  }
  if ('exercises' in b) data.items = toItems(b.exercises)
  await updateDoc(ref('routines', id), data)
}

const deleteRoutine = (id) => deleteDoc(ref('routines', id))

// ---------- Workouts & history ----------
const loadWorkouts = async () =>
  (await list('workouts')).map((w) => ({ ...w, created: created(w) })).sort(byDateDesc)

async function saveWorkout(b) {
  const entries = (b.entries || [])
    .map((e) => ({
      exercise_id: e.exercise_id,
      sets: (e.sets || [])
        .map((s) => ({ weight: Number(s.weight), reps: parseInt(s.reps, 10) }))
        .filter((s) => Number.isFinite(s.weight) && s.reps > 0),
    }))
    .filter((e) => e.sets.length > 0)
  const count = entries.reduce((n, e) => n + e.sets.length, 0)
  if (count === 0) throw new Error('No hay series válidas para guardar')
  const date = b.date || new Date().toLocaleDateString('sv')
  const r = await addDoc(col('workouts'), {
    routine_id: b.routine_id || null,
    date,
    entries,
    createdAt: serverTimestamp(),
  })
  return { id: r.id, sets: count }
}

async function history(exerciseId) {
  const snap = await getDoc(ref('exercises', exerciseId))
  if (!snap.exists()) throw new Error('Ejercicio no encontrado')
  const sessions = []
  let best = null
  for (const w of await loadWorkouts()) {
    const entry = w.entries?.find((e) => e.exercise_id === exerciseId)
    if (!entry) continue
    const sets = entry.sets.map((s, i) => ({ set_number: i + 1, weight: s.weight, reps: s.reps }))
    sessions.push({
      workout_id: w.id,
      date: w.date,
      sets,
      top_weight: Math.max(...sets.map((s) => s.weight)),
      volume: sets.reduce((a, s) => a + s.weight * s.reps, 0),
    })
    for (const s of sets) {
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
        best = { ...s, date: w.date }
      }
    }
  }
  return { exercise: { id: snap.id, ...snap.data() }, sessions, best }
}

async function recentWorkouts() {
  const [ws, rs, exMap] = await Promise.all([loadWorkouts(), list('routines'), exerciseMap()])
  const rMap = Object.fromEntries(rs.map((r) => [r.id, r]))
  return ws.slice(0, 120).map((w) => {
    const r = rMap[w.routine_id]
    const targets = Object.fromEntries((r?.items || []).map((i) => [i.exercise_id, i]))
    const exercises = (w.entries || []).map((e) => ({
      id: e.exercise_id,
      name: exMap[e.exercise_id]?.name || 'Ejercicio borrado',
      image_url: exMap[e.exercise_id]?.image_url || '',
      target_sets: targets[e.exercise_id]?.target_sets ?? null,
      target_reps: targets[e.exercise_id]?.target_reps ?? null,
      sets: e.sets,
    }))
    const all = exercises.flatMap((e) => e.sets)
    return {
      id: w.id,
      date: w.date,
      routine: r?.name || null,
      sets: all.length,
      volume: all.reduce((a, s) => a + s.weight * s.reps, 0),
      exercises,
    }
  })
}

const deleteWorkout = (id) => deleteDoc(ref('workouts', id))

export const api = {
  catalog,
  exercises,
  createExercise,
  updateExercise,
  deleteExercise,
  history,
  routines,
  routine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  saveWorkout,
  recentWorkouts,
  deleteWorkout,
}
