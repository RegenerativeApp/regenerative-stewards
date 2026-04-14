import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: observations } = await supabase
    .from("observations")
    .select("*")
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false });

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <a href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">Back to dashboard</a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-800">Field Journal</h1>
            <p className="mt-1 text-sm text-stone-500 italic">What the land has shown you.</p>
          </div>
          <a href="/journal/new" className="mt-8 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">+ New observation</a>
        </div>

        {(!observations || observations.length === 0) && (
          <div className="rounded-2xl border border-stone-200 bg-amber-50 p-10 text-center shadow-sm">
            <p className="text-2xl mb-3">🌱</p>
            <p className="text-stone-700 font-medium">No observations yet.</p>
            <p className="mt-1 text-sm text-stone-500 italic">Every journey starts with a first look at the land.</p>
            <a href="/journal/new" className="mt-6 inline-block rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">Record your first observation</a>
          </div>
        )}

        <div className="space-y-4">
          {observations?.map((obs) => {
            const photoUrls = Array.isArray(obs.photo_urls)
              ? (obs.photo_urls as string[]).filter(
                  (u): u is string => typeof u === "string" && u.length > 0,
                )
              : [];
            return (
            <div key={obs.id} className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 capitalize mb-2">{obs.type}</span>
                  <h2 className="text-lg font-semibold text-stone-800 leading-snug">{obs.title || "Untitled observation"}</h2>
                </div>
                <p className="text-xs text-stone-400 whitespace-nowrap mt-1">{new Date(obs.observed_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</p>
              </div>
              {obs.body && (
                <p className="text-sm text-stone-600 italic leading-relaxed line-clamp-3">{obs.body}</p>
              )}
              {photoUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {photoUrls.map((url, i) => (
                    <a
                      key={`${obs.id}-${i}-${url.slice(-24)}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 ring-stone-300 transition hover:ring-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Photo ${i + 1} for ${obs.title || "observation"}`}
                        className="h-14 w-14 object-cover sm:h-16 sm:w-16"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
