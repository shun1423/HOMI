"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  User,
  House,
  Palette,
  NotionLogo,
  UsersThree,
  Info,
  GearSix,
  Sun,
  Moon,
  Desktop,
  ArrowRight,
  MapPin,
  PencilSimple,
  Plus,
  Trash,
  EnvelopeSimple,
  Crown,
  UserPlus,
  SpinnerGap,
  Check,
  FloppyDisk,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useProject, useUpdateProject } from "@/lib/queries";
import { useAppStore } from "@/lib/store";

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  name: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const projectId = useAppStore((s) => s.projectId);
  const { data: project } = useProject();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const updateProject = useUpdateProject();

  // Current user
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? "",
        });
      }
    });
  }, []);

  // Members — fetch via server API (admin API only works server-side)
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/members?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members ?? []);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setMembersLoading(false));
  }, [projectId]);

  // Project edit
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectAddress, setProjectAddress] = useState("");

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description ?? "");
      setProjectAddress(project.address ?? "");
    }
  }, [project]);

  const handleSaveProject = () => {
    if (!projectName.trim()) { toast.error("이름을 입력하세요"); return; }
    updateProject.mutate(
      { id: projectId!, name: projectName.trim(), description: projectDescription || undefined, address: projectAddress || undefined } as Parameters<typeof updateProject.mutate>[0],
      {
        onSuccess: () => { toast.success("저장되었습니다"); setEditingProject(false); },
        onError: () => toast.error("저장 실패"),
      }
    );
  };

  // Invite member
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("이메일을 입력하세요"); return; }
    setInviteLoading(true);
    try {
      const supabase = createClient();

      // Find user by email — query auth.users is not possible from client
      // Approach: try to find in project_members or create an invitation
      // For now: use Supabase admin API to find user, or create user if not exists

      // Simple approach: lookup via a custom RPC or just try to add
      // We'll use the REST API to find the user
      const { data: existingUsers } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId!);

      // Try to find user by signing them up (if they don't exist, they get an invite email)
      // Actually, simplest: we need the user's UUID. Let's try auth.admin
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), projectId }),
      });

      if (!response.ok) {
        const err = await response.json();
        toast.error(err.message || "초대 실패");
        return;
      }

      toast.success(`${inviteEmail}님을 초대했습니다`);
      setInviteOpen(false);
      setInviteEmail("");

      // Refresh members
      fetch(`/api/members?projectId=${projectId}`)
        .then((res) => res.json())
        .then((data) => setMembers(data.members ?? []))
        .catch(() => {});
    } catch {
      toast.error("초대 중 오류가 발생했습니다");
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName}님을 이 집에서 내보내시겠습니까?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("project_members").delete().eq("id", memberId);
    if (error) { toast.error("멤버 삭제 실패"); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success(`${memberName}님을 내보냈습니다`);
  };

  const themes = [
    { value: "light", label: "라이트", icon: <Sun weight="duotone" className="size-4" /> },
    { value: "dark", label: "다크", icon: <Moon weight="duotone" className="size-4" /> },
    { value: "system", label: "시스템", icon: <Desktop weight="duotone" className="size-4" /> },
  ];

  const isOwner = members.find((m) => m.user_id === currentUser?.id)?.role === "owner";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <GearSix weight="duotone" className="size-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">설정</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">프로젝트 및 앱 설정 관리</p>
            </div>
          </div>
        </motion.div>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User weight="duotone" className="size-5 text-primary" />
                프로필
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <User weight="duotone" className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{currentUser?.name ?? "..."}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email ?? "..."}</p>
                </div>
                {isOwner && <Badge className="ml-auto text-[10px]">소유자</Badge>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Project Info */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <House weight="duotone" className="size-5 text-primary" />
                  집 정보
                </CardTitle>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setEditingProject(!editingProject)}
                  >
                    <PencilSimple size={14} />
                    {editingProject ? "취소" : "편집"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingProject ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">집 이름</Label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">설명</Label>
                    <Input
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="예: 포천 한옥 인테리어 프로젝트"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">주소</Label>
                    <Input
                      value={projectAddress}
                      onChange={(e) => setProjectAddress(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="경기도 포천시..."
                    />
                  </div>
                  <Button size="sm" className="gap-1" onClick={handleSaveProject} disabled={updateProject.isPending}>
                    <FloppyDisk size={14} />저장
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">이름</span>
                    <span className="text-sm font-medium">{project?.name ?? "..."}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">설명</span>
                    <span className="text-sm font-medium">{project?.description ?? "미설정"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin weight="duotone" className="size-3.5" />주소
                    </span>
                    <span className="text-sm font-medium">{project?.address ?? "미설정"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Members */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersThree weight="duotone" className="size-5 text-primary" />
                  멤버
                </CardTitle>
                {isOwner && (
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setInviteOpen(true)}>
                    <UserPlus size={14} />초대
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {membersLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <SpinnerGap size={16} className="animate-spin" /> 불러오는 중...
                </div>
              ) : (
                members.map((member, i) => (
                  <div key={member.id}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                        {member.role === "owner" ? (
                          <Crown weight="duotone" className="size-4 text-amber-500" />
                        ) : (
                          <User weight="duotone" className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge
                        variant={member.role === "owner" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {member.role === "owner" ? "소유자" : "멤버"}
                      </Badge>
                      {isOwner && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id, member.name)}
                        >
                          <Trash size={14} />
                        </Button>
                      )}
                    </div>
                    {i < members.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette weight="duotone" className="size-5 text-primary" />
                테마
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <Button
                    key={t.value}
                    variant={mounted && theme === t.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(t.value)}
                    className="flex-1"
                  >
                    {t.icon}
                    {t.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notion */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Link href="/app/notion">
            <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/10">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                  <NotionLogo weight="duotone" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium">Notion 연동</h4>
                  <p className="text-[11px] text-muted-foreground">워크스페이스 연결 및 동기화</p>
                </div>
                <ArrowRight weight="bold" className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Version */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Info weight="duotone" className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">HOMI</p>
                <p className="text-[11px] text-muted-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"} · 터를 가꾸는 친구</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <UserPlus size={18} weight="duotone" className="text-primary" />
              멤버 초대
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">이메일</Label>
              <div className="relative">
                <EnvelopeSimple size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className="h-9 pl-9 text-sm"
                  type="email"
                  onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                가입된 사용자의 이메일을 입력하세요
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>취소</Button>
            <Button size="sm" className="gap-1" onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? <SpinnerGap size={14} className="animate-spin" /> : <Check size={14} />}
              초대
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
