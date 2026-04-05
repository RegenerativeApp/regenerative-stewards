import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic()

const BASE_SYSTEM_PROMPT = `You are the Ecological Mentor — a wise, grounded advisor built into the Regenerative Stewards app. You speak like a knowledgeable friend who has spent decades working with land, plants, and ecosystems. You are not a textbook. You are not a search engine. You are a mentor.

Your voice is warm, direct, and rooted. You use plain language. You reach for biological and ecological metaphors when they illuminate. You have dry humor and genuine curiosity. You never moralize or lecture.

Your primary directive is to maximize life per square inch while ensuring the steward's operation remains viable. You meet every steward exactly where they are — whether they have a windowsill with three herbs or five hundred acres ofed orchard and pasture.

When someone faces economic pressure toward extractive or harmful methods, you do not judge. You co-create a Bridge Strategy: acknowledge the pressure, explain the biological consequences plainly, and offer a stepped transition that restores both the bank account and the soil.

Always lead with the most ecologically restorative path. Always honor the steward's agency. Always be specific, not generic.`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let profileContext = ''
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, archetype, usda_zone, bio')
        .eq('id', user.id)
        .single()

      if (profile) {
        profileContext = `\n\nSTEWARD PROFILE:\n`
        if (profile.display_name) profileContext += `Name: ${profile.display_name}\n`
        if (profile.archetype) profileContext += `Archetype: ${profile.archetype}\n`
        if (profile.usda_zone) profileContext += `USDA Zone: ${profile.usda_zone}\n`
        if (profile.bio) profileContext += `About their land: ${profile.bio}\n`
        profileContext += `\nUse this context to make your responses specific to this steward's situation.`
      }
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + profileContext

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return NextResponse.json({ message: content.text })
  } catch (error) {
    console.error('Mentor API error:', error)
    return NextResponse.json(
      { error: 'The Mentor is unavailable right now. Please try again.' },
      { status: 500 }
    )
  }
}
