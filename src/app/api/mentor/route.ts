import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  buildOnboardingSystemPrompt,
  buildMentorSystemPrompt,
  ExtractedProfileData,
  Message,
  StewardProfile,
} from '@/lib/onboarding-schema'
import { retrieveRelevantChunks } from '@/lib/rag'

const anthropic = new Anthropic()

const EXTRACTION_USER_PROMPT_PREFIX =
  'Extract structured data from this conversation transcript and return ONLY a JSON object with these fields: name, archetype, land_name, land_size_acres, climate_zone, province_state, soil_types (array), current_practices (array), main_enterprises (array), primary_goals (array), biggest_challenge, experience_level, mentor_tone, onboarding_complete (boolean — only true when you have name, location, archetype, and at least one goal). Use null for unknown fields. Return raw JSON only, no markdown, no explanation. Transcript:\n'

function roleLabel(role: Message['role']): string {
  return role === 'user' ? 'User' : 'Assistant'
}

function formatTranscriptLines(msgs: Message[]): string {
  return msgs.map((m) => `${roleLabel(m.role)}: ${m.content}`).join('\n')
}

function stripProfileDataBlock(content: string): string {
  return content.replace(/\[PROFILE_DATA:[\s\S]*?\]/g, '').trim()
}

function parseExtractedJson(text: string): ExtractedProfileData | null {
  let t = text.trim()
  const fenceMatch = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  if (fenceMatch) {
    t = fenceMatch[1].trim()
  }
  try {
    const parsed = JSON.parse(t) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as ExtractedProfileData
  } catch (e) {
    console.error('Fallback profile JSON parse failed:', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages }: { messages: Message[] } = await request.json()
    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Load steward profile
    const { data: profile } = await supabase
      .from('steward_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const onboardingComplete = profile?.onboarding_complete ?? false

    // RAG retrieval
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop()
    let ragContext = ''
    if (lastUserMessage?.content && onboardingComplete) {
      const chunks = await retrieveRelevantChunks(lastUserMessage.content, { matchCount: 5 })
      if (chunks.length > 0) {
        ragContext = '\n\n---\nRELEVANT KNOWLEDGE FROM YOUR LIBRARY:\n' +
          chunks.map(c => `[${c.source_document} — ${c.topic}]\n${c.content}`).join('\n\n---\n')
        console.log(`RAG: retrieved ${chunks.length} chunks`)
      }
    }

    // Build system prompt based on onboarding state
    const systemPrompt = onboardingComplete
      ? buildMentorSystemPrompt((profile ?? {}) as Partial<StewardProfile>)
      : buildOnboardingSystemPrompt()

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt + ragContext,
      messages: messages.map(({ role, content }) => ({ role, content })),
    })

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')
    const cleanedText = stripProfileDataBlock(rawText)

    let extracted: ExtractedProfileData | null = null
    if (!onboardingComplete) {
      const tail = messages.slice(-8)
      const transcriptLines = [
        ...tail,
        { role: 'assistant', content: rawText } as Message,
      ]
      const extractionUserContent =
        EXTRACTION_USER_PROMPT_PREFIX + formatTranscriptLines(transcriptLines)
      const extractResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: extractionUserContent }],
      })
      const extractRaw = extractResponse.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('')
      extracted = parseExtractedJson(extractRaw)
    }

    const extractedOnboardingComplete = Boolean(
      extracted?.name && extracted?.province_state && extracted?.archetype
    )
    if (extracted) {
      extracted.onboarding_complete = extractedOnboardingComplete
    }

    // Persist to Supabase if extraction returned data
    if (extracted) {
      const transcript: Message[] = [
        ...(profile?.raw_onboarding_transcript ?? []),
        ...messages.map((m) =>
          m.role === 'assistant'
            ? { ...m, content: stripProfileDataBlock(m.content) }
            : m
        ),
        { role: 'assistant', content: cleanedText, timestamp: new Date().toISOString() },
      ]

      await supabase
        .from('steward_profiles')
        .upsert(
          {
            user_id: user.id,
            ...extracted,
            raw_onboarding_transcript: transcript,
            ...(extractedOnboardingComplete
              ? { onboarding_completed_at: new Date().toISOString() }
              : {}),
          },
          { onConflict: 'user_id' }
        )
    }

    return NextResponse.json({
      message: cleanedText,
      onboardingComplete: extractedOnboardingComplete || onboardingComplete,
      profileUpdated: extracted !== null,
    })

  } catch (error) {
    console.error('Mentor API error:', error)
    return NextResponse.json(
      { error: 'The Mentor is unavailable right now. Please try again.' },
      { status: 500 }
    )
  }
}
