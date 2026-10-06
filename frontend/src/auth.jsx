import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase.js'

const AuthCtx = createContext(null)

const MESSAGES = {
  'auth/invalid-email': 'El email no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con ese email.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
  'auth/network-request-failed': 'Error de conexión. Revisá tu internet.',
  'auth/operation-not-allowed': 'El acceso con email no está habilitado en Firebase.',
}
export const authMessage = (err) => MESSAGES[err?.code] || err?.message || 'Ocurrió un error. Probá de nuevo.'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }),
    [],
  )

  const value = {
    user,
    loading,
    login: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
    register: (email, password) => createUserWithEmailAndPassword(auth, email.trim(), password),
    logout: () => signOut(auth),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
