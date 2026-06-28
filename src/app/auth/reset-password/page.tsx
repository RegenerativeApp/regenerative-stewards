'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'verifying'>('verifying')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (token_hash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          setMessage('This link has expired or is invalid. Please request a new one.')
          setStatus('error')
        } else {
          setStatus('idle')
        }
      })
    } else {
      setMessage('Invalid reset link. Please request a new one.')
      setStatus('error')
    }
  }, [])

  async function handleSubmit() {
    if (!password || password !== confirm) {
      setMessage('Passwords must match and cannot be empty.')
      setStatus('error')
      return
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      setStatus('error')
      return
    }

    setStatus('loading')
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setStatus('error')
    } else {
      setStatus('success')
      setMessage('Password updated. Taking you in…')
      setTimeout(() => router.replace('/'), 2500)
    }
  }

  if (status === 'verifying') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#FAF8F0',
        fontFamily: 'Georgia, serif', color: '#6B705C'
      }}>
        Verifying your link…
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAF8F0',
      fontFamily: 'Georgia, serif',
      padding: '2rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '2.5rem',
        maxWidth: '420px',
        width: '100%',
        border: '1px solid rgba(107,112,92,0.15)',
      }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          color: '#3D2B1F',
          marginBottom: '0.5rem',
          fontSize: '1.6rem'
        }}>
          Set a new password
        </h1>
        <p style={{ color: '#6B705C', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Choose something you'll remember. At least 8 characters.
        </p>

        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: '#3D2B1F', fontWeight: 600 }}>
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          disabled={status === 'error'}
        />

        <label style={{ display: 'block', margin: '1rem 0 0.25rem', fontSize: '0.85rem', color: '#3D2B1F', fontWeight: 600 }}>
          Confirm password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={status === 'error'}
        />

        {message && (
          <p style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.88rem',
            background: status === 'error' ? '#FDECEA' : '#D8F3DC',
            color: status === 'error' ? '#C1666B' : '#2D6A4F',
          }}>
            {message}
          </p>
        )}

        {status !== 'error' && (
          <button
            onClick={handleSubmit}
            disabled={status === 'loading' || status === 'success'}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.85rem',
              background: status === 'success' ? '#40916C' : '#3D2B1F',
              color: '#FEFAE0',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: status === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'Georgia, serif',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? 'Updating…' : status === 'success' ? 'Done ✓' : 'Update password'}
          </button>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  border: '1px solid rgba(107,112,92,0.3)',
  borderRadius: '6px',
  fontSize: '1rem',
  background: '#FAF8F0',
  color: '#1D1D1D',
  outline: 'none',
}