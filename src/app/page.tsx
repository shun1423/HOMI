"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  House,
  PaintBrush,
  Hammer,
  MapPin,
  ChatCircleDots,
  Camera,
  Receipt,
  Users,
  Sun,
  Moon,
  Plus,
  Trash,
  ArrowRight,
  Check,
  Warning,
  Info,
  Lightning,
  Heart,
  Star,
  MagnifyingGlass,
  Bell,
  Gear,
  CaretRight,
  X,
} from "@phosphor-icons/react";
import {
  IconBuildingStore,
  IconCalendarEvent,
  IconChartBar,
  IconFileText,
  IconMoodSmile,
  IconPalette,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_MAP = {
  undecided: { label: "미결정", color: "bg-muted text-muted-foreground" },
  has_candidates: {
    label: "후보있음",
    color: "bg-warning/15 text-warning-foreground",
  },
  decided: { label: "결정됨", color: "bg-success/15 text-success" },
  purchased: { label: "구매완료", color: "bg-primary/15 text-primary" },
  installed: {
    label: "시공완료",
    color: "bg-chart-5/15 text-foreground",
  },
} as const;

type Status = keyof typeof STATUS_MAP;

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}
    >
      {status === "decided" && <Check size={12} weight="bold" />}
      {status === "installed" && <Lightning size={12} weight="bold" />}
      {s.label}
    </span>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
    >
      <Sun size={18} className="block dark:hidden" />
      <Moon size={18} className="hidden dark:block" />
    </motion.button>
  );
}

function HeroSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-accent/50 to-warning/8 p-8 md:p-12"
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-warning/8 blur-3xl" />
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1"
        >
          <House size={16} weight="duotone" className="text-primary" />
          <span className="text-xs font-semibold text-primary">
            HOMI
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-3 text-3xl font-bold tracking-tight md:text-5xl"
        >
          HOMI
          <br />
          <span className="bg-gradient-to-r from-primary via-chart-1 to-warning bg-clip-text text-transparent">
            터를 가꾸는 친구
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-md text-base text-muted-foreground md:text-lg"
        >
          AI와 함께하는 스마트한 인테리어 관리.
          <br />
          결정, 비용, 일정을 한 곳에서.
        </motion.p>
      </div>
    </motion.section>
  );
}

