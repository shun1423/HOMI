"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import {
  House,
  CheckCircle,
  Question,
  ListChecks,
  CurrencyKrw,
  Receipt,
  Wallet,
  CalendarCheck,
  Clock,
  ChatCircleDots,
  ArrowRight,
  TrendUp,
  Hammer,
  PaintBrush,
  Bathtub,
  Armchair,
  Bed,
  CookingPot,
  Door,
  Warehouse,
  BookOpen,
  Plant,
  Kanban,
  Notebook,
  Lightbulb,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaces, useBoardItems, useProject, useTasks, useMeetings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { USER_MAP } from "@/lib/constants";
import type { BoardItemStatus, Space, BoardItem, Task, Meeting } from "@/types/database";
import type { RoomIconKey } from "@/app/board-showcase/mock-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_WEIGHT: Record<BoardItemStatus, number> = {
  undecided: 0,
  has_candidates: 25,
  decided: 50,
  purchased: 75,
  installed: 100,
};

const ROOM_ICONS: Record<RoomIconKey, React.ReactNode> = {
  bathroom: <Bathtub size={20} weight="duotone" />,
  living: <Armchair size={20} weight="duotone" />,
  bedroom: <Bed size={20} weight="duotone" />,
  kitchen: <CookingPot size={20} weight="duotone" />,
  entrance: <Door size={20} weight="duotone" />,
  storage: <Warehouse size={20} weight="duotone" />,
  study: <BookOpen size={20} weight="duotone" />,
  balcony: <Plant size={20} weight="duotone" />,
};

const SCHEDULE_COLORS = [
  { color: "text-chart-1", bgColor: "bg-chart-1/10" },
  { color: "text-chart-2", bgColor: "bg-chart-2/10" },
  { color: "text-chart-5", bgColor: "bg-chart-5/10" },
  { color: "text-primary", bgColor: "bg-primary/10" },
  { color: "text-chart-4", bgColor: "bg-chart-4/10" },
];

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  subtitle: string;
  icon: typeof Hammer;
  color: string;
  bgColor: string;
  type: "task" | "meeting";
}

function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}

