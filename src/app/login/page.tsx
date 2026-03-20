"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  EnvelopeSimple,
  Lock,
  SpinnerGap,
  UserPlus,
  SignIn,
  User,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Schemas ───

const loginSchema = z.object({
  email: z.email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요"),
    email: z.email("올바른 이메일을 입력해주세요"),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
    confirmPassword: z.string().min(6, "비밀번호를 다시 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

// ─── Login Form ───

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error("로그인 실패", {
          description:
            error.message === "Invalid login credentials"
              ? "이메일 또는 비밀번호가 올바르지 않습니다."
              : error.message,
        });
        return;
      }

      toast.success("로그인 성공");
      router.push("/home");
      router.refresh();
    } catch {
      toast.error("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">이메일</Label>
          <div className="relative">
            <EnvelopeSimple
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-10 pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">비밀번호</Label>
          <div className="relative">
            <Lock
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="login-password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              className="h-10 pl-9"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              로그인 중...
            </>
          ) : (
            <>
              <SignIn size={16} weight="bold" />
              로그인
            </>
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onSwitch}
          className="text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          계정이 없으신가요? <span className="font-semibold text-primary">회원가입</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Signup Form ───

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupForm) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name },
        },
      });

      if (error) {
        toast.error("회원가입 실패", { description: error.message });
        return;
      }

      toast.success("회원가입 완료!", {
        description: "로그인해주세요.",
      });
      onSwitch(); // 로그인 폼으로 전환
    } catch {
      toast.error("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">이름</Label>
          <div className="relative">
            <User
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-name"
              type="text"
              placeholder="이름을 입력하세요"
              autoComplete="name"
              className="h-10 pl-9"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">이메일</Label>
          <div className="relative">
            <EnvelopeSimple
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-10 pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">비밀번호</Label>
          <div className="relative">
            <Lock
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-password"
              type="password"
              placeholder="6자 이상 입력하세요"
              autoComplete="new-password"
              className="h-10 pl-9"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm">비밀번호 확인</Label>
          <div className="relative">
            <Lock
              size={16}
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-confirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              className="h-10 pl-9"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              가입 중...
            </>
          ) : (
            <>
              <UserPlus size={16} weight="bold" />
              회원가입
            </>
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onSwitch}
          className="text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          이미 계정이 있으신가요? <span className="font-semibold text-primary">로그인</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ───

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <House size={28} weight="duotone" className="text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">HOMI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              터를 가꾸는 친구 · Home, I
            </p>
          </div>
        </motion.div>

        {/* Form (animated switch) */}
        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <LoginForm onSwitch={() => setMode("signup")} />
          ) : (
            <SignupForm onSwitch={() => setMode("login")} />
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 text-center text-xs text-muted-foreground"
        >
          AI 기반 인테리어 관리
        </motion.p>
      </motion.div>
    </div>
  );
}
