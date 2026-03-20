"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import {
  CalendarBlank,
  VideoCamera,
  Wrench,
  MapPin,
  ListChecks,
  Plus,
  X,
  DownloadSimple,
  SpinnerGap,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMeetings,
  useCreateMeeting,
  useCreateTask,
  useCreateSchedule,
  useTasks,
  useSchedules,
  useBoardItems,
  useSpaces,
  useGoogleCalendarConnection,
  useUpdateGoogleCalendarSync,
  useDeleteGoogleCalendarConnection,
} from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import type { Meeting, Task, Schedule } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type EventType = "meeting" | "task" | "schedule" | "construction";

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
  meeting:      { bg: "#3B4B6B", border: "#3B4B6B", text: "#ffffff" },
  task:         { bg: "#6B8B5E", border: "#6B8B5E", text: "#ffffff" },
  schedule:     { bg: "#B8956A", border: "#B8956A", text: "#ffffff" },
  construction: { bg: "#8B6F4E", border: "#8B6F4E", text: "#ffffff" },
};

const EVENT_LABELS: Record<EventType, string> = {
  meeting: "회의",
  task: "공정",
  schedule: "방문",
  construction: "시공",
};

// ---------------------------------------------------------------------------
// ICS export for all events
// ---------------------------------------------------------------------------

