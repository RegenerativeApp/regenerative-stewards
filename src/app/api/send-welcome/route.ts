import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = (await request.json()) as {
      name?: string
      email?: string
    }

    await sendWelcomeEmail(name ?? '', email ?? '')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 },
    )
  }
}
