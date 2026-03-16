"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  logo_color: string;
  industry: string;
}

interface Message {
  id: number;
  sender_role: "agency" | "client";
  content: string;
  created_at: string;
}

interface UnreadInfo {
  client_id: number;
  unread_count: number;
  last_message: string;
  last_at: string;
}

interface AgencyChatPanelProps {
  clients: Client[];
}

export function AgencyChatPanel({ clients }: AgencyChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<number, UnreadInfo>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalUnread = Object.values(unreadMap).reduce((sum, u) => sum + u.unread_count, 0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (!res.ok) return;
      const rows: UnreadInfo[] = await res.json();
      const map: Record<number, UnreadInfo> = {};
      rows.forEach((r) => { map[r.client_id] = r; });
      setUnreadMap(map);
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (clientId: number) => {
    try {
      const res = await fetch(`/api/messages?clientId=${clientId}`);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      setMessages(data);
    } catch { /* ignore */ }
  }, []);

  const markRead = useCallback(async (clientId: number) => {
    try {
      await fetch("/api/messages/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      setUnreadMap((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (!selectedClientId) return;
    fetchMessages(selectedClientId);
    const interval = setInterval(() => fetchMessages(selectedClientId), 3000);
    return () => clearInterval(interval);
  }, [selectedClientId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedClientId) markRead(selectedClientId);
  }, [selectedClientId, markRead]);

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedClientId(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedClientId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, content }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <>
      {/* Toggle tab — right edge */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50",
          "flex flex-col items-center gap-2 py-5 px-3",
          "bg-white border border-r-0 border-border rounded-l-xl",
          "text-muted-foreground hover:text-primary transition-all duration-200 shadow-sm",
          "hover:bg-blue-50",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <MessageCircle className="w-4 h-4" />
        {totalUnread > 0 && (
          <span className="bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
        <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
          Messages
        </span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-14 bottom-0 z-40",
          "w-80 bg-white border-l border-border shadow-xl",
          "flex flex-col",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 shrink-0 bg-white">
          {selectedClientId && (
            <button
              onClick={() => { setSelectedClientId(null); setMessages([]); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {selectedClient ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: selectedClient.logo_color }}
                >
                  {selectedClient.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate">{selectedClient.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Messages</p>
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client list */}
        {!selectedClientId && (
          <div className="flex-1 overflow-y-auto">
            {clients.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun client</p>
            )}
            {clients.map((client) => {
              const unread = unreadMap[client.id];
              return (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: client.logo_color }}
                  >
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                      {unread && (
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0">
                          {unread.unread_count > 9 ? "9+" : unread.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {unread ? unread.last_message : client.industry}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Message thread */}
        {selectedClientId && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-muted/20">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground text-center">
                    Aucun message.<br />Démarrez la conversation.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] flex flex-col gap-1",
                    msg.sender_role === "agency" ? "self-end items-end" : "self-start items-start"
                  )}
                >
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
          </>
        )}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
}
