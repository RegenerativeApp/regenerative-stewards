import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { retrieveRelevantChunks } from '@/lib/rag'

const anthropic = new Anthropic()

/** Vision step: strict JSON only */
const ORACLE_IDENTIFY_USER = `Look at this plant photo. Respond with ONLY valid JSON (no markdown fences, no other text). Use this exact shape:
{"common_name":"string","scientific_name":"string or null","confidence":"low"|"medium"|"high","visual_notes":"one short sentence about what you see"}`

/**
 * Synthesis step: steward-facing copy. (Original request referenced a vision system prompt;
 * identification uses the image; this prompt shapes the final library-grounded answer.)
 */
const ORACLE_SYNTHESIS_SYSTEM = `You are the Plant Oracle inside Regenerative Stewards — a calm, observant guide for land stewards in British Columbia and the Pacific Northwest.

You combine what was inferred from the steward's photo with any excerpts from the app's plant knowledge library (when provided). Prefer the library for local ecology, uses, and companions; fill gaps carefully with general botany and regional patterns. If identification confidence was low, say so gently and suggest what to photograph next.

You MUST respond with ONLY valid JSON (no markdown, no code fences) using exactly these keys:
- "plant_id": string (common name, scientific name in parentheses if known, and a brief ID note)
- "ecological_role": string (succession, guilds, wildlife, nutrient cycling — grounded and specific)
- "soil_message": string (what the plant may signal about soil, moisture, disturbance — practical, not diagnostic medical claims)
- "traditional_uses": string (food, medicine, craft — respectful; note safety/caution where relevant)
- "companion_notes": string (neighbor plants, design ideas, or cautions for planting near crops or livestock)

Keep each field 2–5 sentences, plain text, warm and precise.`

type IdentifyJson = {
  common_name: string
  scientific_name: string | null
  confidence: 'low' | 'medium' | 'high'
  visual_notes: string
}

type OracleSections = {
  plant_id: string
  ecological_role: string
  soil_message: string
  traditional_uses: string
  companion_notes: string
}

function parseDataUrl(image: string): { mediaType: string; base64: string } {
  const m = image.trim().match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!m) {
    throw new Error('Expected a data URL: data:<mime>;base64,<data>')
  }
  return { mediaType: m[1], base64: m[2].replace(/\s/g, '') }
}

function extractJsonObject(text: string): string | null {
  const t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) return t.slice(start, end + 1)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { image?: string }
    const image = body.image
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Missing image (data URL base64)' },
        { status: 400 }
      )
    }

    let mediaType: string
    let base64: string
    try {
      ;({ mediaType, base64 } = parseDataUrl(image))
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid image data' },
        { status: 400 }
      )
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    if (!allowed.has(mediaType)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${mediaType}` },
        { status: 400 }
      )
    }

    const idResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            { type: 'text', text: ORACLE_IDENTIFY_USER },
          ],
        },
      ],
    })

    const idText = idResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const idJsonRaw = extractJsonObject(idText)
    if (!idJsonRaw) {
      return NextResponse.json(
        { error: 'Could not parse identification response' },
        { status: 502 }
      )
    }

    let identified: IdentifyJson
    try {
      identified = JSON.parse(idJsonRaw) as IdentifyJson
    } catch {
      return NextResponse.json(
        { error: 'Invalid identification JSON' },
        { status: 502 }
      )
    }

    const ragQuery = [
      identified.common_name,
      identified.scientific_name,
      'plant ecology soil uses companions',
    ]
      .filter(Boolean)
      .join(' ')

    const chunks = await retrieveRelevantChunks(ragQuery, { matchCount: 5 })
    const ragBlock =
      chunks.length > 0
        ? chunks
            .map(
              (c) =>
                `### ${c.source_document} — ${c.topic}\n${c.summary}\n${c.content}`
            )
            .join('\n\n---\n\n')
        : '(No matching library entries — rely on careful general knowledge.)'

    const synthesisUser = `Identification JSON (from photo):\n${JSON.stringify(identified, null, 2)}\n\nKnowledge library excerpts:\n${ragBlock}\n\nProduce the JSON response as specified in your system instructions.`

    const synResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: ORACLE_SYNTHESIS_SYSTEM,
      messages: [{ role: 'user', content: synthesisUser }],
    })

    const synText = synResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const synJsonRaw = extractJsonObject(synText)
    if (!synJsonRaw) {
      return NextResponse.json(
        { error: 'Could not parse oracle synthesis' },
        { status: 502 }
      )
    }

    let sections: OracleSections
    try {
      sections = JSON.parse(synJsonRaw) as OracleSections
    } catch {
      return NextResponse.json(
        { error: 'Invalid synthesis JSON' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      sections,
      identification: identified,
      libraryChunksUsed: chunks.length,
    })
  } catch (error) {
    console.error('Oracle API error:', error)
    return NextResponse.json(
      { error: 'The Oracle is unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
