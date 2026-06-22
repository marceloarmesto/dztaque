'use client'

// COMPONENTE TEMPORÁRIO — acesso de teste por email/senha.
// Remover quando o Google OAuth estiver configurado (Fase 1, Fio 3).

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmailLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }
    // navegação completa para o servidor reconhecer a sessão nos cookies
    window.location.href = '/feed'
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px', textAlign: 'left' }}>
      <p
        className="caption"
        style={{ color: 'var(--text-faint)', marginBottom: '12px', textAlign: 'center' }}
      >
        — ou acesso de teste —
      </p>

      <div className="field">
        <label className="field-label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome.sobrenome@dzestudio.com.br"
          autoComplete="email"
          required
        />
      </div>

      <div className="field">
        <label className="field-label">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'ENTRANDO…' : 'ENTRAR'}
      </button>
    </form>
  )
}
