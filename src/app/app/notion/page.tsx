"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  NotionLogo,
  ArrowsClockwise,
  CheckCircle,
  Lightning,
  CloudCheck,
  FileText,
  Brain,
  SpinnerGap,
  Sparkle,
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

// --- Page ---

export default function NotionPage() {
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("");

  // Fetch pages on mount
  useEffect(() => {
    setPagesLoading(true);
    fetch("/api/notion/pages")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setIsConnected(false);
        } else {
          setIsConnected(true);
          setNotionPages(data.pages ?? []);
        }
      })
      .catch(() => setIsConnected(false))
      .finally(() => setPagesLoading(false));
  }, []);

  function handleRefresh() {
    setPagesLoading(true);
    fetch("/api/notion/pages")
      .then((r) => r.json())
      .then((data) => setNotionPages(data.pages ?? []))
      .catch(() => {})
      .finally(() => setPagesLoading(false));
    toast.success("새로고침 완료");
  }

  async function handleAnalyze() {
    if (notionPages.length === 0) { toast.error("분석할 페이지가 없습니다"); return; }

    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/notion/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageIds: notionPages.slice(0, 5).map((p) => p.id),
          prompt: analysisPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) { toast.error(data.error || "분석 실패"); return; }
      setAnalysis(data);
      toast.success("AI 분석 완료");
    } catch {
      toast.error("분석 중 오류 발생");
    } finally {
      setAnalyzing(false);
    }
  }

  if (pagesLoading) {
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
            <p className="text-sm text-muted-foreground mt-0.5">Notion 워크스페이스 데이터 조회 및 AI 분석</p>
          </div>
          {isConnected && (
            <Button size="default" onClick={handleRefresh} disabled={pagesLoading}>
              <ArrowsClockwise weight="bold" className="size-4" />
              새로고침
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
                    {isConnected ? "Notion 연결됨" : "연결되지 않음"}
                  </h3>
                  {isConnected ? (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                      <CloudCheck weight="duotone" className="size-3 mr-0.5" /> 연결됨
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-muted text-muted-foreground border-0">미연결</Badge>
                  )}
                </div>
                {isConnected && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {notionPages.length}개 페이지 접근 가능
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!isConnected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center py-12">
            <NotionLogo weight="duotone" className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Notion API 키가 설정되지 않았습니다</p>
            <p className="text-xs text-muted-foreground">환경변수에 NOTION_API_KEY를 추가해주세요</p>
          </motion.div>
        )}

        {isConnected && (
          <>
            {/* Pages */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText weight="duotone" className="size-5 text-primary" />
                    Notion 페이지
                  </CardTitle>
                  <CardDescription>{notionPages.length}개 페이지</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notionPages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">접근 가능한 페이지가 없습니다. Notion에서 통합에 페이지를 연결해주세요.</p>
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
                          <Button variant="ghost" size="icon-xs" onClick={() => window.open(page.url!, "_blank")}>
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="ring-1 ring-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Brain weight="duotone" className="size-5 text-primary" />
                        AI 분석
                      </CardTitle>
                      <CardDescription>Notion 페이지 내용을 AI가 분석합니다</CardDescription>
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
          </>
        )}
      </div>
    </div>
  );
}
