"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import PhotoUpload from "@/components/photo-upload";

export default function NewObservationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const now = new Date().toISOString().slice(0, 16);

  const observationTypes = [
    "plant", "soil", "water", "wildlife", "insect",
    "weather", "harvest", "intervention", "general",
  ];

  useEffect(() => {
    async function loadPlaces() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("places")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      setPlaces(data || []);
    }
    loadPlaces();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const place_id = form.get("place_id") as string;

    const { error } = await supabase.from("observations").insert({
      user_id: user.id,
      place_id: place_id || null,
      type: form.get("type") as string,
      title: form.get("title") as string,
      body: form.get("body") as string,
      observed_at: (form.get("observed_at") as string) || new Date().toISOString(),
      photo_urls: photoUrls,
    });

    if (error) {
      console.error("Save failed:", error.message);
      setSaving(false);
      return;
    }

    router.push("/journal");
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <a href="/journal" className="text-sm text-stone-500 hover:text-stone-700">Back to journal</a>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-800">New Observation</h1>
          <p className="mt-1 text-sm text-stone-500 italic">Record what the land is showing you.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">When</label>
            <input type="datetime-local" name="observed_at" defaultValue={now} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Place</label>
            <select name="place_id" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400">
              <option value="">No place selected</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>{place.name}</option>
              ))}
            </select>
            {places.length === 0 && (
              <p className="mt-1 text-xs text-stone-400 italic">No places yet — you can add them later.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
            <select name="type" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400">
              {observationTypes.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Headline</label>
            <input type="text" name="title" placeholder="e.g. Comfrey flowering in the south beds" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Observation</label>
            <textarea name="body" rows={6} placeholder="What are you seeing, smelling, sensing? What is the land telling you?" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 italic focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none" />
          </div>

          <PhotoUpload onPhotosChange={setPhotoUrls} />

          <div className="flex items-center justify-between pt-2">
            <a href="/journal" className="text-sm text-stone-400 hover:text-stone-600">Cancel</a>
            <button type="submit" disabled={saving} className="rounded-lg bg-stone-800 px-6 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900 disabled:opacity-50">
              {saving ? "Saving..." : "Record observation"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
