// src/lib/briefing/synthesize.ts
// Orchestrator: load steward data, call Claude, return the briefing.
// Used by the preview route (now) and the Vercel cron (Session 3).

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { StewardProfile } from '@/lib/onboarding-schema'
import {
  buildBriefingSystemPrompt,
  buildBriefingUserPrompt,
  type CommunicationPreferences,
} from './prompt'

// Service-role client — bypasses RLS. Only instantiate server-side.
// The preview page gates access; this function trusts its callers.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface SynthesizedBriefing {
  subject: string
  body: string
}

export interface SynthesizeOptions {
  userId: string
  currentDate?: Date // optional; defaults to now. Useful for previewing future sends.
}

export async function synthesizeBriefing(
  options: SynthesizeOptions
): Promise<SynthesizedBriefing> {
  const { userId, currentDate = new Date() } = options
  const supabase = getServiceRoleClient()

  // Load steward profile
  const { data: profile, error: profileError } = await supabase
    .from('steward_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error(
      `Could not load steward profile for user ${userId}: ${
        profileError?.message ?? 'profile not found'
      }`
    )
  }

  // Load communication preferences
  const { data: preferences, error: prefError } = await supabase
    .from('communication_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (prefError || !preferences) {
    throw new Error(
      `Could not load communication preferences for user ${userId}: ${
        prefError?.message ?? 'preferences not found'
      }`
    )
  }

  // Build the two halves of the prompt
  const systemPrompt = buildBriefingSystemPrompt()
  const userPrompt = buildBriefingUserPrompt({
    profile: profile as StewardProfile,
    preferences: preferences as CommunicationPreferences,
    currentDate,
  })

  // Call Claude. Sonnet is the right balance for production-scale sends.
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Pull the first text block out of Claude's response
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content in briefing response.')
  }
  const raw = textBlock.text.trim()

  // Defensive: strip markdown code fences if Claude wrapped the JSON
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Parse JSON
  let parsed: { subject?: string; body?: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      `Claude returned invalid JSON. Raw output was:\n\n${raw}`
    )
  }

  if (!parsed.subject || !parsed.body) {
    throw new Error(
      `Claude response missing subject or body. Got: ${JSON.stringify(parsed)}`
    )
  }

  return {
    subject: parsed.subject,
    body: parsed.body,
  }
}