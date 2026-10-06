import { useState } from 'react'
import { authMessage, useAuth } from '../auth.jsx'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(ev) {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      await (mode === 'login' ? login : register)(email, password)
    } catch (e) {
      setError(authMessage(e))
      setBusy(false)
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <div className="brand big">mygym</div>
      <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      <input className="input" type="email" placeholder="Email" autoComplete="email" required
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Contraseña"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6}
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy}>
        {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
      </button>
      <button type="button" className="btn ghost"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
        {mode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
      </button>
    </form>
  )
}