function ColorPalette() {
  const colors = [
    { name: "Primary", var: "bg-primary", text: "text-primary-foreground" },
    {
      name: "Secondary",
      var: "bg-secondary",
      text: "text-secondary-foreground",
    },
    { name: "Accent", var: "bg-accent", text: "text-accent-foreground" },
    { name: "Muted", var: "bg-muted", text: "text-muted-foreground" },
    {
      name: "Destructive",
      var: "bg-destructive",
      text: "text-white",
    },
    { name: "Success", var: "bg-success", text: "text-success-foreground" },
    { name: "Warning", var: "bg-warning", text: "text-warning-foreground" },
  ];

  const chartColors = [
    { name: "Chart 1", var: "bg-chart-1" },
    { name: "Chart 2", var: "bg-chart-2" },
    { name: "Chart 3", var: "bg-chart-3" },
    { name: "Chart 4", var: "bg-chart-4" },
    { name: "Chart 5", var: "bg-chart-5" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">컬러 시스템</h3>
      <p className="text-sm text-muted-foreground">
        한옥에서 영감을 받은 따뜻한 톤의 컬러 팔레트
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {colors.map((c) => (
          <motion.div
            key={c.name}
            whileHover={{ scale: 1.04 }}
            className={`flex h-20 items-end rounded-xl ${c.var} p-3 shadow-sm`}
          >
            <span className={`text-xs font-medium ${c.text}`}>{c.name}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        {chartColors.map((c) => (
          <div key={c.name} className="flex-1 space-y-1.5 text-center">
            <div className={`h-10 rounded-lg ${c.var}`} />
            <span className="text-[10px] text-muted-foreground">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographyShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">타이포그래피</h3>
      <p className="text-sm text-muted-foreground">
        Pretendard Variable (한국어) + Geist (영문)
      </p>
      <div className="space-y-3 rounded-xl bg-card p-6">
        <p className="text-4xl font-bold tracking-tight">
          화장실 세면대 결정
        </p>
        <p className="text-2xl font-semibold">마이크로 시멘트, 그레이 톤</p>
        <p className="text-lg text-muted-foreground">
          건식 화장실에 적합한 소재로, 방수 처리가 핵심입니다.
        </p>
        <p className="text-sm text-muted-foreground">
          The quick brown fox jumps over the lazy dog — Geist Sans
        </p>
        <p className="font-mono text-sm text-muted-foreground">
          const budget = 30_000_000; // Geist Mono
        </p>
      </div>
    </div>
  );
}

function IconShowcase() {
  const phosphorIcons = [
    { icon: <House size={24} weight="duotone" />, label: "홈" },
    { icon: <PaintBrush size={24} weight="duotone" />, label: "인테리어" },
    { icon: <Hammer size={24} weight="duotone" />, label: "시공" },
    { icon: <MapPin size={24} weight="duotone" />, label: "장소" },
    {
      icon: <ChatCircleDots size={24} weight="duotone" />,
      label: "채팅",
    },
    { icon: <Camera size={24} weight="duotone" />, label: "사진" },
    { icon: <Receipt size={24} weight="duotone" />, label: "비용" },
    { icon: <Users size={24} weight="duotone" />, label: "업자" },
    { icon: <MagnifyingGlass size={24} weight="duotone" />, label: "검색" },
    { icon: <Bell size={24} weight="duotone" />, label: "알림" },
    { icon: <Gear size={24} weight="duotone" />, label: "설정" },
    { icon: <Heart size={24} weight="duotone" />, label: "영감" },
  ];

  const tablerIcons = [
    { icon: <IconBuildingStore size={24} />, label: "매장" },
    { icon: <IconCalendarEvent size={24} />, label: "일정" },
    { icon: <IconChartBar size={24} />, label: "차트" },
    { icon: <IconFileText size={24} />, label: "문서" },
    { icon: <IconMoodSmile size={24} />, label: "평가" },
    { icon: <IconPalette size={24} />, label: "컬러" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">아이콘</h3>
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Phosphor Icons (duotone)
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {phosphorIcons.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-all hover:scale-110 hover:bg-accent hover:text-primary active:scale-95"
              >
                {item.icon}
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Tabler Icons
        </p>
        <div className="grid grid-cols-6 gap-2">
          {tablerIcons.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-all hover:scale-110 hover:bg-accent hover:text-primary active:scale-95"
              >
                {item.icon}
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">상태 배지</h3>
      <p className="text-sm text-muted-foreground">
        프로젝트 보드 항목 상태 시스템
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_MAP) as Status[]).map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">기본</Badge>
        <Badge variant="secondary">보조</Badge>
        <Badge variant="destructive">위험</Badge>
        <Badge variant="outline">아웃라인</Badge>
      </div>
    </div>
  );
}

function ButtonShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">버튼</h3>
      <div className="flex flex-wrap gap-3">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button>
            <Plus size={16} weight="bold" />
            공간 추가
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="secondary">
            <MagnifyingGlass size={16} />
            쇼룸 검색
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="outline">
            <ChatCircleDots size={16} />
            AI 채팅
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="ghost">
            <Gear size={16} />
            설정
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="destructive" size="sm">
            <Trash size={14} />
            삭제
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function ToastShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">토스트 알림 (Sonner)</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.success("화장실 바닥을 '마이크로 시멘트'로 결정했습니다.")
          }
        >
          <Check size={14} />
          성공
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.error("저장에 실패했습니다. 다시 시도해주세요.")}
        >
          <X size={14} />
          에러
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.warning("예산을 80% 이상 사용했습니다.")}
        >
          <Warning size={14} />
          경고
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("태수님이 거실 조명 후보를 추가했습니다.")
          }
        >
          <Info size={14} />
          정보
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 2000)),
              {
                loading: "사진 업로드 중...",
                success: "사진이 업로드되었습니다!",
                error: "업로드에 실패했습니다.",
              }
            )
          }
        >
          <Camera size={14} />
          Promise
        </Button>
      </div>
    </div>
  );
}

