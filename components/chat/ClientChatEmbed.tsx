"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  sender_role: "agency" | "client";
  content: string;
  created_at: string;
}

interface ClientChatEmbedProps {
  clientId: number;
  clientName: string;
}

export function ClientChatEmbed({ clientId, clientName }: ClientChatEmbedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?clientId=${clientId}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      setMessages(data);
    } catch { /* ignore */ }
  }, [clientId]);

  const markRead = useCallback(async () => {
    try {
      await fetch("/api/messages/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
    } catch { /* ignore */ }
  }, [clientId]);

  useEffect(() => {
    fetchMessages();
    markRead();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, content }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="w-72 border-l border-border bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{clientName}</p>
            <p className="text-[10px] text-muted-foreground">Messagerie</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-muted/20">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-xs text-muted-foreground text-center">
              Aucun message.<br />Démarrez la conversation.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[88%] flex flex-col gap-1",
              msg.sender_role === "agency" ? "self-end items-end" : "self-start items-start"
            )}
          >
            {msg.sender_role === "client" && (
              <p className="text-[10px] font-medium text-muted-foreground px-1">
                {clientName}
              </p>
            )}
            <div
              className={cn(
                "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                msg.sender_role === "agency"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-white border border-border text-foreground rounded-bl-sm shadow-sm"
              )}
            >
              {msg.content}
            </div>
            <p className="text-[10px] text-muted-foreground px-1">
              {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 shrink-0 bg-white">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
