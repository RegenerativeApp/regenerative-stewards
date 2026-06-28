import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(name: string, email: string) {
  const displayName = name.trim() || 'friend'

  return resend.emails.send({
    from: 'Regenerative Stewards <mentor@regenerativestewards.com>',
    to: email,
    subject: 'Welcome to Regenerative Stewards',
    html: `
      <p>Hi ${displayName},</p>
      <p>You're in. Your Ecological Mentor is ready whenever you are — someone who remembers your land and meets you where you are in the season.</p>
      <p>When you're ready, head to <a href="https://app.regenerativestewards.com">app.regenerativestewards.com</a> and say hello. Tell us what's happening on your land, or just look around first.</p>
      <p>We're glad you're here.</p>
    `,
  })
}
