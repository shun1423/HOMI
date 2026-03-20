"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import {
  House,
  GridFour,
  Blueprint,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoomCardsView } from "./room-cards";
import { RoomDetailView } from "./room-detail";
import { type Room } from "./mock-data";

const FloorPlanView = dynamic(
  () => import("./floor-plan").then((mod) => mod.FloorPlanView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[450px] items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">평면도 로딩 중...</p>
        </div>
      </div>
    ),
  }
);

function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <Badge variant="secondary" className="text-[10px]">
        {badge}
      </Badge>
    </div>
  );
}

export default function BoardShowcasePage() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {selectedRoom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoom(null)}
              >
                <ArrowLeft size={16} />
              </Button>
            )}
            <House size={22} weight="duotone" className="text-primary" />
            <span className="text-sm font-bold">프로젝트 보드</span>
            <Badge variant="secondary" className="text-[10px]">
              디자인 쇼케이스
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          {selectedRoom ? (
            <RoomDetailView
              key="detail"
              room={selectedRoom}
              onBack={() => setSelectedRoom(null)}
            />
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Intro */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">프로젝트 보드</h1>
                <p className="text-sm text-muted-foreground">
                  방 카드로 전체 현황을 한눈에 보고, 평면도에서 배치를 관리하세요.
                  방을 클릭하면 상세 화면으로 이동합니다.
                </p>
              </div>

              {/* Section 1: Room Cards */}
              <section className="space-y-4">
                <SectionHeader
                  icon={<GridFour size={18} weight="duotone" />}
                  title="방별 현황"
                  badge="카드 뷰"
                />
                <RoomCardsView onSelectRoom={setSelectedRoom} />
              </section>

              <Separator />

              {/* Section 2: Floor Plan */}
              <section className="space-y-4">
                <SectionHeader
                  icon={<Blueprint size={18} weight="duotone" />}
                  title="평면도"
                  badge="에디터"
                />
                <p className="text-xs text-muted-foreground">
                  방을 드래그로 이동하고, 꼭짓점/변을 드래그해서 크기를 조절하세요.
                  문/창문 도구로 벽에 클릭하면 추가됩니다. 스크롤로 확대/축소.
                </p>
                <FloorPlanView onSelectRoom={setSelectedRoom} />
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
