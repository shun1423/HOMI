"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  MapPin,
  CaretRight,
  Plus,
  SpinnerGap,
  Buildings,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserProjects, useCreateProject } from "@/lib/queries";
import { useAppStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Create Project Dialog
// ---------------------------------------------------------------------------

function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const createProject = useCreateProject();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("집 이름을 입력해주세요.");
      return;
    }
    createProject.mutate(
      {
        name: name.trim(),
        address: address.trim() || undefined,
      },
      {
        onSuccess: (project) => {
          toast.success(`"${project.name}" 프로젝트가 생성되었습니다.`);
          useAppStore.getState().setProjectId(project.id);
          onOpenChange(false);
          setName("");
          setAddress("");
          router.push("/app");
        },
        onError: () => {
          toast.error("프로젝트 생성에 실패했습니다.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 집 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">집 이름</Label>
            <Input
              id="project-name"
              placeholder="예: 포천 한옥, 서울 아파트..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  handleSubmit();
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-address">주소 (선택)</Label>
            <div className="relative">
              <MapPin
                size={16}
                weight="duotone"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="project-address"
                placeholder="예: 경기도 포천시..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={createProject.isPending}>
            {createProject.isPending ? (
              <>
                <SpinnerGap size={14} className="animate-spin" />
                생성 중...
              </>
            ) : (
              "추가"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ProjectCard({
  project,
  index,
  onClick,
}: {
  project: {
    id: string;
    name: string;
    address: string | null;
    space_count: number;
    progress: number;
  };
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
        onClick={onClick}
      >
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <House size={24} weight="duotone" className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-tight">{project.name}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {project.address && (
                <>
                  <MapPin size={12} weight="duotone" />
                  <span className="truncate">{project.address}</span>
                  <span>·</span>
                </>
              )}
              <span>{project.space_count}개 공간</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-1"
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.08 }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-primary">
                {project.progress}%
              </span>
            </div>
          </div>
          <CaretRight
            size={20}
            weight="bold"
            className="shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-16"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
        <Buildings size={40} weight="duotone" className="text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold">첫 번째 집을 등록하세요</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          인테리어 프로젝트를 만들고
          <br />
          AI와 함께 관리를 시작해보세요.
        </p>
      </div>
      <Button size="lg" onClick={onAdd} className="gap-2">
        <Plus size={18} weight="bold" />
        새 집 추가
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function ProjectsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 py-5">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects, isLoading } = useUserProjects();

  const handleSelectProject = (projectId: string) => {
    useAppStore.getState().setProjectId(projectId);
    router.push("/app");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-1 text-center"
      >
        <h1 className="text-2xl font-bold tracking-tight">내 집 목록</h1>
        <p className="text-sm text-muted-foreground">
          터를 가꾸는 친구, HOMI
        </p>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <ProjectsSkeleton />
      ) : !projects || projects.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <AnimatePresence mode="wait">
          <div className="space-y-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                onClick={() => handleSelectProject(project.id)}
              />
            ))}

            {/* Add button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + projects.length * 0.08,
                duration: 0.4,
              }}
            >
              <button
                onClick={() => setCreateOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 py-5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                <Plus size={18} weight="bold" />
                새 집 추가
              </button>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* Create Dialog */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
