import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// AGA web chat — full ChatGPT/Claude-style client for /admin/aga.
// Talks to /api/aga/chat (SSE) and /api/aga/models. Owner-only (staff-gated
// server-side). Features: streaming, tool-activity trace, model picker, effort
// levels, image uploads with a shared-element gallery, Sohbet/Görev modes.

type Role = "user" | "assistant";
type Activity = { tool: string; path?: string; snippet?: string };
interface Attachment { id: string; file: File; url: string; name: string; mime: string; }
interface Message {
  id: string; role: Role; text: string;
  images?: string[]; activities?: Activity[]; status?: string; pending?: boolean;
}
interface ModelOpt { id: string; label: string; }
interface EffortOpt { id: string; label: string; }

const uid = () => Math.random().toString(36).slice(2, 10);
const EASE = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---- markdown-lite: fenced code + inline code ----
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
    const inline = part.split(/(`[^`]+`)/).map((seg, j) =>
      seg.startsWith("`") && seg.endsWith("`") && seg.length > 1 ? (
        <code key={j} className="rounded bg-neutral-800 px-1.5 py-0.5 text-[0.85em] text-neutral-200">{seg.slice(1, -1)}</code>
      ) : <span key={j}>{seg}</span>
    );
    return <span key={i} className="whitespace-pre-wrap break-words">{inline}</span>;
  });
}

// ---- icons ----
const ArrowUp = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Stop = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /></svg>);
const Spark = () => (<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.4 4.1L14.5 7.5 10.4 8.9 9 13 7.6 8.9 3.5 7.5 7.6 6.1 9 2z" fill="currentColor" /></svg>);
const Plus = () => (<svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const Close = () => (<svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
function EffortBars({ level }: { level: string }) {
  const mid = level === "medium" || level === "max";
  const hi = level === "max";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="8" width="2.5" height="4.5" rx="1" fill="currentColor" />
      <rect x="5.75" y="5" width="2.5" height="7.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={mid ? 1 : 0.3} />
      <rect x="10" y="2" width="2.5" height="10.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={hi ? 1 : 0.3} />
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

function MessageBlock({ m, onOpenImage }: { m: Message; onOpenImage: (url: string, rect: DOMRect) => void }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.images && m.images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.images.map((src, i) => (
              <button key={i} type="button" onClick={(e) => onOpenImage(src, e.currentTarget.getBoundingClientRect())}
                className="size-16 overflow-hidden rounded-xl border border-neutral-700 transition-transform hover:scale-[1.04]">
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {m.text && (
          <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-neutral-800 px-4 py-2.5 text-[15px] text-neutral-100">{m.text}</div>
        )}
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white"><Spark /></div>
      <div className="min-w-0 flex-1 pt-0.5">
        {m.activities && m.activities.length > 0 && (
          <div className="mb-2 rounded-lg border border-neutral-800/70 bg-neutral-900/40 px-3 py-1.5">
            {m.activities.map((a, i) => <ActivityRow key={i} a={a} />)}
          </div>
        )}
        <div className="text-[15px] leading-relaxed text-neutral-200">
          {m.text ? renderContent(m.text) : (m.pending && (
            <span className="inline-flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-neutral-500" />
            </span>
          ))}
        </div>
        {m.status && m.status !== "ok" && m.status !== "completed" && (
          <div className="mt-1 text-[12px] text-neutral-600">— {m.status}</div>
        )}
      </div>
    </div>
  );
}

// shared-element image gallery
function Gallery({ url, originRect, onClose }: { url: string; originRect: DOMRect; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  const target = { top: window.innerHeight * 0.1, left: window.innerWidth * 0.1, width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 };
  const geo = open ? target : { top: originRect.top, left: originRect.left, width: originRect.width, height: originRect.height };
  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300" style={{ opacity: open ? 1 : 0 }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "fixed", top: geo.top, left: geo.left, width: geo.width, height: geo.height, transition: `all 0.4s ${EASE}` }}
        className="overflow-hidden rounded-2xl">
        <img src={url} alt="" className="size-full object-contain" />
      </div>
    </div>
  );
}

export function AgaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"chat" | "gorev">("chat");
  const [model, setModel] = useState("auto");
  const [effort, setEffort] = useState("medium");
  const [models, setModels] = useState<ModelOpt[]>([{ id: "auto", label: "Otomatik" }]);
  const [efforts, setEfforts] = useState<EffortOpt[]>([
    { id: "low", label: "Düşük" }, { id: "medium", label: "Orta" }, { id: "max", label: "Yüksek" },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [gallery, setGallery] = useState<{ url: string; rect: DOMRect } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    fetch("/api/aga/models").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.models?.length) setModels(d.models);
      if (d?.efforts?.length) setEfforts(d.efforts);
    }).catch(() => {});
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);
  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);

  const patch = useCallback((id: string, fn: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setAttachments((prev) => [
      ...prev,
      ...imgs.slice(0, 4 - prev.length).map((f) => ({
        id: uid(), file: f, url: URL.createObjectURL(f), name: f.name, mime: f.type,
      })),
    ]);
  }, []);

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const send = useCallback(async () => {
    const task = value.trim();
    if ((!task && attachments.length === 0) || busy) return;

    const imageUrls = attachments.map((a) => a.url);
    let imagesPayload: { name: string; mime: string; b64: string }[] = [];
    try {
      imagesPayload = await Promise.all(
        attachments.map(async (a) => ({ name: a.name, mime: a.mime, b64: await fileToDataUrl(a.file) }))
      );
    } catch { /* an unreadable file just drops out */ }

    const userMsg: Message = { id: uid(), role: "user", text: task, images: imageUrls };
    const botId = uid();
    setMessages((prev) => [...prev, userMsg, { id: botId, role: "assistant", text: "", activities: [], pending: true }]);
    setValue("");
    setAttachments([]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/aga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, mode, model, effort, images: imagesPayload.length ? imagesPayload : undefined }),
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
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() || "";
        for (const block of blocks) {
          let ev = "message"; let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;
          let data: any = {};
          try { data = JSON.parse(dataLine); } catch { data = { text: dataLine }; }
          if (ev === "activity") {
            patch(botId, (m) => ({ ...m, activities: [...(m.activities || []), { tool: data.tool || "?", path: data.path, snippet: data.snippet }] }));
          } else if (ev === "answer") {
            patch(botId, (m) => ({ ...m, pending: false, text: data.text || "" }));
          } else if (ev === "error") {
            patch(botId, (m) => ({ ...m, pending: false, text: data.text || "Fout" }));
          } else if (ev === "done") {
            patch(botId, (m) => ({ ...m, pending: false, status: data.status }));
          }
        }
      }
      patch(botId, (m) => ({ ...m, pending: false }));
    } catch (err: any) {
      patch(botId, (m) => ({ ...m, pending: false, text: m.text || (err?.name === "AbortError" ? "— gestopt" : `Verbindingsfout: ${err?.message || err}`) }));
    } finally {
      setBusy(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [value, attachments, busy, mode, model, effort, patch]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const cycleEffort = () => {
    const order = efforts.map((e) => e.id);
    const i = order.indexOf(effort);
    setEffort(order[(i + 1) % order.length] || "medium");
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const effortLabel = efforts.find((e) => e.id === effort)?.label || "Orta";

  const composer = (
    <div className="w-full">
      <div className="relative rounded-2xl border border-neutral-700 bg-neutral-900 shadow-lg transition-colors focus-within:border-neutral-600">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a, i) => (
              <div key={a.id} className="group relative size-14 overflow-hidden rounded-xl border border-neutral-700"
                style={{ animation: `fadeIn 0.3s ${EASE}`, animationDelay: `${i * 35}ms`, animationFillMode: "backwards" }}>
                <img src={a.url} alt={a.name} className="size-full object-cover" />
                <button type="button" onClick={() => removeAttachment(a.id)}
                  className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="Kaldır">
                  <Close />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKeyDown} rows={1}
          placeholder={mode === "gorev" ? "Grote taak — plan, uitvoeren, verifiëren…" : "Vraag AGA iets, of geef een opdracht…"}
          className="max-h-[200px] w-full resize-none bg-transparent px-4 pb-12 pt-3.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={attachments.length >= 4}
            className="flex size-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-40"
            aria-label="Görsel ekle" title="Görsel ekle (max 4)"><Plus /></button>

          <select value={model} onChange={(e) => setModel(e.target.value)}
            className="max-w-[9rem] cursor-pointer truncate rounded-lg bg-neutral-800/60 px-2 py-1.5 text-[12.5px] text-neutral-300 outline-none transition-colors hover:bg-neutral-800"
            title="Model" disabled={mode === "gorev"}>
            {models.map((m) => <option key={m.id} value={m.id} className="bg-neutral-900">{m.label}</option>)}
          </select>

          <button type="button" onClick={cycleEffort} disabled={mode === "gorev"}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-40"
            title="Çaba seviyesi"><EffortBars level={effort} />{effortLabel}</button>

          <button type="button" onClick={() => setMode((m) => (m === "chat" ? "gorev" : "chat"))}
            className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
              mode === "gorev" ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200")}
            title="Sohbet = snelle beurt. Görev = zware pipeline.">
            <Spark />{mode === "gorev" ? "Görev" : "Sohbet"}</button>

          <div className="flex-1" />
          {busy ? (
            <button type="button" onClick={stop}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-200 text-neutral-900 transition-transform hover:scale-105 active:scale-95" aria-label="Stop"><Stop /></button>
          ) : (
            <button type="button" onClick={send} disabled={!value.trim() && attachments.length === 0}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600" aria-label="Verstuur"><ArrowUp /></button>
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
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-6px) scale(0.9)}to{opacity:1;transform:none}}`}</style>
      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-2">
          <h1 className="text-center text-[28px] font-semibold tracking-tight text-neutral-100">Waar kan ik je mee helpen?</h1>
          <div className="w-full">{composer}</div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
            {messages.map((m) => <MessageBlock key={m.id} m={m} onOpenImage={(url, rect) => setGallery({ url, rect })} />)}
          </div>
          <div className="px-2 pb-2">{composer}</div>
        </>
      )}
      {gallery && <Gallery url={gallery.url} originRect={gallery.rect} onClose={() => setGallery(null)} />}
    </div>
  );
}

export default AgaChat;
