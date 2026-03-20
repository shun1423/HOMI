"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  NotionLogo,
  ArrowsClockwise,
  Export,
  DownloadSimple,
  CheckCircle,
  Lightning,
  CloudCheck,
  FileText,
  ListChecks,
  CurrencyKrw,
  Buildings,
  Brain,
  ArrowRight,
  SpinnerGap,
  Sparkle,
  LinkBreak,
  CloudSlash,
  Warning,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotionConnection,
  useUpdateNotionConnection,
  useDeleteNotionConnection,
} from "@/lib/queries";
import { useAppStore } from "@/lib/store";

// --- Types ---

interface NotionPage {
  id: string;
  title: string;
  lastEdited: string | null;
  url: string | null;
}

interface AnalysisResult {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  analyzedAt: string;
}

// --- Export items ---

const EXPORT_ITEMS = [
  {
    id: "board",
    title: "프로젝트 보드",
    description: "방별 현황, 진행률, 할 일 목록",
    icon: <ListChecks weight="duotone" className="size-5 text-blue-500" />,
  },
  {
    id: "costs",
    title: "비용 정리",
    description: "예산 현황, 지출 내역, 카테고리별 분류",
    icon: <CurrencyKrw weight="duotone" className="size-5 text-emerald-500" />,
  },
  {
    id: "contractors",
    title: "업체 목록",
    description: "시공 업체 정보, 연락처, 평점, 견적",
    icon: <Buildings weight="duotone" className="size-5 text-amber-500" />,
  },
];

// --- Page ---

