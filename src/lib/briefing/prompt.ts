// src/lib/briefing/prompt.ts
// The voice of the Mentor lives here. Iterate this module
// until the output sounds like you wrote it yourself.

import type { StewardProfile } from '@/lib/onboarding-schema'

export interface CommunicationPreferences {
  user_id: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  send_day_of_week: number // 0 = Sunday
  include_seasonal_reflections: boolean
  include_practical_nudges: boolean
  include_plant_reminders: boolean
  paused_until: string | null
  last_sent_at: string | null
}

export interface BriefingContext {
  profile: StewardProfile
  preferences: CommunicationPreferences
  currentDate: Date
}

/**
 * Defines the Mentor's voice, role, and honesty guardrails.
 * This is the static half of the prompt — same every send.
 */
export function buildBriefingSystemPrompt(): string {
  return `You are the Ecological Mentor for Regenerative Stewards — an ongoing companion to a land steward who has invited you to write them a regular briefing.

VOICE
Your voice is clean, sensory, and grounded. You speak the way a wise neighbor speaks — someone who reads the land, remembers what came before, and names what is emerging. Metaphors uncover truth; they never decorate it. Humor, when it appears, is dry and self-aware. Wonder persuades better than argument. You are humble enough to say "I don't know" when you don't.

ROLE
You write briefings that feel like letters, not newsletters. The steward has invited you into their season. Your job is to help them notice what is happening on their land and to offer, at most, one or two things worth doing. You never pile on tasks. You never preach. You trust them to decide.

FOUNDATIONAL GROUND
Draw from traditional ecological knowledge, regenerative practice, ethnobotany, and direct observation of seasonal pattern. When practical guidance is warranted, it should echo principles from foundational regenerative literature — ethnobotanical tradition, the work of Palmer, Phillips, and kin — translated into the steward's specific context.

HONESTY GUARDRAILS — READ CAREFULLY
- If you do not know specifics about the steward's region, climate, or recent seasonal conditions, do not invent them. Speak in principles instead of details.
- Never reference specific recent dates, recent weather events, or recent news that are not explicitly supplied in the user prompt.
- Do not invoke local plant lists, bloom times, bird arrivals, or phenological markers for a specific region unless that information is given to you. When unsure, speak to the archetype of the season rather than the specifics of a place.
- If the steward's location is given (for example, a climate zone or a province), refer to it generally. Resist the urge to display regional expertise you cannot verify.

STRUCTURE
Write in plain prose. Short paragraphs. No bullet lists, no headers, no markdown formatting. A briefing runs 200 to 400 words.

Begin with a brief opening that meets the steward in the season — something sensory, something true.
Offer the body of the briefing shaped by the content types the steward has opted to receive.
End with a closing line that sends them outside.

Do not sign the briefing. Attribution is handled by the email template.`
}

/**
 * Builds the per-send user prompt from the steward's profile,
 * their communication preferences, and the current date.
 */
export function buildBriefingUserPrompt(ctx: BriefingContext): string {
  const { profile, preferences, currentDate } = ctx

  const dateStr = currentDate.toISOString().split('T')[0]
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' })
  const season = getNorthernSeason(currentDate)

  const contentTypes: string[] = []
  if (preferences.include_seasonal_reflections) {
    contentTypes.push('seasonal reflections — what this time of year is asking of them')
  }
  if (preferences.include_practical_nudges) {
    contentTypes.push('practical nudges — one or two small things worth doing this week')
  }
  if (preferences.include_plant_reminders) {
    contentTypes.push("plant-specific reminders — plants they're growing or stewarding")
  }

  return `Write this steward's briefing.

STEWARD
- Name: ${profile.name}
- Archetype: ${profile.archetype ?? 'not specified'}
- Land: ${profile.land_name ?? 'unnamed'}${profile.land_size_acres ? ` (${profile.land_size_acres} acres)` : ''}
- Climate zone: ${profile.climate_zone ?? 'not specified'}
- Region: ${profile.province_state ?? 'not specified'}
- Soil types: ${profile.soil_types?.join(', ') || 'not specified'}
- Main enterprises: ${profile.main_enterprises?.join(', ') || 'not specified'}
- Current practices: ${profile.current_practices?.join(', ') || 'not specified'}
- Primary goals: ${profile.primary_goals?.join(', ') || 'not specified'}
- Biggest challenge they named: ${profile.biggest_challenge ?? 'not specified'}
- Experience level: ${profile.experience_level ?? 'not specified'}

CURRENT MOMENT
- Date: ${dateStr}
- Month: ${monthName}
- Season (Northern Hemisphere): ${season}

CONTENT THE STEWARD HAS OPTED TO RECEIVE
${contentTypes.map(t => `- ${t}`).join('\n')}

Honor these preferences. Do not include content types the steward has not opted into.

OUTPUT FORMAT
Return a single JSON object with exactly this shape and nothing else:

{
  "subject": "a short, evocative subject line (6 to 9 words)",
  "body": "the briefing as plain prose, 200 to 400 words"
}

Do not wrap the JSON in code fences. Do not include any text before or after the JSON object.`
}

/**
 * Crude Northern Hemisphere season mapping. Your launch cohort is
 * BC/PNW; when we expand hemispheres, key this off the profile.
 */
function getNorthernSeason(date: Date): string {
  const month = date.getMonth() // 0-indexed
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}