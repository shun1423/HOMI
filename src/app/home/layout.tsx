"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { House, SignOut, User } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <House size={18} weight="duotone" className="text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight">HOMI</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User size={14} weight="duotone" className="text-primary" />
              </div>
              <span className="hidden text-xs font-medium sm:inline">
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="로그아웃"
              >
                <SignOut size={16} weight="duotone" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
