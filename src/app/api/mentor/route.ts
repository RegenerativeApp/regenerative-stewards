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
import { getRecentObservations } from '@/lib/observations'

const anthropic = new Anthropic()

const EXTRACTION_USER_PROMPT_PREFIX =
  'Extract structured data from this conversation transcript and return ONLY a JSON object with these fields: name, archetype, land_name, land_size_acres, climate_zone, province_state, soil_types (array), current_practices (array), main_enterprises (array), primary_goals (array), biggest_challenge, experience_level, mentor_tone, communication_frequency (weekly | biweekly | monthly; default weekly if unclear), communication_include_seasonal_reflections, communication_include_practical_nudges, communication_include_plant_reminders (booleans; if steward wants a mix, everything, or unclear, set all three true), onboarding_complete (boolean — only true when you have name, location, archetype, and at least one goal). Use null for unknown fields. Return raw JSON only, no markdown, no explanation. Transcript:\n'

function roleLabel(role: Message['role']): string {
  return role === 'user' ? 'User' : 'Assistant'
}

function formatTranscriptLines(msgs: Message[]): string {
  return msgs.map((m) => `${roleLabel(m.role)}: ${m.content}`).join('\n')
}

function stripProfileDataBlock(content: string): string {
  return content.replace(/\[PROFILE_DATA:[\s\S]*?\]/g, '').trim()
}

const COMMUNICATION_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const

function normalizeCommunicationFrequency(
  value: ExtractedProfileData['communication_frequency'] | string | null | undefined,
): (typeof COMMUNICATION_FREQUENCIES)[number] {
  if (
    typeof value === 'string' &&
    (COMMUNICATION_FREQUENCIES as readonly string[]).includes(value)
  ) {
    return value as (typeof COMMUNICATION_FREQUENCIES)[number]
  }
  return 'weekly'
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

    // Load recent steward context for memory spine
    const { data: recentContext } = await supabase
      .from('steward_context')
      .select('type, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15)

    let contextMemory = ''
    if (recentContext && recentContext.length > 0) {
      const lines = recentContext
        .reverse()
        .map((row) => {
          const date = new Date(row.created_at).toISOString().split('T')[0]
          const summary =
            row.type === 'plant_id'
              ? `Identified: ${row.content.plant_name ?? 'unknown'} (${row.content.confidence ?? '?'} confidence)${row.content.place_name ? ` in ${row.content.place_name}` : ''}`
              : row.type === 'observation'
              ? `Observation: ${row.content.note ?? ''}`
              : row.type === 'onboarding'
              ? `Profile: ${JSON.stringify(row.content)}`
              : row.type === 'mentor_conversation'
              ? `Conversation: ${row.content.summary ?? ''}`
              : row.type === 'place_added'
              ? `New place added: ${row.content.place_name ?? 'unknown'}${row.content.soil_type ? ` (${row.content.soil_type} soil)` : ''}${row.content.area_acres ? `, ${row.content.area_acres} acres` : ''}`
              : `${row.type}: ${JSON.stringify(row.content)}`
          return `[${date}] ${summary}`
        })
        .join('\n')
      contextMemory = `\n\n---\nSTEWARD MEMORY (chronological, most recent last):\n${lines}\n---`
    }

    const journalContext = onboardingComplete
      ? await getRecentObservations(supabase, user.id)
      : ''

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
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt + contextMemory + journalContext + ragContext,
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
        model: 'claude-sonnet-4-6',
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
      extracted?.province_state &&
      (extracted?.primary_goals?.length ?? 0) > 0
    )
    if (extracted) {
      extracted.onboarding_complete = extractedOnboardingComplete
    }

    // Persist to Supabase if extraction returned data
    if (extracted) {
      const {
        communication_frequency,
        communication_include_seasonal_reflections,
        communication_include_practical_nudges,
        communication_include_plant_reminders,
        ...stewardProfileFields
      } = extracted

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
            ...stewardProfileFields,
            raw_onboarding_transcript: transcript,
            ...(extractedOnboardingComplete
              ? { onboarding_completed_at: new Date().toISOString() }
              : {}),
          },
          { onConflict: 'user_id' }
        )

      if (extractedOnboardingComplete) {
        await supabase.from('communication_preferences').upsert(
          {
            user_id: user.id,
            frequency: normalizeCommunicationFrequency(communication_frequency),
            include_seasonal_reflections:
              communication_include_seasonal_reflections ?? true,
            include_practical_nudges: communication_include_practical_nudges ?? true,
            include_plant_reminders: communication_include_plant_reminders ?? true,
            send_day_of_week: 0,
          },
          { onConflict: 'user_id' }
        )
      }
    }

    // Write onboarding extraction to steward_context
    if (extracted) {
      await supabase.from('steward_context').insert({
        user_id: user.id,
        type: 'onboarding',
        source: 'mentor_extraction',
        content: {
          name: extracted.name ?? null,
          archetype: extracted.archetype ?? null,
          land_size_acres: extracted.land_size_acres ?? null,
          climate_zone: extracted.climate_zone ?? null,
          province_state: extracted.province_state ?? null,
          soil_types: extracted.soil_types ?? null,
          primary_goals: extracted.primary_goals ?? null,
          biggest_challenge: extracted.biggest_challenge ?? null,
          experience_level: extracted.experience_level ?? null,
        },
      })
    }

    // Write conversation turn to steward_context (always)
    const userMessage = messages[messages.length - 1]
    if (userMessage?.role === 'user' && cleanedText) {
      await supabase.from('steward_context').insert({
        user_id: user.id,
        type: 'mentor_conversation',
        source: 'mentor',
        content: {
          summary: `User: ${userMessage.content.slice(0, 200)}${userMessage.content.length > 200 ? '…' : ''} → Mentor: ${cleanedText.slice(0, 200)}${cleanedText.length > 200 ? '…' : ''}`,
          user_message: userMessage.content.slice(0, 500),
          mentor_response: cleanedText.slice(0, 500),
        },
      })
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
