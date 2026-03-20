import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys, useSpaces, useBoardItems } from "@/lib/queries";
import type { ChatIntent } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROJECT_ID = "a1b2c3d4-0000-0000-0000-000000000001";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatApiResponse {
  role: "assistant";
  content: string;
  intent: ChatIntent;
  action_taken: Record<string, unknown> | null;
}

interface SendMessageInput {
  message: string;
  userId?: string | null;
}

// ---------------------------------------------------------------------------
// Hook: useSendMessage
// ---------------------------------------------------------------------------
export function useSendMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: spaces } = useSpaces();
  const { data: boardItems } = useBoardItems();

  return useMutation({
    mutationFn: async ({ message, userId }: SendMessageInput) => {
      // 1. Save user message to chat_messages
      const { error: userMsgError } = await supabase
        .from("chat_messages")
        .insert({
          project_id: PROJECT_ID,
          user_id: userId || null,
          role: "user" as const,
          content: message,
          intent: null,
          action_taken: null,
        });

      if (userMsgError) throw userMsgError;

      // 2. Build project context for the API
      const spacesContext = (spaces ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      }));

      const boardItemsContext = (boardItems ?? []).map((bi) => ({
        id: bi.id,
        space_id: bi.space_id,
        space_name:
          spacesContext.find((s) => s.id === bi.space_id)?.name ?? "",
        category: bi.category,
        status: bi.status,
        decision_content: bi.decision_content,
        estimated_budget: bi.estimated_budget,
        cost_material: bi.cost_material,
        cost_labor: bi.cost_labor,
        cost_delivery: bi.cost_delivery,
      }));

      // 3. Call the chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          projectContext: {
            spaces: spacesContext,
            boardItems: boardItemsContext,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `API 호출 실패: ${response.status}`
        );
      }

      const assistantResponse: ChatApiResponse = await response.json();

      // 4. Save assistant response to chat_messages
      const { error: assistantMsgError } = await supabase
        .from("chat_messages")
        .insert({
          project_id: PROJECT_ID,
          user_id: null,
          role: "assistant" as const,
          content: assistantResponse.content,
          intent: assistantResponse.intent,
          action_taken: assistantResponse.action_taken,
        });

      if (assistantMsgError) throw assistantMsgError;

      return assistantResponse;
    },
    onSuccess: (data) => {
      // Always invalidate chat messages
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages });

      // If action was taken, invalidate board queries so UI updates
      if (data.action_taken) {
        queryClient.invalidateQueries({ queryKey: queryKeys.boardItems() });
        queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
      }
    },
  });
}
