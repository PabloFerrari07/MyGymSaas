import { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((text, kind = 'ok') => {
    const id = Math.random()
    setToasts((cur) => [...cur.slice(-2), { id, text, kind }])
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 2600)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'ok' ? '✓ ' : ''}{t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
