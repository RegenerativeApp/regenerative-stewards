import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, archetype, usda_zone, bio")
    .eq("id", user.id)
    .single();

  async function updateProfile(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("profiles")
      .update({
        display_name: formData.get("display_name"),
        archetype: formData.get("archetype"),
        usda_zone: formData.get("usda_zone"),
        bio: formData.get("bio"),
      })
      .eq("id", user.id);

    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-800">
            Your Profile
          </h1>
          <p className="mt-1 text-sm text-stone-500 italic">
            Tell the Mentor about your land.
          </p>
        </div>

        <form action={updateProfile} className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm space-y-5">

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Your name
              </label>
              <input
                type="text"
                name="display_name"
                defaultValue={profile?.display_name ?? ""}
                placeholder="Jay"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Steward archetype
              </label>
              <select
                name="archetype"
                defaultValue={profile?.archetype ?? ""}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-800"
              >
                <option value="">Select one...</option>
                <option value="homegrower">Homegrower</option>
                <option value="market_gardener">Market Gardener</option>
                <option value="homesteader">Homesteader</option>
                <option value="transitioning_farmer">Transitioning Farmer</option>
                <option value="rancher">Rancher</option>
                <option value="land_steward">Land Steward</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                USDA hardiness zone
              </label>
              <input
                type="text"
                name="usda_zone"
                defaultValue={profile?.usda_zone ?? ""}
                placeholder="e.g. 6b"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                About your land
              </label>
              <textarea
                name="bio"
                defaultValue={profile?.bio ?? ""}
                placeholder="Describe your land — size, soil, what you're growing, what you're working toward..."
                rows={4}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-800 resize-none"
              />
            </div>

          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-stone-100 transition hover:bg-stone-900"
          >
            Save and return to dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
