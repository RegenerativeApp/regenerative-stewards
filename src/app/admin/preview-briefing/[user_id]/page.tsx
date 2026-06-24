// src/app/admin/preview-briefing/[user_id]/page.tsx
// Admin-only preview of a steward's briefing. Renders in-browser.
// No sending. No DB writes. Refresh = new briefing from Claude.

import { synthesizeBriefing } from '@/lib/briefing/synthesize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PageProps {
  params: Promise<{ user_id: string }>
}

export default async function PreviewBriefingPage({ params }: PageProps) {
  // Admin gate disabled for local dev — restore before deploying to production.

  const { user_id: targetUserId } = await params

  let briefing: { subject: string; body: string } | null = null
  let error: string | null = null
  try {
    briefing = await synthesizeBriefing({ userId: targetUserId })
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-stone-200">
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-2">
          Briefing Preview · not sent
        </div>
        <div className="text-sm text-stone-600 font-mono">steward: {targetUserId}</div>
        <div className="text-sm text-stone-600">generated: {new Date().toLocaleString()}</div>
        <div className="text-sm text-stone-500 italic mt-2">
          Refresh the page to regenerate with the current prompt.
        </div>
      </header>

      {error && <ErrorPanel title="Synthesis failed" message={error} />}

      {briefing && (
        <article>
          <h1 className="text-2xl font-serif font-semibold text-stone-900 mb-8 leading-snug">
            {briefing.subject}
          </h1>
          <div className="font-serif text-stone-800 leading-relaxed text-lg">
            {briefing.body.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="mb-5">{para}</p>
            ))}
          </div>
        </article>
      )}
    </div>
  )
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-md p-5 my-6">
      <div className="font-semibold text-red-900 mb-2">{title}</div>
      <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono leading-relaxed">
        {message}
      </pre>
    </div>
  )
}