function AnimationShowcase() {
  const [items, setItems] = useState([
    { id: 1, name: "화장실", progress: 75 },
    { id: 2, name: "거실", progress: 40 },
    { id: 3, name: "안방", progress: 10 },
  ]);
  const [listParent] = useAutoAnimate();
  let nextId = 4;

  const addItem = () => {
    const spaces = ["부엌", "현관", "다용도실", "서재", "발코니"];
    const name = spaces[Math.floor(Math.random() * spaces.length)];
    setItems((prev) => [
      ...prev,
      { id: nextId++, name, progress: Math.floor(Math.random() * 100) },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">애니메이션</h3>
      <p className="text-sm text-muted-foreground">
        Motion (Framer Motion) + Auto Animate
      </p>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus size={14} />
            공간 추가
          </Button>
          <span className="text-xs text-muted-foreground">
            (Auto Animate으로 리스트 자동 전환)
          </span>
        </div>
        <div ref={listParent} className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-border"
            >
              <House size={18} weight="duotone" className="text-primary" />
              <span className="flex-1 text-sm font-medium">{item.name}</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="w-10 text-right text-xs text-muted-foreground">
                {item.progress}%
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">카드 컴포넌트</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-warning/20" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">화장실 세면대</CardTitle>
                <StatusBadge status="decided" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                분청 도자기 세면대로 결정. 한옥 분위기와 잘 어울림.
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">예산 200만원</span>
                <span className="font-medium text-success">실지출 150만원</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-chart-2/20 to-chart-3/20" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">거실 바닥</CardTitle>
                <StatusBadge status="has_candidates" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                원목 마루 vs 대리석 타일 비교 중. 쇼룸 방문 예정.
              </p>
              <div className="flex items-center gap-1">
                <Star size={14} weight="fill" className="text-warning" />
                <Star size={14} weight="fill" className="text-warning" />
                <Star size={14} weight="fill" className="text-warning" />
                <Star size={14} className="text-muted" />
                <Star size={14} className="text-muted" />
                <span className="ml-1 text-xs text-muted-foreground">
                  후보 2개
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-chart-5/20 to-destructive/10" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">안방 조명</CardTitle>
                <StatusBadge status="undecided" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                아직 결정 전. 한옥 분위기에 맞는 조명 리서치 필요.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <MagnifyingGlass size={14} />
                쇼룸 찾기
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function FormShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">입력 컴포넌트</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="search">장소 검색</Label>
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="search"
                placeholder="분청 세면대 쇼룸..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">예산 (원)</Label>
            <Input
              id="budget"
              type="number"
              placeholder="2,000,000"
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-border">
            <div className="space-y-0.5">
              <Label>다크 모드</Label>
              <p className="text-xs text-muted-foreground">
                테마를 전환합니다
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-border">
            <div className="space-y-0.5">
              <Label htmlFor="realtime">실시간 동기화</Label>
              <p className="text-xs text-muted-foreground">
                변경사항 즉시 반영
              </p>
            </div>
            <Switch id="realtime" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">로딩 스켈레톤</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-border">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  const [messages] = useState([
    {
      role: "user" as const,
      content: "화장실 세면대는 분청 도자기로 결정했어",
    },
    {
      role: "assistant" as const,
      content:
        '화장실 > 세면대를 "분청 도자기"로 기록할게요. 상태를 "결정됨"으로 변경합니다.',
      action: { space: "화장실", item: "세면대", value: "분청 도자기" },
    },
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">채팅 프리뷰</h3>
      <p className="text-sm text-muted-foreground">
        대화형 입력 → 프로젝트 보드 자동 반영
      </p>
      <div className="rounded-2xl bg-card ring-1 ring-border">
        <div className="space-y-4 p-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.3, duration: 0.4 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {"action" in msg && msg.action && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ delay: 0.8 }}
                      className="mt-2 rounded-lg bg-background/80 p-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Check
                          size={14}
                          weight="bold"
                          className="text-success"
                        />
                        <span className="font-medium text-foreground">
                          {msg.action.space} &gt; {msg.action.item}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span className="text-foreground">
                          {msg.action.value}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Separator />
        <div className="flex items-center gap-2 p-3">
          <Input
            placeholder="메시지를 입력하세요..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button size="sm">
            <ArrowRight size={16} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MatrixPreview() {
  const spaces = ["화장실", "거실", "안방", "부엌"];
  const categories = ["바닥", "벽", "천장", "조명", "설비"];
  const statuses: Status[][] = [
    ["decided", "has_candidates", "undecided", "undecided", "decided"],
    ["has_candidates", "decided", "undecided", "has_candidates", "undecided"],
    ["undecided", "undecided", "undecided", "undecided", "undecided"],
    ["decided", "decided", "undecided", "installed", "has_candidates"],
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">프로젝트 보드 매트릭스</h3>
      <p className="text-sm text-muted-foreground">
        공간 × 항목 매트릭스 뷰 프리뷰
      </p>
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                공간
              </th>
              {categories.map((cat) => (
                <th
                  key={cat}
                  className="px-3 py-2.5 text-center font-medium text-muted-foreground"
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spaces.map((space, i) => (
              <motion.tr
                key={space}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="border-b last:border-0"
              >
                <td className="px-4 py-3 font-medium">{space}</td>
                {statuses[i].map((status, j) => (
                  <td key={j} className="px-3 py-3 text-center">
                    <StatusBadge status={status} />
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LibraryList() {
  const libs = [
    { name: "Next.js 16", desc: "App Router + Turbopack" },
    { name: "Tailwind CSS v4", desc: "유틸리티 스타일링" },
    { name: "shadcn/ui", desc: "베이스 컴포넌트 (20개)" },
    { name: "Motion", desc: "애니메이션 엔진" },
    { name: "Phosphor Icons", desc: "메인 아이콘 (duotone)" },
    { name: "Tabler Icons", desc: "보조 아이콘" },
    { name: "Sonner", desc: "토스트 알림" },
    { name: "Vaul", desc: "모바일 드로어" },
    { name: "cmdk", desc: "커맨드 팔레트" },
    { name: "Tremor", desc: "차트/대시보드" },
    { name: "TanStack Query", desc: "서버 상태 관리" },
    { name: "Zustand", desc: "클라이언트 상태" },
    { name: "React Hook Form", desc: "폼 관리" },
    { name: "Zod", desc: "스키마 검증" },
    { name: "Auto Animate", desc: "자동 리스트 애니메이션" },
    { name: "nuqs", desc: "URL 상태 관리" },
    { name: "next-themes", desc: "다크모드" },
    { name: "date-fns", desc: "날짜 처리" },
    { name: "Pretendard", desc: "한국어 폰트" },
    { name: "Geist", desc: "영문 폰트" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">설치된 라이브러리 ({libs.length}개)</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {libs.map((lib, i) => (
          <motion.div
            key={lib.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl bg-card p-3 ring-1 ring-border"
          >
            <p className="text-xs font-semibold">{lib.name}</p>
            <p className="text-[10px] text-muted-foreground">{lib.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <House size={22} weight="duotone" className="text-primary" />
            <span className="text-sm font-bold">HOMI</span>
            <Badge variant="secondary" className="text-[10px]">
              쇼케이스
            </Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <HeroSection />

        <Tabs defaultValue="design" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="design">
              <IconPalette size={16} />
              디자인 시스템
            </TabsTrigger>
            <TabsTrigger value="components">
              <PaintBrush size={16} weight="duotone" />
              컴포넌트
            </TabsTrigger>
            <TabsTrigger value="preview">
              <House size={16} weight="duotone" />
              기능 프리뷰
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="mt-6 space-y-10">
            <ColorPalette />
            <Separator />
            <TypographyShowcase />
            <Separator />
            <IconShowcase />
            <Separator />
            <LibraryList />
          </TabsContent>

          <TabsContent value="components" className="mt-6 space-y-10">
            <StatusShowcase />
            <Separator />
            <ButtonShowcase />
            <Separator />
            <FormShowcase />
            <Separator />
            <ToastShowcase />
            <Separator />
            <AnimationShowcase />
            <Separator />
            <SkeletonShowcase />
          </TabsContent>

          <TabsContent value="preview" className="mt-6 space-y-10">
            <MatrixPreview />
            <Separator />
            <ChatPreview />
            <Separator />
            <CardShowcase />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        HOMI — AI 기반 인테리어 관리
      </footer>
    </div>
  );
}
