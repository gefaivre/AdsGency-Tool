"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  sender_role: "agency" | "client";
  content: string;
  created_at: string;
}

interface ClientChatBubbleProps {
  clientId: number;
  agencyName: string;
}

export function ClientChatBubble({ clientId, agencyName }: ClientChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (!res.ok) return;
      const data: { unread_count: number } = await res.json();
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, []);

  const markRead = useCallback(async () => {
    try {
      await fetch("/api/messages/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [isOpen, fetchUnread]);

  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      markRead();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, markRead]);

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
    <>
      {/* Chat panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          "bottom-0 left-0 right-0 sm:left-auto sm:right-5 sm:bottom-20",
          "sm:w-80",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="bg-white border border-border rounded-2xl shadow-2xl flex flex-col h-[65vh] sm:h-[420px] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 shrink-0 bg-white">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Votre agence</p>
              <p className="text-sm font-semibold text-foreground">{agencyName}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-muted/20">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground text-center">
                  Aucun message pour l&apos;instant
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] flex flex-col gap-1",
                  msg.sender_role === "client" ? "self-end items-end" : "self-start items-start"
                )}
              >
                {msg.sender_role === "agency" && (
                  <p className="text-[10px] font-medium text-muted-foreground px-1">
                    {agencyName}
                  </p>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    msg.sender_role === "client"
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
              placeholder="Votre message..."
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
      </div>

      {/* Floating bubble button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50",
          "w-13 h-13 w-12 h-12 bg-primary text-white rounded-2xl",
          "flex items-center justify-center",
          "shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        )}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
