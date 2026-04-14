import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { TimeGreeting } from "@/components/time-greeting";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("steward_profiles")
    .select("name, land_name, archetype, climate_zone, experience_level")
    .eq("user_id", user.id)
    .maybeSingle();

  const [{ count: placeCount }, { count: observationCount }] = await Promise.all([
    supabase
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("observations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const places = placeCount ?? 0;
  const observations = observationCount ?? 0;

  const name =
    (typeof profile?.name === "string" && profile.name.trim()) ||
    user.email ||
    "friend";
  const landName =
    typeof profile?.land_name === "string" ? profile.land_name.trim() : "";

  const cards = [
    {
      href: "/mentor",
      icon: "🌿",
      title: "Ecological Mentor",
      subtitle: "Ask anything about your land",
      hover: "hover:border-green-300 hover:shadow-md",
    },
    {
      href: "/oracle",
      icon: "📸",
      title: "Plant Oracle",
      subtitle: "Identify any plant from a photo",
      hover: "hover:border-green-300 hover:shadow-md",
    },
    {
      href: "/journal",
      icon: "📓",
      title: "Field Journal",
      subtitle: "Record what the land is showing you",
      hover: "hover:border-amber-300 hover:shadow-md",
    },
    {
      href: "/places",
      icon: "🗺️",
      title: "Your Places",
      subtitle: "The named areas on your land",
      hover: "hover:border-amber-300 hover:shadow-md",
    },
  ] as const;

  return (
    <div className="min-h-full bg-stone-50 bg-gradient-to-b from-amber-50/30 to-stone-50 px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-2">
          <TimeGreeting name={name} />
          {landName ? (
            <p className="text-lg italic text-stone-600">
              Welcome back to {landName}
            </p>
          ) : null}
          <p className="text-sm text-stone-500">
            {places} {places === 1 ? "place" : "places"} · {observations}{" "}
            {observations === 1 ? "observation" : "observations"}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={[
                "group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition",
                "hover:-translate-y-0.5",
                card.hover,
              ].join(" ")}
            >
              <span className="text-3xl" aria-hidden>
                {card.icon}
              </span>
              <span className="mt-3 text-lg font-semibold text-stone-800">
                {card.title}
              </span>
              <span className="mt-1 text-sm text-stone-500">
                {card.subtitle}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
