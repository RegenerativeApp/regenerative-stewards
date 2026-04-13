import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AppShell } from "@/components/app-shell";

export default async function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email ??
    "friend";

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <AppShell displayName={displayName} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
