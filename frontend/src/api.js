async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

export const api = {
  catalog: (q, place = '') => request(`/catalog?q=${encodeURIComponent(q)}&place=${place}`),
  exercises: () => request('/exercises'),
  createExercise: (body) => request('/exercises', { method: 'POST', body }),
  updateExercise: (id, body) => request(`/exercises/${id}`, { method: 'PUT', body }),
  deleteExercise: (id) => request(`/exercises/${id}`, { method: 'DELETE' }),
  history: (id) => request(`/exercises/${id}/history`),
  routines: () => request('/routines'),
  routine: (id) => request(`/routines/${id}`),
  createRoutine: (body) => request('/routines', { method: 'POST', body }),
  updateRoutine: (id, body) => request(`/routines/${id}`, { method: 'PUT', body }),
  deleteRoutine: (id) => request(`/routines/${id}`, { method: 'DELETE' }),
  saveWorkout: (body) => request('/workouts', { method: 'POST', body }),
  recentWorkouts: () => request('/workouts/recent'),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
}
