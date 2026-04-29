"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, Loader2 } from "lucide-react";
import type { PlanIQMessage } from "@/hooks/usePlanIQ";

interface AskAiPanelProps {
  open: boolean;
  onClose: () => void;
  messages: PlanIQMessage[];
  isStreaming: boolean;
  statusText: string | null;
  sendChat: (message: string) => void;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
}

const SUGGESTED_PROMPTS = [
  "What are the key trades involved in this project?",
  "What are the most important bid requirements I should focus on?",
  "What risks should I be aware of when bidding this project?",
  "Can you summarize the electrical scope for this project?",
  "What special instructions or compliance requirements exist?",
];

export function AskAiPanel({
  open,
  onClose,
  messages,
  isStreaming,
  statusText,
  sendChat,
  initialMessage,
  onInitialMessageConsumed,
}: AskAiPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Auto-send initial message when panel opens with one queued
  useEffect(() => {
    if (open && initialMessage && messages.length === 0) {
      sendChat(initialMessage);
      onInitialMessageConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage]);

  const handleSend = (text: string) => {
    if (!text.trim() || isStreaming) return;
    sendChat(text);
    setInput("");
  };

  if (!open) return null;

  return (
    <div className="w-[380px] shrink-0 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Ask AI</span>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-foreground">How can I help with your bid?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask questions about the project specs, scope, or how to improve your bid.
              </p>
            </div>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:border-emerald-200 transition-colors text-foreground leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="whitespace-pre-wrap">
                      {msg.content.split("\n").map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < msg.content.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  <span className="text-xs text-muted-foreground">
                    {statusText ?? "Thinking..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-1">
        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          Ask AI is in beta testing and can make mistakes; check important info. Ask AI may become a paid subscription in the future.
        </p>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="What would you like to know?"
            disabled={isStreaming}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isStreaming}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
