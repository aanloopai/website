import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// AGA web chat — Claude/ChatGPT-style, talks to /api/aga/chat (same-origin,
// staff-gated) which streams SSE from the Hetzner AGA terminal. Two modes:
// "chat" (one fast agent turn, tools on demand) and "gorev" (heavy pipeline).

type Role = "user" | "assistant";
type Activity = { tool: string; path?: string; snippet?: string };
interface Message {
  id: string;
  role: Role;
  text: string;
  activities?: Activity[];
  status?: string;
  pending?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ---- tiny markdown: fenced code blocks + inline code, rest as plain text ----
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf("\n");
      const code = nl >= 0 ? part.slice(nl + 1) : part;
      return (
        <pre key={i} className="my-2 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/70 p-3 text-[13px] leading-relaxed text-neutral-200">
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      );
    }
    const withInline = part.split(/(`[^`]+`)/).map((seg, j) =>
      seg.startsWith("`") && seg.endsWith("`") && seg.length > 1 ? (
        <code key={j} className="rounded bg-neutral-800 px-1.5 py-0.5 text-[0.85em] text-neutral-200">
          {seg.slice(1, -1)}
        </code>
      ) : (
        <span key={j}>{seg}</span>
      )
    );
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {withInline}
      </span>
    );
  });
}

// ---- icons ----
function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2l1.4 4.1L14.5 7.5 10.4 8.9 9 13 7.6 8.9 3.5 7.5 7.6 6.1 9 2z" fill="currentColor" />
    </svg>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const label = [a.tool, a.path].filter(Boolean).join(" ");
  const snip = (a.snippet || "").replace(/\s+/g, " ").slice(0, 100);
  return (
    <div className="flex items-center gap-2 py-0.5 text-[12.5px] text-neutral-500">
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-600" />
      <span className="font-mono">{label}</span>
      {snip && <span className="truncate text-neutral-600">{snip}</span>}
    </div>
  );
}

function MessageBlock({ m }: { m: Message }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-neutral-800 px-4 py-2.5 text-[15px] text-neutral-100">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white">
        <SparkIcon />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {m.activities && m.activities.length > 0 && (
          <div className="mb-2 rounded-lg border border-neutral-800/70 bg-neutral-900/40 px-3 py-1.5">
            {m.activities.map((a, i) => <ActivityRow key={i} a={a} />)}
          </div>
        )}
        <div className="text-[15px] leading-relaxed text-neutral-200">
          {m.text ? renderContent(m.text) : (
            m.pending && <span className="inline-flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500" />
            </span>
          )}
        </div>
        {m.status && m.status !== "ok" && m.status !== "completed" && (
          <div className="mt-1 text-[12px] text-neutral-600">— {m.status}</div>
        )}
      </div>
    </div>
  );
}

export function AgaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"chat" | "gorev">("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const patch = useCallback((id: string, fn: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const send = useCallback(async () => {
    const task = value.trim();
    if (!task || busy) return;
    const userMsg: Message = { id: uid(), role: "user", text: task };
    const botId = uid();
    const botMsg: Message = { id: botId, role: "assistant", text: "", activities: [], pending: true };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setValue("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/aga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, mode }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) {
        const detail = await resp.text().catch(() => "");
        patch(botId, (m) => ({ ...m, pending: false, text: `Fout ${resp.status}: ${detail.slice(0, 200)}` }));
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let event = "message";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() || "";
        for (const block of blocks) {
          let ev = "message";
          let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;
          event = ev;
          let data: any = {};
          try { data = JSON.parse(dataLine); } catch { data = { text: dataLine }; }
          if (event === "activity") {
            patch(botId, (m) => ({
              ...m,
              activities: [...(m.activities || []), { tool: data.tool || "?", path: data.path, snippet: data.snippet }],
            }));
          } else if (event === "answer") {
            patch(botId, (m) => ({ ...m, pending: false, text: data.text || "" }));
          } else if (event === "error") {
            patch(botId, (m) => ({ ...m, pending: false, text: data.text || "Fout" }));
          } else if (event === "done") {
            patch(botId, (m) => ({ ...m, pending: false, status: data.status }));
          }
        }
      }
      patch(botId, (m) => ({ ...m, pending: false }));
    } catch (err: any) {
      if (err?.name === "AbortError") {
        patch(botId, (m) => ({ ...m, pending: false, text: m.text || "— gestopt" }));
      } else {
        patch(botId, (m) => ({ ...m, pending: false, text: `Verbindingsfout: ${err?.message || err}` }));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [value, busy, mode, patch]);

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const composer = (
    <div className="w-full">
      <div className="relative rounded-2xl border border-neutral-700 bg-neutral-900 shadow-lg transition-colors focus-within:border-neutral-600">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={mode === "gorev" ? "Grote taak — plan, uitvoeren, verifiëren…" : "Vraag AGA iets, of geef een opdracht…"}
          className="max-h-[200px] w-full resize-none bg-transparent px-4 pb-12 pt-3.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "chat" ? "gorev" : "chat"))}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              mode === "gorev"
                ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            )}
            title="Sohbet = snelle beurt. Görev = zware pipeline (plan→uitvoeren→verifiëren)."
          >
            <SparkIcon />
            {mode === "gorev" ? "Görev" : "Sohbet"}
          </button>
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-200 text-neutral-900 transition-transform hover:scale-105 active:scale-95"
              aria-label="Stop"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!value.trim()}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
              aria-label="Verstuur"
            >
              <ArrowUpIcon />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-neutral-600">
        AGA voert opdrachten uit op de server (bestanden, sites, data). Alleen jij ziet dit.
      </p>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-3xl flex-col">
      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-2">
          <h1 className="text-center text-[28px] font-semibold tracking-tight text-neutral-100">
            Waar kan ik je mee helpen?
          </h1>
          <div className="w-full">{composer}</div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
            {messages.map((m) => <MessageBlock key={m.id} m={m} />)}
          </div>
          <div className="px-2 pb-2">{composer}</div>
        </>
      )}
    </div>
  );
}

export default AgaChat;
