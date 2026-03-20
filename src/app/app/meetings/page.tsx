"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  VideoCamera,
  Plus,
  CalendarBlank,
  Clock,
  Trash,
  SpinnerGap,
  Sparkle,
  CheckCircle,
  ArrowSquareOut,
  Lightning,
  PencilSimple,
  DownloadSimple,
  CaretDown,
  CaretUp,
  ListChecks,
  ChatText,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  useUpdateMeeting,
  useDeleteMeeting,
  useCreateTask,
} from "@/lib/queries";
import { USER_MAP } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { Meeting, MeetingDecision, MeetingActionItem, MeetingStatus } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: "예정", color: "bg-blue-500/10 text-blue-600" },
  completed: { label: "완료", color: "bg-emerald-500/10 text-emerald-600" },
  cancelled: { label: "취소", color: "bg-muted text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// ICS file generation
// ---------------------------------------------------------------------------

function generateICS(meeting: Meeting): string {
  const start = meeting.date.replace(/-/g, "") + (meeting.start_time ? "T" + meeting.start_time.replace(/:/g, "") + "00" : "T090000");
  const end = meeting.date.replace(/-/g, "") + (meeting.end_time ? "T" + meeting.end_time.replace(/:/g, "") + "00" : "T100000");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HOMI//Meeting//KO",
    "BEGIN:VEVENT",
    `DTSTART;TZID=Asia/Seoul:${start}`,
    `DTEND;TZID=Asia/Seoul:${end}`,
    `SUMMARY:${meeting.title}`,
    meeting.agenda ? `DESCRIPTION:${meeting.agenda.replace(/\n/g, "\\n")}` : "",
    meeting.zoom_join_url ? `URL:${meeting.zoom_join_url}` : "",
    meeting.zoom_join_url ? `LOCATION:${meeting.zoom_join_url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function downloadICS(meeting: Meeting) {
  const ics = generateICS(meeting);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meeting.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Meeting Form Dialog
// ---------------------------------------------------------------------------

function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meeting?: Meeting;
}) {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const isEditing = !!meeting;

  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(meeting?.date ?? "");
  const [startTime, setStartTime] = useState(meeting?.start_time ?? "");
  const [endTime, setEndTime] = useState(meeting?.end_time ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [zoomUrl, setZoomUrl] = useState(meeting?.zoom_join_url ?? "");
  const [zoomCreating, setZoomCreating] = useState(false);

  // Zoom 회의 자동 생성
  async function handleCreateZoom() {
    if (!title || !date || !startTime) {
      toast.error("제목, 날짜, 시작 시간을 먼저 입력해주세요");
      return;
    }
    setZoomCreating(true);
    try {
      const startISO = `${date}T${startTime}:00`;
      const duration = startTime && endTime
        ? Math.round((new Date(`2000-01-01T${endTime}`).getTime() - new Date(`2000-01-01T${startTime}`).getTime()) / 60000)
        : 60;

      const res = await fetch("/api/meetings/zoom/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: useAppStore.getState().projectId, topic: title, startTime: startISO, duration }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setZoomUrl(data.joinUrl);
        toast.success("Zoom 회의가 생성되었습니다");
      }
    } catch {
      toast.error("Zoom 회의 생성 실패");
    } finally {
      setZoomCreating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) { toast.error("제목과 날짜를 입력해주세요"); return; }

    const payload = {
      title: title.trim(),
      date,
      start_time: startTime || null,
      end_time: endTime || null,
      agenda: agenda.trim() || null,
      zoom_join_url: zoomUrl.trim() || null,
    };

    if (isEditing) {
      updateMeeting.mutate(
        { id: meeting.id, ...payload },
        { onSuccess: () => { toast.success("회의가 수정되었습니다"); onOpenChange(false); }, onError: () => toast.error("수정 실패") }
      );
    } else {
      createMeeting.mutate(
        payload,
        { onSuccess: () => { toast.success("회의가 추가되었습니다"); onOpenChange(false); }, onError: () => toast.error("추가 실패") }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "회의 수정" : "회의 추가"}</DialogTitle>
          <DialogDescription>{isEditing ? "회의 정보를 수정합니다" : "새 회의를 추가합니다"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="주간 시공 회의" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>날짜 *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>시작</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>종료</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>안건</Label>
            <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="회의 안건을 입력하세요" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Zoom 링크</Label>
            <div className="flex gap-2">
              <Input value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="flex-1" />
              <Button type="button" variant="outline" size="default" onClick={handleCreateZoom} disabled={zoomCreating} className="shrink-0 gap-1">
                <VideoCamera size={14} />
                {zoomCreating ? "생성중" : "자동생성"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={createMeeting.isPending || updateMeeting.isPending}>
              {(createMeeting.isPending || updateMeeting.isPending) ? "저장 중..." : isEditing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Meeting Detail (expanded card)
// ---------------------------------------------------------------------------

function MeetingDetail({ meeting }: { meeting: Meeting }) {
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const createTask = useCreateTask();

  const [transcript, setTranscript] = useState(meeting.transcript ?? "");
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingRecording, setFetchingRecording] = useState(false);

  // AI 분석
  async function handleAnalyze() {
    if (!transcript.trim()) { toast.error("회의록을 입력해주세요"); return; }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/meetings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim(), agenda: meeting.agenda }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(data.error || "분석 실패"); return; }

      const decisions: MeetingDecision[] = (data.decisions ?? []).map((d: { id: string; content: string; boardItemHint?: string }) => ({
        id: d.id, content: d.content, boardItemId: undefined, applied: false,
      }));
      const actionItems: MeetingActionItem[] = (data.actionItems ?? []).map((a: { id: string; content: string; assignee?: string; dueDate?: string }) => ({
        id: a.id, content: a.content, assignee: a.assignee ?? undefined, dueDate: a.dueDate ?? undefined, done: false,
      }));

      updateMeeting.mutate({
        id: meeting.id,
        transcript: transcript.trim(),
        ai_summary: data.summary,
        decisions,
        action_items: actionItems,
        status: "completed",
      }, {
        onSuccess: () => toast.success("AI 분석 완료"),
        onError: () => toast.error("저장 실패"),
      });
    } catch { toast.error("분석 오류"); }
    finally { setAnalyzing(false); }
  }

  // Zoom 녹화 가져오기
  async function handleFetchRecording() {
    if (!meeting.zoom_meeting_id && !meeting.zoom_join_url) { toast.error("Zoom 회의 ID가 없습니다"); return; }
    setFetchingRecording(true);
    try {
      const meetingId = meeting.zoom_meeting_id ?? meeting.zoom_join_url?.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) { toast.error("Zoom 회의 ID를 찾을 수 없습니다"); return; }

      const res = await fetch(`/api/meetings/zoom/recording?meetingId=${meetingId}&projectId=${useAppStore.getState().projectId}`);
      const data = await res.json();

      if (data.recordingUrl) {
        updateMeeting.mutate({ id: meeting.id, zoom_recording_url: data.recordingUrl });
        toast.success("녹화 링크를 가져왔습니다");
      }
      if (data.transcript) {
        setTranscript(data.transcript);
        toast.success("스크립트를 가져왔습니다");
      }
      if (!data.recordingUrl && !data.transcript) {
        toast.error(data.error || "녹화를 찾을 수 없습니다");
      }
    } catch { toast.error("가져오기 실패"); }
    finally { setFetchingRecording(false); }
  }

  // 할 일 → 태스크 생성
  function handleCreateTask(item: MeetingActionItem) {
    const userId = item.assignee ? Object.entries(USER_MAP).find(([, name]) => name === item.assignee)?.[0] : undefined;
    createTask.mutate(
      {
        title: item.content,
        assignee_id: userId ?? null,
        start_date: item.dueDate ?? null,
        end_date: item.dueDate ?? null,
        status: "todo",
      } as Parameters<typeof createTask.mutate>[0],
      {
        onSuccess: () => toast.success("태스크가 생성되었습니다"),
        onError: () => toast.error("태스크 생성 실패"),
      }
    );
  }

  function handleDelete() {
    if (!confirm("이 회의를 삭제하시겠습니까?")) return;
    deleteMeeting.mutate(meeting.id, {
      onSuccess: () => toast.success("삭제되었습니다"),
      onError: () => toast.error("삭제 실패"),
    });
  }

  const decisions = meeting.decisions ?? [];
  const actionItems = meeting.action_items ?? [];

  return (
    <div className="p-4 space-y-4 bg-muted/10">
      {/* 안건 */}
      {meeting.agenda && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">안건</p>
          <p className="text-sm whitespace-pre-wrap">{meeting.agenda}</p>
        </div>
      )}

      {/* 회의록 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-medium text-muted-foreground">회의록</p>
          <div className="flex gap-1.5">
            {meeting.zoom_join_url && (
              <Button size="xs" variant="outline" className="gap-1" onClick={handleFetchRecording} disabled={fetchingRecording}>
                <VideoCamera size={10} />
                {fetchingRecording ? "가져오는중" : "Zoom 스크립트"}
              </Button>
            )}
            <Button size="xs" variant="outline" className="gap-1" onClick={() => setEditingTranscript(!editingTranscript)}>
              <PencilSimple size={10} />
              {editingTranscript ? "닫기" : "편집"}
            </Button>
          </div>
        </div>
        {editingTranscript ? (
          <div className="space-y-2">
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} placeholder="회의 내용을 입력하세요..." className="text-sm" />
            <div className="flex gap-2">
              <Button size="xs" onClick={() => {
                updateMeeting.mutate({ id: meeting.id, transcript: transcript.trim() || null });
                setEditingTranscript(false);
                toast.success("저장됨");
              }}>저장</Button>
              <Button size="xs" variant="default" className="gap-1" onClick={handleAnalyze} disabled={analyzing || !transcript.trim()}>
                <Sparkle size={10} />
                {analyzing ? "분석 중..." : "AI 분석"}
              </Button>
            </div>
          </div>
        ) : transcript ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-background rounded-lg p-3 max-h-32 overflow-y-auto">{transcript}</p>
        ) : (
          <p className="text-xs text-muted-foreground/60 py-2">회의록이 없습니다. 편집을 눌러 입력하거나 Zoom 스크립트를 가져오세요.</p>
        )}
      </div>

      {/* AI 요약 */}
      {meeting.ai_summary && (
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-[11px] font-medium text-primary flex items-center gap-1 mb-1">
            <Lightning weight="duotone" size={12} /> AI 요약
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{meeting.ai_summary}</p>
        </div>
      )}

      {/* 결정사항 */}
      {decisions.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">결정사항</p>
          <div className="space-y-1.5">
            {decisions.map((d, i) => (
              <div key={d.id ?? i} className="flex items-start gap-2 text-sm">
                <CheckCircle weight="duotone" className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{d.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 할 일 */}
      {actionItems.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">할 일</p>
          <div className="space-y-1.5">
            {actionItems.map((a, i) => (
              <div key={a.id ?? i} className="flex flex-wrap items-center gap-2 text-sm">
                <ListChecks weight="duotone" className="size-4 text-blue-500 shrink-0" />
                <span className="flex-1 min-w-0">{a.content}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.assignee && <Badge variant="secondary" className="text-[9px]">{a.assignee}</Badge>}
                  {a.dueDate && <span className="text-[10px] text-muted-foreground">{a.dueDate}</span>}
                  <Button size="xs" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => handleCreateTask(a)}>
                    태스크
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
        {meeting.zoom_join_url && (
          <Button size="xs" variant="outline" className="gap-1" onClick={() => window.open(meeting.zoom_join_url!, "_blank")}>
            <VideoCamera size={12} /> Zoom 참여
          </Button>
        )}
        {meeting.zoom_recording_url && (
          <Button size="xs" variant="outline" className="gap-1" onClick={() => window.open(meeting.zoom_recording_url!, "_blank")}>
            <ArrowSquareOut size={12} /> 녹화 보기
          </Button>
        )}
        <Button size="xs" variant="outline" className="gap-1" onClick={() => downloadICS(meeting)}>
          <DownloadSimple size={12} /> 캘린더
        </Button>
        <Button size="xs" variant="outline" className="gap-1 text-destructive hover:text-destructive ml-auto" onClick={handleDelete}>
          <Trash size={12} /> 삭제
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MeetingsPage() {
  const { data: meetings = [], isLoading } = useMeetings();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return meetings;
    return meetings.filter((m) => m.status === statusFilter);
  }, [meetings, statusFilter]);

  const upcoming = meetings.filter((m) => m.status === "scheduled").length;
  const completed = meetings.filter((m) => m.status === "completed").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <Skeleton className="h-7 w-28" />
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">회의</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {meetings.length > 0 ? `예정 ${upcoming} · 완료 ${completed} · 총 ${meetings.length}` : "프로젝트 회의 관리"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="default" onClick={() => { window.location.href = `/api/zoom/auth?projectId=${useAppStore.getState().projectId}`; }}>
              <VideoCamera weight="duotone" className="size-4" /> Zoom 연결
            </Button>
            <Button size="default" onClick={() => { setEditingMeeting(undefined); setFormOpen(true); }}>
              <Plus weight="bold" className="size-4" /> 회의 추가
            </Button>
          </div>
        </motion.div>

        {/* Filter */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-1.5">
          {[
            { value: "all", label: "전체" },
            { value: "scheduled", label: "예정" },
            { value: "completed", label: "완료" },
            { value: "cancelled", label: "취소" },
          ].map((f) => (
            <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="xs" onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </motion.div>

        {/* Meeting List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((meeting, idx) => {
              const isExpanded = expandedId === meeting.id;
              const config = STATUS_CONFIG[meeting.status];

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  layout
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold truncate">{meeting.title}</h3>
                              <Badge className={`text-[10px] border-0 ${config.color}`}>{config.label}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarBlank size={11} weight="duotone" /> {meeting.date}
                              </span>
                              {meeting.start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} weight="duotone" />
                                  {meeting.start_time}{meeting.end_time && ` ~ ${meeting.end_time}`}
                                </span>
                              )}
                              {meeting.zoom_join_url && (
                                <span className="flex items-center gap-1">
                                  <VideoCamera size={11} weight="duotone" /> Zoom
                                </span>
                              )}
                              {meeting.ai_summary && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Sparkle size={11} weight="duotone" /> AI 분석됨
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => { e.stopPropagation(); setEditingMeeting(meeting); setFormOpen(true); }}
                            >
                              <PencilSimple weight="duotone" className="size-3.5" />
                            </Button>
                            {isExpanded ? <CaretUp weight="bold" className="size-4 text-muted-foreground" /> : <CaretDown weight="bold" className="size-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <Separator />
                            <MeetingDetail meeting={meeting} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <ChatText weight="duotone" className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {meetings.length === 0 ? "아직 회의가 없습니다" : "조건에 맞는 회의가 없습니다"}
            </p>
          </motion.div>
        )}

        {/* Form */}
        {formOpen && (
          <MeetingFormDialog
            key={editingMeeting?.id ?? "new"}
            open={formOpen}
            onOpenChange={setFormOpen}
            meeting={editingMeeting}
          />
        )}
      </div>
    </div>
  );
}
