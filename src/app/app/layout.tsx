"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  Kanban,
  ChartPieSlice,
  MapPin,
  Scales,
  CalendarCheck,
  CurrencyKrw,
  Camera,
  DotsThreeCircle,
  SignOut,
  User,
  Gear,
  Folder,
  CaretUpDown,
  Check,
  VideoCamera,
  Calendar,
} from "@phosphor-icons/react";
import { FloatingChatBot } from "@/components/chat-bot";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useProject, useUserProjects } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Navigation config — grouped
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    items: [{ label: "대시보드", href: "/app", icon: ChartPieSlice }],
  },
  {
    title: "프로젝트",
    items: [
      { label: "보드", href: "/app/board", icon: Kanban },
      { label: "공정", href: "/app/timeline", icon: CalendarCheck },
      { label: "캘린더", href: "/app/calendar", icon: Calendar },
      { label: "비교", href: "/app/compare", icon: Scales },
    ],
  },
  {
    title: "관리",
    items: [
      { label: "비용", href: "/app/budget", icon: CurrencyKrw },
      { label: "장소/업자", href: "/app/places", icon: MapPin },
      { label: "사진", href: "/app/photos", icon: Camera },
      { label: "회의", href: "/app/meetings", icon: VideoCamera },
    ],
  },
  {
    title: "자료",
    items: [
      { label: "자료실", href: "/app/documents", icon: Folder },
      { label: "설정", href: "/app/settings", icon: Gear },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Mobile: 대시보드, 보드, 캘린더, 비용, 더보기
const MOBILE_TABS: NavItem[] = [
  ALL_NAV_ITEMS[0], // 대시보드
  ALL_NAV_ITEMS[1], // 보드
  ALL_NAV_ITEMS[3], // 캘린더
  ALL_NAV_ITEMS[5], // 비용
];
const MORE_ITEMS = ALL_NAV_ITEMS.filter(
  (item) => !MOBILE_TABS.some((t) => t.href === item.href)
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}

// ---------------------------------------------------------------------------
// Project Switcher (sidebar)
// ---------------------------------------------------------------------------

function ProjectSwitcher({ currentName }: { currentName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: projects } = useUserProjects();
  const currentProjectId = useAppStore((s) => s.projectId);

  return (
    <div className="relative px-3 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent"
      >
        <House size={14} weight="duotone" className="shrink-0 text-primary" />
        <span className="flex-1 truncate font-semibold text-[13px]">
          {currentName || "프로젝트 선택"}
        </span>
        <CaretUpDown size={12} className="shrink-0 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover py-1 shadow-lg"
          >
            {(projects ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  useAppStore.getState().setProjectId(p.id);
                  setOpen(false);
                  router.refresh();
                }}
                className="flex w-full items-center px-3 py-1.5 text-xs text-left transition-colors hover:bg-accent"
              >
                <span className="flex-1 truncate">{p.name}</span>
                {currentProjectId === p.id && (
                  <Check size={12} weight="bold" className="text-primary" />
                )}
              </button>
            ))}
            <Separator className="my-1" />
            <button
              onClick={() => {
                setOpen(false);
                router.push("/home");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <House size={12} weight="duotone" className="shrink-0" />
              홈으로
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  pathname,
  user,
  onLogout,
  projectName,
}: {
  pathname: string;
  user: SupabaseUser | null;
  onLogout: () => void;
  projectName?: string;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r bg-background md:flex">
      {/* Header — click to go home */}
      <Link href="/home" className="flex h-14 items-center gap-2.5 border-b px-4 transition-colors hover:bg-muted/50">
        <img src="/logo.webp" alt="HOMI" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-sm font-bold tracking-tight">HOMI</span>
      </Link>

      {/* Project switcher */}
      <div className="pt-2">
        <ProjectSwitcher currentName={projectName} />
      </div>

      {/* Nav groups */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                      />
                    )}
                    <Icon
                      size={18}
                      weight="duotone"
                      className={`relative z-10 shrink-0 ${
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-3 py-3 space-y-2">
        {user && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User size={14} weight="duotone" className="text-primary" />
            </div>
            <span className="flex-1 truncate text-xs font-medium text-foreground">
              {user.user_metadata?.name || user.email?.split("@")[0] || "사용자"}
            </span>
            <button
              onClick={onLogout}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="로그아웃"
            >
              <SignOut size={16} weight="duotone" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom tabs
// ---------------------------------------------------------------------------

function MobileTabBar({
  pathname,
  onMoreOpen,
}: {
  pathname: string;
  onMoreOpen: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden">
      <div className="flex items-stretch">
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pb-[env(safe-area-inset-bottom,0px)] pt-2 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
                />
              )}
              <Icon size={22} weight="duotone" />
              <span
                className={`text-[10px] leading-tight ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={onMoreOpen}
          className="relative flex flex-1 flex-col items-center gap-0.5 pb-[env(safe-area-inset-bottom,0px)] pt-2 text-muted-foreground"
        >
          <DotsThreeCircle size={22} weight="duotone" />
          <span className="text-[10px] font-medium leading-tight">더보기</span>
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// More sheet (mobile)
// ---------------------------------------------------------------------------

function MoreSheet({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-bold">메뉴</SheetTitle>
        </SheetHeader>
        <Separator />
        <nav className="grid grid-cols-4 gap-2 pt-4">
          {MORE_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <SheetClose key={item.href} render={<span />}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon size={24} weight="duotone" />
                  <span
                    className={`text-[11px] leading-tight ${
                      active ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { data: project } = useProject();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar pathname={pathname} user={user} onLogout={handleLogout} projectName={project?.name} />

      <main className="min-h-screen pb-16 md:pb-0 md:pl-56">
        {children}
      </main>

      <MobileTabBar pathname={pathname} onMoreOpen={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} pathname={pathname} />
      <FloatingChatBot />
    </div>
  );
}
