"use client";

import { useState, useRef, useCallback } from "react";

export interface AskAiMessage {
  role: "user" | "assistant";
  content: string;
}

export function useAskAi(projectId: string, bidContext?: string, authToken?: string) {
  const [messages, setMessages] = useState<AskAiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<AskAiMessage[]>([]);
  messagesRef.current = messages;

  const sendChat = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;
      const history = messagesRef.current;
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setIsLoading(true);
      try {
        const res = await fetch("/api/ask-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history, projectId, projectContext: bidContext, authToken }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply ?? "Something went wrong. Please try again." },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, bidContext, authToken, isLoading]
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendChat, reset };
}
