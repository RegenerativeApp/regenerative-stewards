'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
}

const OPENING_MESSAGE: Omit<Message, 'id'> = {
  role: 'assistant',
  content: `Welcome. I'm your Ecological Mentor — a thinking partner for your land.\n\nBefore we get into the work, I'd like to know who I'm talking to. Not your login credentials — the real stuff.\n\nWhat's your name, and where in the world is your land?`,
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function MentorPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([
    { ...OPENING_MESSAGE, id: generateId() },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null)

  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = { role: 'user', content: trimmed, id: generateId() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const apiMessages = [...messages, userMessage]
        .filter((m) => !(m.role === 'assistant' && m.content === OPENING_MESSAGE.content))
        .map(({ role, content }) => ({ role, content }))

      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error, id: generateId() },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message ?? '', id: generateId() },
        ])
        if (data.onboardingComplete) setOnboardingComplete(true)
        if (data.profileUpdated) setProfileUpdatedAt(new Date().toLocaleTimeString())
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Request failed. Is the dev server running?',
          id: generateId(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100 text-stone-900">

      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-900/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 14C8 14 2 10 2 5.5C2 3.015 4.686 1 8 1C11.314 1 14 3.015 14 5.5C14 10 8 14 8 14Z" fill="#14532d" fillOpacity="0.8"/>
              <line x1="8" y1="14" x2="8" y2="7" stroke="#f5f5f4" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-medium text-stone-900 leading-tight">Ecological Mentor</h1>
            <p className="text-xs text-stone-400 font-mono tracking-wide">
              {onboardingComplete ? 'Ready to work' : 'Getting to know your land'}
            </p>
          </div>
        </div>
        {profileUpdatedAt && (
          <span className="text-xs text-green-800 font-mono opacity-60">
            ✓ profile saved {profileUpdatedAt}
          </span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-2xl mx-auto w-full">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-green-900/10 flex-shrink-0 flex items-center justify-center mt-0.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 14C8 14 2 10 2 5.5C2 3.015 4.686 1 8 1C11.314 1 14 3.015 14 5.5C14 10 8 14 8 14Z" fill="#14532d" fillOpacity="0.7"/>
              </svg>
            </div>
          <div className="flex items-center gap-1 pt-2">
              {[0, 180, 360].map((delay) => (
                <div
                  key={delay}
                  className="w-2 h-2 rounded-full bg-green-900/30"
                  style={{ animation: `pulse 1.2s ease-in-out ${delay}ms infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={scrollAnchorRef} />
      </main>

      <footer className="px-4 pb-6 pt-3 max-w-2xl mx-auto w-full">
        <div className="flex gap-3 items-end bg-white rounded-2xl border border-stone-200 px-4 py-3 focus-within:border-green-800/30 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your land…"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-stone-900 text-[15p leading-relaxed placeholder-stone-400 focus:outline-none disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-green-900 text-white flex items-center justify-center hover:bg-green-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8L3 13L5 8L3 3L13.5 8Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-2 font-mono">
          Enter to send · Shift+Enter for new line
        </p>
      </footer>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === 'assistant'

  if (isAssistant) {
    return (
     <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-green-900/10 flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 14C8 14 2 10 2 5.5C2 3.015 4.686 1 8 1C11.314 1 14 3.015 14 5.5C14 10 8 14 8 14Z" fill="#14532d" fillOpacity="0.7"/>
          </svg>
        </div>
        <p className="flex-1 text-[15px] leading-relaxed text-stone-800 whitespace-pre-line pt-0.5">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-amber-900 text-amber-50 rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-[15px] leading-relaxed whitespace-pre-line">
          {message.content}
        </p>
      </div>
    </div>
  )
}
