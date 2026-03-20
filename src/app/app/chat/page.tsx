"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChatCircleDots,
  PaperPlaneTilt,
  Paperclip,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  Robot,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useChatMessages } from "@/lib/queries";
import { useSendMessage } from "@/lib/chat";
import type { ChatMessage } from "@/types/database";

// ---------------------------------------------------------------------------
// Action card for tool results (same logic as floating chatbot)
// ---------------------------------------------------------------------------

function ActionCard({ action }: { action: Record<string, unknown> }) {
  const type = action.type as string;
  const space = action.space as string;
  const category = action.category as string;

  if (type === "update_board_item") {
    const status = action.status as string | undefined;
    const decision = action.decision_content as string | undefined;
    const statusLabels: Record<string, string> = {
      undecided: "미정",
      has_candidates: "후보있음",
      decided: "결정됨",
      purchased: "구매완료",
      installed: "설치완료",
    };

    return (
      <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/50">
        <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
          <CheckCircle size={16} weight="fill" />
          <span>
            {space} &gt; {category}
          </span>
          {decision && <span>을(를) &quot;{decision}&quot;로 기록</span>}
        </div>
        {status && (
          <p className="mt-1 text-[11px] text-green-600 dark:text-green-500">
            상태: {statusLabels[status] || status}
          </p>
        )}
      </div>
    );
  }

  if (type === "create_board_item") {
    return (
      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/50">
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
          <CheckCircle size={16} weight="fill" />
          <span>
            {space} &gt; {category} 항목 추가됨
          </span>
        </div>
      </div>
    );
  }

  if (type === "record_expense") {
    const costType = action.cost_type as string;
    const amount = action.amount as number;
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <CheckCircle size={16} weight="fill" />
          <span>
            {space} &gt; {category} {costType} {amount?.toLocaleString()}원 기록
          </span>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Message bubble (full-screen version — slightly larger than floating)
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Robot size={16} weight="duotone" className="text-primary" />
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-secondary text-secondary-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
          {!isUser && msg.action_taken && <ActionCard action={msg.action_taken} />}
        </div>
        <p
          className={`mt-1 px-1 text-[10px] text-muted-foreground/50 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {new Date(msg.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quick action chips
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  "자재 결정",
  "비용 기록",
  "타일 가격 비교해줘",
  "이번주 할일 알려줘",
  "시공 질문",
];

// ---------------------------------------------------------------------------
// Full-screen chat page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages();
  const sendMessage = useSendMessage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  async function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || sendMessage.isPending) return;

    setInput("");

    try {
      await sendMessage.mutateAsync({
        message: messageText,
        userId: null,
      });
    } catch (error) {
      toast.error("메시지 전송에 실패했습니다.", {
        description:
          error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <ChatCircleDots size={18} weight="duotone" className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold">AI 어시스턴트</h1>
                <Badge variant="secondary" className="text-[10px]">
                  AI 채팅
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                자재 결정, 비용 기록, 시공 질문 등
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-medium text-success">온라인</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {/* Welcome message */}
          {!hasMessages && !isLoadingMessages && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-sm text-center py-12"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Robot size={28} weight="duotone" className="text-primary" />
              </div>
              <h2 className="text-base font-semibold mb-1">무엇을 도와드릴까요?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                자재 결정, 비용 기록, 시공 질문 등
                <br />
                무엇이든 자연스럽게 말씀해 주세요.
              </p>

              {/* Quick action chips when no messages */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((text) => (
                  <button
                    key={text}
                    onClick={() => handleSend(text)}
                    disabled={sendMessage.isPending}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading messages spinner */}
          {isLoadingMessages && (
            <div className="flex items-center justify-center py-12">
              <CircleNotch size={24} className="animate-spin text-primary" />
            </div>
          )}

          {/* Chat messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>

          {/* AI thinking indicator */}
          {sendMessage.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Robot size={16} weight="duotone" className="text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                <div className="flex items-center gap-2">
                  <CircleNotch size={16} className="animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    생각하고 있어요...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error indicator */}
          {sendMessage.isError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <WarningCircle size={16} weight="duotone" className="text-destructive" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-destructive/5 px-4 py-2.5">
                <p className="text-xs text-destructive">
                  오류가 발생했습니다. 다시 시도해주세요.
                </p>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {/* Quick action chips when there are messages */}
          {hasMessages && !sendMessage.isPending && (
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {QUICK_ACTIONS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  disabled={sendMessage.isPending}
                  className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">
            <button className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Paperclip size={18} weight="duotone" />
            </button>
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                disabled={sendMessage.isPending}
                rows={1}
                className="w-full resize-none rounded-xl border border-input bg-secondary/50 px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMessage.isPending}
              className="shrink-0 rounded-xl bg-primary p-2.5 text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {sendMessage.isPending ? (
                <CircleNotch size={18} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={18} weight="fill" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