function generateAllICS(events: EventInput[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HOMI//Calendar//KO",
    "CALSCALE:GREGORIAN",
  ];

  for (const ev of events) {
    const start = typeof ev.start === "string" ? ev.start.replace(/[-:]/g, "").replace("T", "T") : "";
    const end = typeof ev.end === "string" ? ev.end.replace(/[-:]/g, "").replace("T", "T") : start;
    if (!start) continue;

    lines.push("BEGIN:VEVENT");
    if (start.includes("T")) {
      lines.push(`DTSTART;TZID=Asia/Seoul:${start}`);
      lines.push(`DTEND;TZID=Asia/Seoul:${end || start}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      lines.push(`DTEND;VALUE=DATE:${end || start}`);
    }
    lines.push(`SUMMARY:${ev.title ?? ""}` );
    lines.push(`UID:${ev.id ?? Math.random().toString(36)}@homi`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadAllICS(events: EventInput[]) {
  const ics = generateAllICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "homi-calendar.ics";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Quick Add Dialog
// ---------------------------------------------------------------------------

function QuickAddDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
}) {
  const createMeeting = useCreateMeeting();
  const createTask = useCreateTask();
  const createSchedule = useCreateSchedule();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [eventType, setEventType] = useState<string>("meeting");

  const isPending = createMeeting.isPending || createTask.isPending || createSchedule.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) { toast.error("제목과 날짜를 입력해주세요"); return; }

    const callbacks = {
      onSuccess: () => { toast.success("일정이 추가되었습니다"); onOpenChange(false); },
      onError: () => toast.error("추가 실패"),
    };

    if (eventType === "task") {
      createTask.mutate(
        { title: title.trim(), start_date: date, end_date: date, status: "todo" as const },
        callbacks,
      );
    } else if (eventType === "schedule") {
      createSchedule.mutate(
        { title: title.trim(), date },
        callbacks,
      );
    } else {
      createMeeting.mutate(
        { title: title.trim(), date, start_time: startTime || null },
        callbacks,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>빠른 일정 추가</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="일정 제목" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>시간</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>유형</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">회의</SelectItem>
                <SelectItem value="task">공정</SelectItem>
                <SelectItem value="schedule">방문</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isPending}>추가</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Event Detail Dialog
// ---------------------------------------------------------------------------

function EventDetailDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: { id: string; title: string; type: EventType; date: string; time?: string; extra?: string; url?: string } | null;
}) {
  if (!event) return null;
  const color = EVENT_COLORS[event.type];
  const Icon = event.type === "meeting" ? VideoCamera
    : event.type === "task" ? ListChecks
    : event.type === "schedule" ? MapPin
    : Wrench;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color.bg + "20" }}>
              <Icon weight="duotone" className="size-4" style={{ color: color.bg }} />
            </div>
            {event.title}
          </DialogTitle>
          <DialogDescription>
            <Badge className="text-[10px] border-0 mt-1" style={{ backgroundColor: color.bg + "15", color: color.bg }}>
              {EVENT_LABELS[event.type]}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarBlank size={14} weight="duotone" /> {event.date}
            {event.time && <><span>·</span> {event.time}</>}
          </div>
          {event.extra && <p className="text-muted-foreground">{event.extra}</p>}
        </div>
        <DialogFooter>
          {event.url && (
            <Button variant="outline" size="sm" onClick={() => window.location.href = event.url!}>
              상세 보기
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const projectId = useAppStore((s) => s.projectId);
  const { data: meetings = [], isLoading: meetingsLoading } = useMeetings();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules();
  const { data: boardItems = [], isLoading: boardItemsLoading } = useBoardItems();
  const { data: spaces = [] } = useSpaces();
  const { data: gcalConnection } = useGoogleCalendarConnection();
  const updateGcalSync = useUpdateGoogleCalendarSync();
  const deleteGcal = useDeleteGoogleCalendarConnection();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string; title: string; type: EventType; date: string; time?: string; extra?: string; url?: string;
  } | null>(null);
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [showGcalSettings, setShowGcalSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Google Calendar sync
  async function handleGoogleSync() {
    if (!gcalConnection) return;
    setSyncing(true);
    try {
      const eventsToSync: { id: string; title: string; date: string; startTime?: string; endTime?: string; description?: string }[] = [];

      if (gcalConnection.sync_meetings) {
        for (const m of meetings) {
          if (m.status === "cancelled") continue;
          eventsToSync.push({ id: m.id, title: m.title, date: m.date, startTime: m.start_time ?? undefined, endTime: m.end_time ?? undefined, description: m.agenda ?? undefined });
        }
      }
      if (gcalConnection.sync_tasks) {
        for (const t of tasks) {
          if (!t.start_date) continue;
          eventsToSync.push({ id: t.id, title: t.title, date: t.start_date, description: t.description ?? undefined });
        }
      }
      if (gcalConnection.sync_schedules) {
        for (const s of schedules) {
          eventsToSync.push({ id: s.id, title: s.title, date: s.date, description: s.notes ?? undefined });
        }
      }

      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, events: eventsToSync }),
      });
      const data = await res.json();

      if (data.error) { toast.error(data.error); return; }
      toast.success(`${data.synced}개 일정이 Google Calendar에 동기화되었습니다`);

      updateGcalSync.mutate({ id: gcalConnection.id, last_synced_at: new Date().toISOString() });
    } catch {
      toast.error("동기화 실패");
    } finally {
      setSyncing(false);
    }
  }

  const isLoading = meetingsLoading || tasksLoading || schedulesLoading || boardItemsLoading;

  const spaceMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of spaces) m[s.id] = s.name;
    return m;
  }, [spaces]);

  // Build unified events
  const allEvents = useMemo<EventInput[]>(() => {
    const events: EventInput[] = [];

    // Meetings
    for (const m of meetings) {
      if (m.status === "cancelled") continue;
      events.push({
        id: `meeting-${m.id}`,
        title: m.title,
        start: m.start_time ? `${m.date}T${m.start_time}` : m.date,
        end: m.end_time ? `${m.date}T${m.end_time}` : undefined,
        allDay: !m.start_time,
        backgroundColor: EVENT_COLORS.meeting.bg,
        borderColor: EVENT_COLORS.meeting.border,
        textColor: EVENT_COLORS.meeting.text,
        extendedProps: { type: "meeting" as EventType, originalId: m.id, extra: m.agenda, url: "/app/meetings" },
      });
    }

    // Tasks
    for (const t of tasks) {
      if (!t.start_date) continue;
      events.push({
        id: `task-${t.id}`,
        title: t.title,
        start: t.start_date,
        end: t.end_date ?? undefined,
        allDay: true,
        backgroundColor: EVENT_COLORS.task.bg,
        borderColor: EVENT_COLORS.task.border,
        textColor: EVENT_COLORS.task.text,
        extendedProps: { type: "task" as EventType, originalId: t.id, url: "/app/timeline" },
      });
    }

    // Schedules
    for (const s of schedules) {
      events.push({
        id: `schedule-${s.id}`,
        title: s.title,
        start: s.date,
        allDay: true,
        backgroundColor: EVENT_COLORS.schedule.bg,
        borderColor: EVENT_COLORS.schedule.border,
        textColor: EVENT_COLORS.schedule.text,
        extendedProps: { type: "schedule" as EventType, originalId: s.id, extra: s.notes, url: "/app/places" },
      });
    }

    // Board item construction dates
    for (const bi of boardItems) {
      if (!bi.construction_date) continue;
      const spaceName = bi.space_id ? spaceMap[bi.space_id] : "";
      events.push({
        id: `construction-${bi.id}`,
        title: `${spaceName ? spaceName + " " : ""}${bi.category} 시공`,
        start: bi.construction_date,
        end: bi.construction_end_date ?? undefined,
        allDay: true,
        backgroundColor: EVENT_COLORS.construction.bg,
        borderColor: EVENT_COLORS.construction.border,
        textColor: EVENT_COLORS.construction.text,
        extendedProps: { type: "construction" as EventType, originalId: bi.id, url: "/app/board" },
      });
    }

    return events;
  }, [meetings, tasks, schedules, boardItems, spaceMap]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return allEvents;
    return allEvents.filter((e) => e.extendedProps?.type === filter);
  }, [allEvents, filter]);

  // Handlers
  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setQuickAddDate(selectInfo.startStr.slice(0, 10));
    setQuickAddOpen(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      type: props.type as EventType,
      date: clickInfo.event.startStr.slice(0, 10),
      time: clickInfo.event.startStr.includes("T") ? clickInfo.event.startStr.slice(11, 16) : undefined,
      extra: props.extra as string | undefined,
      url: props.url as string | undefined,
    });
    setDetailOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">캘린더</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              회의 {meetings.filter((m) => m.status !== "cancelled").length} · 공정 {tasks.filter((t) => t.start_date).length} · 방문 {schedules.length}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {gcalConnection ? (
              <Button variant="outline" size="sm" onClick={() => setShowGcalSettings(!showGcalSettings)} className="gap-1">
                <CalendarBlank weight="duotone" className="size-4" />
                <span className="hidden sm:inline">Google</span> 연동
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { window.location.href = `/api/calendar/auth?projectId=${projectId}`; }} className="gap-1">
                <CalendarBlank weight="duotone" className="size-4" />
                <span className="hidden sm:inline">Google</span> 연결
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => downloadAllICS(filteredEvents)} className="gap-1">
              <DownloadSimple weight="bold" className="size-4" />
              <span className="hidden sm:inline">.ics</span>
            </Button>
            <Button size="sm" onClick={() => { setQuickAddDate(new Date().toISOString().slice(0, 10)); setQuickAddOpen(true); }}>
              <Plus weight="bold" className="size-4" />
              <span className="hidden sm:inline">일정</span>
            </Button>
          </div>
        </motion.div>

        {/* Filter + Legend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Button variant={filter === "all" ? "default" : "outline"} size="xs" onClick={() => setFilter("all")}>전체</Button>
            {(Object.keys(EVENT_LABELS) as EventType[]).map((type) => (
              <Button key={type} variant={filter === type ? "default" : "outline"} size="xs" onClick={() => setFilter(type)} className="gap-1">
                <div className="size-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[type].bg }} />
                {EVENT_LABELS[type]}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Google Calendar Settings */}
        {showGcalSettings && gcalConnection && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Google Calendar 동기화 설정</h3>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowGcalSettings(false)}><X size={14} /></Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                &quot;HOMI - 프로젝트 일정&quot; 별도 캘린더에 동기화됩니다. 개인 일정과 분리됩니다.
              </p>
              <div className="space-y-2">
                {[
                  { key: "sync_meetings" as const, label: "회의", value: gcalConnection.sync_meetings },
                  { key: "sync_tasks" as const, label: "공정 태스크", value: gcalConnection.sync_tasks },
                  { key: "sync_schedules" as const, label: "방문 스케줄", value: gcalConnection.sync_schedules },
                  { key: "sync_construction" as const, label: "시공 일정", value: gcalConnection.sync_construction },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <Switch
                      checked={item.value}
                      onCheckedChange={(checked) => {
                        updateGcalSync.mutate({ id: gcalConnection.id, [item.key]: checked });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" onClick={handleGoogleSync} disabled={syncing} className="gap-1 flex-1">
                  {syncing ? <SpinnerGap size={14} className="animate-spin" /> : <ArrowSquareOut size={14} />}
                  {syncing ? "동기화 중..." : "지금 동기화"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Google Calendar 연결을 해제하시겠습니까?")) {
                      deleteGcal.mutate(gcalConnection.id);
                      setShowGcalSettings(false);
                      toast.success("연결 해제됨");
                    }
                  }}
                >
                  연결 해제
                </Button>
              </div>
              {gcalConnection.last_synced_at && (
                <p className="text-[10px] text-muted-foreground">
                  마지막 동기화: {new Date(gcalConnection.last_synced_at).toLocaleString("ko-KR")}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl ring-1 ring-border bg-card p-4 [&_.fc]:text-sm [&_.fc-toolbar-title]:text-base [&_.fc-toolbar-title]:font-bold [&_.fc-button]:!rounded-lg [&_.fc-button]:!text-xs [&_.fc-button]:!px-3 [&_.fc-button]:!py-1.5 [&_.fc-button]:!border-input [&_.fc-button]:!bg-background [&_.fc-button]:!text-foreground [&_.fc-button]:!shadow-none [&_.fc-button:hover]:!bg-muted [&_.fc-button-active]:!bg-primary [&_.fc-button-active]:!text-primary-foreground [&_.fc-button-active]:!border-primary [&_.fc-today-button]:!bg-primary [&_.fc-today-button]:!text-primary-foreground [&_.fc-today-button]:!border-primary [&_.fc-day-today]:!bg-primary/5 [&_.fc-event]:!rounded-md [&_.fc-event]:!border-0 [&_.fc-event]:!px-1.5 [&_.fc-event]:!py-0.5 [&_.fc-event]:!text-[11px] [&_.fc-event]:!font-medium [&_.fc-event]:!cursor-pointer [&_.fc-daygrid-day-number]:!text-xs [&_.fc-daygrid-day-number]:!p-2 [&_.fc-col-header-cell-cushion]:!text-xs [&_.fc-col-header-cell-cushion]:!font-medium [&_.fc-col-header-cell-cushion]:!text-muted-foreground [&_.fc-col-header-cell-cushion]:!py-2 [&_.fc-scrollgrid]:!border-border [&_td]:!border-border [&_th]:!border-border [&_.fc-list-event-title]:!text-sm [&_.fc-list-day-cushion]:!bg-muted/50 [&_.fc-list-day-text]:!text-sm [&_.fc-list-day-side-text]:!text-xs">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={typeof window !== "undefined" && window.innerWidth < 768 ? "listWeek" : "dayGridMonth"}
              locale="ko"
              headerToolbar={typeof window !== "undefined" && window.innerWidth < 768
                ? { left: "prev,next", center: "title", right: "listWeek,dayGridMonth" }
                : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }
              }
              buttonText={{
                today: "오늘",
                month: "월",
                week: "주",
                list: "목록",
              }}
              events={filteredEvents}
              selectable
              select={handleDateSelect}
              eventClick={handleEventClick}
              height="auto"
              dayMaxEvents={2}
              moreLinkText={(n) => `+${n}개`}
              firstDay={0}
              fixedWeekCount={false}
              contentHeight="auto"
            />
          </div>
        </motion.div>

        {/* Quick Add Dialog */}
        {quickAddOpen && (
          <QuickAddDialog
            open={quickAddOpen}
            onOpenChange={setQuickAddOpen}
            defaultDate={quickAddDate}
          />
        )}

        {/* Event Detail Dialog */}
        <EventDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          event={selectedEvent}
        />
      </div>
    </div>
  );
}