function buildUpcomingItems(tasks: Task[] | undefined, meetings: Meeting[] | undefined): UpcomingItem[] {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const items: UpcomingItem[] = [];

  if (tasks) {
    for (const task of tasks) {
      if (task.start_date && task.start_date >= todayStr && task.status !== "done") {
        items.push({
          id: task.id,
          title: task.title,
          date: task.start_date,
          subtitle: task.assignee_id ? (USER_MAP[task.assignee_id] ?? "담당자") : "",
          icon: Hammer,
          color: "",
          bgColor: "",
          type: "task",
        });
      }
    }
  }

  if (meetings) {
    for (const meeting of meetings) {
      if (meeting.date >= todayStr && meeting.status === "scheduled") {
        items.push({
          id: meeting.id,
          title: meeting.title,
          date: meeting.date,
          subtitle: meeting.start_time ? meeting.start_time.slice(0, 5) : "",
          icon: CalendarCheck,
          color: "",
          bgColor: "",
          type: "meeting",
        });
      }
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  return items.slice(0, 5).map((item, i) => ({
    ...item,
    color: SCHEDULE_COLORS[i % SCHEDULE_COLORS.length].color,
    bgColor: SCHEDULE_COLORS[i % SCHEDULE_COLORS.length].bgColor,
  }));
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface RecentHistoryEntry {
  id: string;
  action: string;
  created_at: string;
  board_item_id: string;
  board_item_category?: string;
  space_name?: string;
}

function useRecentHistory() {
  const supabase = createClient();
  return useQuery<RecentHistoryEntry[]>({
    queryKey: ["recent-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_item_history")
        .select("id, action, created_at, board_item_id, board_items!inner(category, space_id, spaces!inner(name))")
        .eq("board_items.project_id", useAppStore.getState().projectId ?? "a1b2c3d4-0000-0000-0000-000000000001")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const boardItem = row.board_items as Record<string, unknown> | null;
        const space = boardItem?.spaces as Record<string, unknown> | null;
        return {
          id: row.id as string,
          action: row.action as string,
          created_at: row.created_at as string,
          board_item_id: row.board_item_id as string,
          board_item_category: (boardItem?.category as string) ?? undefined,
          space_name: (space?.name as string) ?? undefined,
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatKRW(amount: number): string {
  if (amount === 0) return "0원";
  if (amount >= 100000000) {
    return `${(amount / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function computeStats(items: BoardItem[]) {
  let decided = 0;
  let undecided = 0;
  let hasCandidates = 0;
  let totalBudget = 0;
  let totalSpent = 0;
  let progressSum = 0;

  for (const item of items) {
    // Count by status
    if (item.status === "decided" || item.status === "purchased" || item.status === "installed") {
      decided++;
    } else if (item.status === "undecided") {
      undecided++;
    } else if (item.status === "has_candidates") {
      hasCandidates++;
    }

    // Budget
    totalBudget += item.estimated_budget ?? 0;

    // Spent
    totalSpent +=
      (item.cost_material ?? 0) +
      (item.cost_labor ?? 0) +
      (item.cost_delivery ?? 0) +
      (item.cost_other ?? 0);

    // Progress
    progressSum += STATUS_WEIGHT[item.status] ?? 0;
  }

  const progressPercent = items.length > 0 ? Math.round(progressSum / items.length) : 0;

  return { decided, undecided, hasCandidates, totalBudget, totalSpent, progressPercent };
}

function computeRoomProgress(space: Space, items: BoardItem[]) {
  const roomItems = items.filter((i) => i.space_id === space.id);
  const total = roomItems.length;
  if (total === 0) return { total: 0, decided: 0, progress: 0 };
  const decided = roomItems.filter(
    (i) => i.status === "decided" || i.status === "purchased" || i.status === "installed"
  ).length;
  const progressSum = roomItems.reduce((sum, i) => sum + (STATUS_WEIGHT[i.status] ?? 0), 0);
  return { total, decided, progress: Math.round(progressSum / total) };
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 py-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RoomCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-2 py-2.5">
          <Skeleton className="mt-0.5 h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: project } = useProject();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: boardItems, isLoading: itemsLoading } = useBoardItems();
  const { data: recentHistory, isLoading: historyLoading } = useRecentHistory();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings();

  const isLoading = spacesLoading || itemsLoading;
  const scheduleLoading = tasksLoading || meetingsLoading;

  const stats = useMemo(() => {
    if (!boardItems) return null;
    return computeStats(boardItems);
  }, [boardItems]);

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "결정됨",
        value: String(stats.decided),
        icon: CheckCircle,
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        label: "미결정",
        value: String(stats.undecided),
        icon: Question,
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
      {
        label: "후보있음",
        value: String(stats.hasCandidates),
        icon: ListChecks,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        label: "예산",
        value: stats.totalBudget > 0 ? formatKRW(stats.totalBudget) : "-",
        icon: CurrencyKrw,
        color: "text-chart-1",
        bgColor: "bg-chart-1/10",
      },
      {
        label: "지출",
        value: stats.totalSpent > 0 ? formatKRW(stats.totalSpent) : "-",
        icon: Receipt,
        color: "text-chart-4",
        bgColor: "bg-chart-4/10",
      },
      {
        label: "잔여",
        value:
          stats.totalBudget > 0
            ? formatKRW(stats.totalBudget - stats.totalSpent)
            : "-",
        icon: Wallet,
        color: "text-success",
        bgColor: "bg-success/10",
      },
    ];
  }, [stats]);

  const roomCards = useMemo(() => {
    if (!spaces || !boardItems) return [];
    return spaces.map((space) => ({
      space,
      ...computeRoomProgress(space, boardItems),
    }));
  }, [spaces, boardItems]);

  const upcomingItems = useMemo(() => buildUpcomingItems(tasks, meetings), [tasks, meetings]);

  const projectDates = useMemo(() => {
    let earliest: string | null = null;
    let latest: string | null = null;

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        if (task.start_date) {
          if (!earliest || task.start_date < earliest) earliest = task.start_date;
        }
        if (task.end_date) {
          if (!latest || task.end_date > latest) latest = task.end_date;
        }
      }
    }

    const formatYearMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    };

    return {
      start: earliest ? formatYearMonth(earliest) : null,
      end: latest ? formatYearMonth(latest) : null,
    };
  }, [tasks]);

  const showOnboarding = !isLoading && (
    (!spaces || spaces.length === 0) ||
    (!boardItems || boardItems.length <= 2)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{project?.name || "프로젝트"}</h1>
          <Badge variant="secondary" className="text-[10px]">
            진행중
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {project?.description || "프로젝트 현황"}
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
      >
        <Card>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">전체 진행률</span>
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {stats?.progressPercent ?? 0}%
                  </span>
                )}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                {isLoading ? (
                  <Skeleton className="h-full w-1/3 rounded-full" />
                ) : (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats?.progressPercent ?? 0}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-chart-1"
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>시작: {projectDates.start ?? "미정"}</span>
                <span>목표 완료: {projectDates.end ?? "미정"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary cards */}
      {isLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1 + index * 0.05,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Card className="relative overflow-hidden">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bgColor}`}
                    >
                      <Icon size={20} weight="duotone" className={card.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className="text-lg font-bold tracking-tight">{card.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Onboarding hints */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="space-y-2"
        >
          <Link href="/app/board">
            <Card className="group cursor-pointer border-primary/20 bg-primary/5 transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Kanban size={18} weight="duotone" className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">방을 추가해서 시작하세요</p>
                  <p className="text-xs text-muted-foreground">
                    보드에서 공간을 만들고 항목을 관리할 수 있어요
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                />
              </CardContent>
            </Card>
          </Link>

          <Card className="border-chart-2/20 bg-chart-2/5">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-2/10">
                <Lightbulb size={18} weight="duotone" className="text-chart-2" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">AI 채팅으로 결정사항을 기록해보세요</p>
                <p className="text-xs text-muted-foreground">
                  화면 하단의 채팅 버튼을 눌러 AI와 대화할 수 있어요
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Room progress cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <House size={18} weight="duotone" className="text-primary" />
            공간별 진행 현황
          </h2>
          <Link href="/app/board">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              보드 열기
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <RoomCardsSkeleton />
        ) : roomCards.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Notebook size={32} weight="duotone" className="mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                아직 등록된 공간이 없습니다.
              </p>
              <Link href="/app/board">
                <Button variant="outline" size="sm" className="mt-3">
                  보드에서 공간 추가하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {roomCards.map((room, index) => {
              const iconKey = (room.space.icon_key as RoomIconKey) || "living";
              const color = room.space.color || "#8B9E6B";
              return (
                <motion.div
                  key={room.space.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.35 + index * 0.05,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link href="/app/board">
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="space-y-2.5 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {ROOM_ICONS[iconKey] ?? <House size={20} weight="duotone" />}
                          </div>
                          <span className="text-sm font-medium truncate">{room.space.name}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${room.progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{room.progress}%</span>
                          <span>
                            {room.decided}/{room.total} 결정
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Two-column layout: Schedule + Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming schedule */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarCheck size={18} weight="duotone" className="text-primary" />
                  다가오는 일정
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  전체보기
                  <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduleLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingItems.length === 0 ? (
                <div className="py-6 text-center">
                  <CalendarCheck size={28} weight="duotone" className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    다가오는 일정이 없습니다.
                  </p>
                </div>
              ) : (
                upcomingItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.08 }}
                      className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}
                      >
                        <Icon size={18} weight="duotone" className={item.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{item.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock size={10} />
                          <span>{formatScheduleDate(item.date)}</span>
                          {item.subtitle && (
                            <>
                              <span>&middot;</span>
                              <span>{item.subtitle}</span>
                            </>
                          )}
                          <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">
                            {item.type === "task" ? "작업" : "미팅"}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock size={18} weight="duotone" className="text-muted-foreground" />
                  최근 활동
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <ActivitySkeleton />
              ) : !recentHistory || recentHistory.length === 0 ? (
                <div className="py-6 text-center">
                  <Notebook size={28} weight="duotone" className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    아직 활동 기록이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentHistory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + index * 0.06 }}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <TrendUp
                        size={16}
                        weight="duotone"
                        className="mt-0.5 shrink-0 text-chart-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          {item.space_name && (
                            <span className="font-medium">{item.space_name}</span>
                          )}
                          {item.space_name && item.board_item_category && " > "}
                          {item.board_item_category && (
                            <span className="font-medium">{item.board_item_category}</span>
                          )}
                          {(item.space_name || item.board_item_category) && " — "}
                          {item.action}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
      >
        <Separator className="mb-4" />
        <div className="flex flex-wrap gap-2">
          <Link href="/app/board">
            <Button variant="outline" size="sm">
              <Kanban size={14} weight="duotone" />
              보드 열기
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled>
            <ChatCircleDots size={14} weight="duotone" />
            AI와 대화하기
            <span className="ml-1 text-[10px] text-muted-foreground">(하단 버튼)</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