export default function NotionPage() {
  const projectId = useAppStore((s) => s.projectId);
  const { data: connection, isLoading } = useNotionConnection();
  const updateConnection = useUpdateNotionConnection();
  const deleteConnection = useDeleteNotionConnection();

  const isConnected = !!connection;

  // Notion pages from API
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("");

  // Export/Import
  const [exporting, setExporting] = useState<string | null>(null);

  // Fetch Notion pages when connected
  useEffect(() => {
    if (!isConnected || !projectId) return;
    setPagesLoading(true);
    fetch(`/api/notion/pages?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setNotionPages(data.pages ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setPagesLoading(false));
  }, [isConnected, projectId]);

  // Connect to Notion (OAuth)
  function handleConnect() {
    window.location.href = `/api/notion/auth?projectId=${projectId}`;
  }

  // Sync
  function handleSync() {
    if (!connection) return;
    updateConnection.mutate(
      { id: connection.id, last_synced_at: new Date().toISOString() },
      {
        onSuccess: () => {
          toast.success("동기화 완료");
          // Refresh pages
          fetch(`/api/notion/pages?projectId=${projectId}`)
            .then((r) => r.json())
            .then((data) => setNotionPages(data.pages ?? []))
            .catch(() => {});
        },
        onError: () => toast.error("동기화 실패"),
      }
    );
  }

  // Export (placeholder — needs Notion API write)
  function handleExport(id: string, title: string) {
    setExporting(id);
    setTimeout(() => {
      setExporting(null);
      toast("준비 중", { description: `"${title}" 내보내기는 Notion OAuth 연결 후 사용 가능합니다` });
    }, 500);
  }

  // AI Analysis — real API call
  async function handleAnalyze() {
    if (!projectId) return;
    if (notionPages.length === 0) {
      toast.error("분석할 Notion 페이지가 없습니다");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/notion/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pageIds: notionPages.slice(0, 5).map((p) => p.id),
          prompt: analysisPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "분석 실패");
        return;
      }

      setAnalysis(data);
      toast.success("AI 분석 완료");
    } catch {
      toast.error("분석 중 오류 발생");
    } finally {
      setAnalyzing(false);
    }
  }

  // Disconnect
  function handleDisconnect() {
    if (!connection) return;
    if (!confirm("Notion 연결을 해제하시겠습니까?")) return;
    deleteConnection.mutate(connection.id, {
      onSuccess: () => {
        toast.success("연결이 해제되었습니다");
        setNotionPages([]);
        setAnalysis(null);
      },
      onError: () => toast.error("해제 실패"),
    });
  }

  function formatSyncTime(ts: string | null) {
    if (!ts) return "없음";
    try {
      return new Date(ts).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return ts; }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
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
            <h1 className="text-xl font-bold">Notion 연동</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Notion 워크스페이스와 데이터 동기화</p>
          </div>
          {isConnected && (
            <Button
              size="default"
              onClick={handleSync}
              disabled={updateConnection.isPending}
            >
              {updateConnection.isPending ? (
                <SpinnerGap weight="bold" className="size-4 animate-spin" />
              ) : (
                <ArrowsClockwise weight="bold" className="size-4" />
              )}
              {updateConnection.isPending ? "동기화 중..." : "동기화"}
            </Button>
          )}
        </motion.div>

        {/* Connection Status */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="size-12 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                <NotionLogo weight="duotone" className="size-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {isConnected ? connection.workspace_name ?? "Notion 워크스페이스" : "연결되지 않음"}
                  </h3>
                  {isConnected ? (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                      <CloudCheck weight="duotone" className="size-3 mr-0.5" /> 연결됨
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-muted text-muted-foreground border-0">
                      <CloudSlash weight="duotone" className="size-3 mr-0.5" /> 미연결
                    </Badge>
                  )}
                </div>
                {isConnected && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    마지막 동기화: {formatSyncTime(connection.last_synced_at)}
                  </p>
                )}
              </div>
              {!isConnected && (
                <Button size="sm" onClick={handleConnect}>
                  <NotionLogo weight="duotone" className="size-4" />
                  연결하기
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {!isConnected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center py-12">
            <NotionLogo weight="duotone" className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Notion 워크스페이스를 연결하면</p>
            <p className="text-xs text-muted-foreground">프로젝트 데이터 내보내기, Notion 페이지 가져오기, AI 분석을 사용할 수 있습니다</p>
          </motion.div>
        )}

        {isConnected && (
          <>
            {/* Export */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Export weight="duotone" className="size-5 text-primary" />
                    Notion으로 내보내기
                  </CardTitle>
                  <CardDescription>프로젝트 데이터를 Notion 페이지로 내보냅니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {EXPORT_ITEMS.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium">{item.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{item.description}</p>
                      </div>
                      <Button size="sm" variant="outline" disabled={exporting === item.id} onClick={() => handleExport(item.id, item.title)}>
                        {exporting === item.id ? <SpinnerGap weight="bold" className="size-3.5 animate-spin" /> : <ArrowRight weight="bold" className="size-3.5" />}
                        {exporting === item.id ? "내보내는 중" : "내보내기"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Notion Pages */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DownloadSimple weight="duotone" className="size-5 text-primary" />
                    Notion 페이지
                  </CardTitle>
                  <CardDescription>
                    워크스페이스에서 접근 가능한 페이지 ({notionPages.length}개)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pagesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : notionPages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      접근 가능한 페이지가 없습니다
                    </p>
                  ) : (
                    notionPages.map((page) => (
                      <div key={page.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                        <FileText weight="duotone" className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{page.title}</span>
                          {page.lastEdited && (
                            <p className="text-[10px] text-muted-foreground">
                              수정: {new Date(page.lastEdited).toLocaleDateString("ko-KR")}
                            </p>
                          )}
                        </div>
                        {page.url && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => window.open(page.url!, "_blank")}
                          >
                            <ArrowSquareOut weight="duotone" className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <Separator />

            {/* AI Analysis */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="ring-1 ring-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Brain weight="duotone" className="size-5 text-primary" />
                        AI 분석
                      </CardTitle>
                      <CardDescription>Notion 데이터를 AI가 분석한 프로젝트 인사이트</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      disabled={analyzing || notionPages.length === 0}
                      onClick={handleAnalyze}
                    >
                      {analyzing ? <SpinnerGap weight="bold" className="size-3.5 animate-spin" /> : <Sparkle weight="duotone" className="size-3.5" />}
                      {analyzing ? "분석 중..." : "분석하기"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="분석 요청 (예: 예산 현황 요약해줘)"
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !analyzing) handleAnalyze(); }}
                  />

                  {analysis && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="bg-primary/5 rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Lightning weight="duotone" className="size-4 text-primary" /> 요약
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                      </div>

                      {analysis.keyFindings.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">주요 발견사항</h4>
                          <div className="space-y-2">
                            {analysis.keyFindings.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle weight="duotone" className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.recommendations.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-semibold mb-2">AI 추천사항</h4>
                            <div className="space-y-2">
                              {analysis.recommendations.map((r, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <Sparkle weight="duotone" className="size-4 text-amber-500 shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <p className="text-[10px] text-muted-foreground text-right">분석 시점: {analysis.analyzedAt}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <Separator />

            {/* Disconnect */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-sm font-medium text-destructive">연결 해제</h4>
                    <p className="text-[11px] text-muted-foreground">Notion 워크스페이스 연결을 해제합니다</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={deleteConnection.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleteConnection.isPending ? (
                      <SpinnerGap weight="bold" className="size-3.5 animate-spin" />
                    ) : (
                      <LinkBreak weight="bold" className="size-3.5" />
                    )}
                    {deleteConnection.isPending ? "해제 중..." : "연결 해제"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
