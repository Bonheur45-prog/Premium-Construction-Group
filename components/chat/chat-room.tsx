"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowBendUpLeft, ArrowLeft, Camera, CaretDown, ChatsCircle, Check, CloudArrowUp, DotsThreeVertical, FolderOpen, Info, LockSimple, MagnifyingGlass, Microphone,
  PaperPlaneRight, Paperclip, PencilSimple, Plus, PushPin, PushPinSlash, Trash, UserCircle, VideoCamera, X,
} from "@/components/icons";
import { InternalNoteIcon, VoiceNoteIcon } from "@/components/icons/custom";
import { FileViewer } from "@/components/chat/file-viewer";
import { CallCard, FileGlyph, MessageFiles, MilestoneCard, QuoteCard, Ticks, VoicePlayer, fileUrl } from "@/components/chat/message-parts";
import { useLive, useLiveEvents } from "@/components/portal/live";
import { clientUploadTarget, staffUploadTarget, uploadFile, type UploadProgress } from "@/components/portal/upload";
import { useVoiceRecorder } from "@/components/portal/voice-recorder";
import type { PortalFeatures } from "@/lib/features-shared";
import type { ChatMessage, ConversationStatus, ConversationSummary } from "@/lib/portal/chat";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/portal/file-types";
import type { PortalFileItem } from "@/lib/portal/files";

/**
 * The chat room, shared by clients (/account/messages) and the team (/admin/messages).
 * Conversations on the left, the thread in the middle, pinned messages and shared files on the right.
 */
type Side = "client" | "staff";
type Thread = { conversation: ConversationSummary; readSeq: { client: number; staff: number }; messages: ChatMessage[]; pinned: ChatMessage[]; hasMore: boolean };
type Pending = { key: string; name: string; size: number; progress: number; stage: UploadProgress["stage"]; file?: PortalFileItem; error?: string };
type ClientOption = { id: string; name: string; company: string; email: string; phone?: string };

const STATUS_LABEL: Record<ConversationStatus, string> = { open: "Open", waiting: "Waiting on client", closed: "Closed" };
const CLIENT_STATUS_LABEL: Record<ConversationStatus, string> = { open: "Open", waiting: "Awaiting your reply", closed: "Closed" };

async function call<T>(url: string, init: RequestInit = {}, side: Side): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.location.assign(side === "client" ? `/account/login?next=${encodeURIComponent(window.location.pathname)}` : "/admin");
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

const money = (value: number, currency: string) => `${currency} ${Math.round(value).toLocaleString("en-US")}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function listTime(iso: string) {
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) return time(iso);
  if (Date.now() - date.getTime() < 6 * 86_400_000) return date.toLocaleDateString("en-GB", { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ChatRoom({ side, me, features, initialId, basePath, apiBase, clients = [], links }: {
  side: Side; me: { id: string; name: string }; features: PortalFeatures; initialId?: string; basePath: string; apiBase: string;
  clients?: ClientOption[]; links: { quoteBase: string; progress: string };
}) {
  const live = useLive();
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [activeId, setActiveId] = useState(initialId || "");
  const [thread, setThread] = useState<Thread | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ConversationStatus>("");
  const [error, setError] = useState("");
  const [typingName, setTypingName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState<{ files: PortalFileItem[]; index: number } | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const scroller = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const data = await call<{ conversations: ConversationSummary[] }>(`${apiBase}/conversations?${params}`, {}, side);
      setList(data.conversations);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Conversations couldn't load."); }
  }, [apiBase, search, statusFilter, side]);

  const loadThread = useCallback(async (id: string) => {
    if (!id) { setThread(null); return; }
    try {
      const data = await call<Thread>(`${apiBase}/conversations/${id}`, {}, side);
      stickToBottom.current = true;
      setThread(data);
      setError("");
    } catch (reason) {
      setThread(null);
      setError(reason instanceof Error ? reason.message : "This conversation couldn't load.");
    }
  }, [apiBase, side]);

  useEffect(() => { const timer = window.setTimeout(() => void loadList(), search ? 250 : 0); return () => window.clearTimeout(timer); }, [loadList, search]);
  useEffect(() => { void loadThread(activeId); setShowDetails(false); }, [activeId, loadThread]);

  // Browser back/forward between conversations.
  useEffect(() => {
    const onPop = () => setActiveId(window.location.pathname.startsWith(`${basePath}/`) ? window.location.pathname.slice(basePath.length + 1) : "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [basePath]);

  const open = (id: string) => {
    if (id === activeId) return;
    window.history.pushState(null, "", id ? `${basePath}/${id}` : basePath);
    setActiveId(id);
  };

  // Mark as read whenever new messages from the other side are visible.
  const lastSeq = thread?.messages.at(-1)?.seq || 0;
  useEffect(() => {
    if (!thread || !lastSeq || document.visibilityState !== "visible") return;
    const mine = thread.readSeq[side];
    if (lastSeq > mine) {
      void call(`${apiBase}/conversations/${thread.conversation.id}/read`, { method: "POST", body: JSON.stringify({ seq: lastSeq }) }, side).catch(() => undefined);
      setThread((current) => current && { ...current, readSeq: { ...current.readSeq, [side]: lastSeq } });
      setList((current) => current?.map((item) => (item.id === thread.conversation.id ? { ...item, unread: 0 } : item)) || current);
    }
  }, [thread, lastSeq, apiBase, side]);

  const refreshListSoon = useRef<number | undefined>(undefined);
  useLiveEvents((event) => {
    if (event.type === "resync") { void loadList(); if (activeId) void loadThread(activeId); return; }
    if (event.type === "message" || event.type === "message-update") {
      const message = event.message as ChatMessage;
      if (event.conversationId === activeId) {
        setThread((current) => {
          if (!current) return current;
          const exists = current.messages.some((item) => item.id === message.id);
          const messages = exists ? current.messages.map((item) => (item.id === message.id ? message : item)) : event.type === "message" ? [...current.messages, message] : current.messages;
          const pinned = message.pinned ? [message, ...current.pinned.filter((item) => item.id !== message.id)] : current.pinned.filter((item) => item.id !== message.id);
          return { ...current, messages, pinned };
        });
        if (message.authorType !== side) setTypingName("");
      }
    }
    if (event.type === "message" || event.type === "conversation") {
      window.clearTimeout(refreshListSoon.current);
      refreshListSoon.current = window.setTimeout(() => void loadList(), 300);
      if (event.type === "conversation" && event.conversationId === activeId) {
        void call<Thread>(`${apiBase}/conversations/${activeId}`, {}, side).then((data) => setThread((current) => current && { ...current, conversation: data.conversation })).catch(() => undefined);
      }
    }
    if (event.type === "read" && event.conversationId === activeId && event.side !== side) {
      setThread((current) => current && { ...current, readSeq: { ...current.readSeq, [event.side]: event.seq } });
    }
    if (event.type === "typing" && event.conversationId === activeId && event.side !== side) {
      setTypingName(event.name);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTypingName(""), 4500);
    }
  });

  // Keep the newest message in view (unless the person scrolled up to read older ones).
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [thread?.messages.length, typingName]);

  async function loadOlder() {
    if (!thread?.hasMore) return;
    const first = thread.messages[0]?.seq;
    const element = scroller.current;
    const before = element?.scrollHeight || 0;
    const data = await call<Thread>(`${apiBase}/conversations/${thread.conversation.id}?before=${first}`, {}, side);
    stickToBottom.current = false;
    setThread((current) => current && { ...current, messages: [...data.messages, ...current.messages], hasMore: data.hasMore });
    requestAnimationFrame(() => { if (element) element.scrollTop = element.scrollHeight - before; });
  }

  const conversation = thread?.conversation;
  const client = clients.find((item) => item.id === conversation?.clientId);
  const otherOnline = side === "client" ? live.staffOnline : conversation ? live.onlineClients.has(conversation.clientId) || conversation.clientOnline : false;
  const sharedFiles = useMemo(() => (thread ? thread.messages.flatMap((message) => (message.kind === "voice" ? [] : message.files)).reverse() : []), [thread]);
  const totalUnread = (list || []).reduce((sum, item) => sum + item.unread, 0);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = totalUnread ? `(${totalUnread}) ${base}` : base;
  }, [totalUnread]);

  return (
    <div className={`chat${activeId ? " has-active" : ""}${showDetails ? " has-details" : ""}`}>
      {/* ---------- Conversations ---------- */}
      <aside className="chat-list" aria-label="Conversations">
        <div className="chat-list__head">
          <div className="chat-list__title">
            <h1>Messages</h1>
            <button type="button" className="chat-icon-btn chat-icon-btn--accent" onClick={() => setCreating(true)} aria-label="New conversation" title="New conversation"><Plus size={20} weight="bold" /></button>
          </div>
          <label className="chat-search">
            <MagnifyingGlass size={17} />
            <input type="search" placeholder={side === "staff" ? "Search clients, subjects, messages" : "Search messages"} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          {side === "staff" && (
            <div className="chat-filter" role="group" aria-label="Show">
              {([["", "All"], ["open", "Open"], ["waiting", "Waiting"], ["closed", "Closed"]] as const).map(([value, label]) => (
                <button key={value} type="button" className={statusFilter === value ? "is-active" : ""} onClick={() => setStatusFilter(value)}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <ul className="chat-list__items">
          {list?.map((item) => {
            const online = side === "staff" && (live.onlineClients.has(item.clientId) || item.clientOnline);
            return (
              <li key={item.id}>
                <button type="button" className={`chat-row${item.id === activeId ? " is-active" : ""}${item.unread ? " is-unread" : ""}`} onClick={() => open(item.id)}>
                  <span className={`chat-avatar${side === "client" ? " chat-avatar--team" : ""}`}>
                    {side === "client" ? <span className="chat-avatar__mark">PCG</span> : initials(item.clientName)}
                    {online && <i className="chat-presence" aria-label="Online" />}
                  </span>
                  <span className="chat-row__main">
                    <span className="chat-row__top">
                      <strong>{side === "staff" ? item.clientName : item.subject}</strong>
                      <time dateTime={item.lastMessageAt}>{listTime(item.lastMessageAt)}</time>
                    </span>
                    {side === "staff" && <span className="chat-row__subject">{item.subject}</span>}
                    <span className="chat-row__bottom">
                      <span className="chat-row__preview">{item.lastPreview || "No messages yet"}</span>
                      {item.unread > 0 ? <em className="chat-badge">{item.unread}</em> : item.status !== "open" && <em className={`chat-status chat-status--${item.status}`}>{(side === "client" ? CLIENT_STATUS_LABEL : STATUS_LABEL)[item.status]}</em>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {list && !list.length && (
          <div className="chat-list__empty">
            <ChatsCircle size={40} weight="duotone" />
            <strong>{search ? "Nothing found." : "No conversations yet."}</strong>
            <p>{search ? "Try other words." : side === "client" ? "Start one about anything — a project, a question, drawings to share. Our whole team sees it." : "Conversations with clients appear here."}</p>
            {!search && <button type="button" className="portal-btn portal-btn--primary" onClick={() => setCreating(true)}><Plus size={16} weight="bold" /> New conversation</button>}
          </div>
        )}
        {!list && <div className="chat-skeleton" />}
      </aside>

      {/* ---------- Thread ---------- */}
      <section className="chat-thread" aria-label="Conversation">
        {!activeId && (
          <div className="chat-welcome">
            <div className="chat-welcome__art" aria-hidden="true"><ChatsCircle size={64} weight="duotone" /></div>
            <h2>{side === "client" ? <>Your private line to <em>our team.</em></> : <>Every client, <em>one room.</em></>}</h2>
            <p>{side === "client" ? "Messages, drawings, photos, voice notes and video calls — kept together, private to you and Premium Construction Group." : "Pick a conversation on the left. Internal notes stay inside the team."}</p>
            <ul className="chat-welcome__points">
              <li><Paperclip size={18} weight="duotone" /> Files up to {features.files.maxFileMb} MB</li>
              {features.chat.voiceNotes && <li><VoiceNoteIcon size={18} weight="duotone" /> Voice notes</li>}
              {features.chat.videoCalls && <li><VideoCamera size={18} weight="duotone" /> Video calls</li>}
              <li><LockSimple size={18} weight="duotone" /> Private and secure</li>
            </ul>
          </div>
        )}
        {activeId && !thread && !error && <div className="chat-skeleton chat-skeleton--thread" />}
        {activeId && error && !thread && <p className="chat-error">{error}</p>}
        {thread && conversation && (
          <>
            <header className="chat-head">
              <button type="button" className="chat-icon-btn chat-head__back" onClick={() => open("")} aria-label="Back to conversations"><ArrowLeft size={20} /></button>
              <span className={`chat-avatar${side === "client" ? " chat-avatar--team" : ""}`}>
                {side === "client" ? <span className="chat-avatar__mark">PCG</span> : initials(conversation.clientName)}
                {otherOnline && <i className="chat-presence" />}
              </span>
              <div className="chat-head__title">
                <strong>{side === "staff" ? conversation.clientName : conversation.subject}</strong>
                <small>
                  {typingName ? <span className="chat-typing-inline">{side === "client" ? "Our team" : typingName.split(" ")[0]} is typing…</span>
                    : side === "client" ? (otherOnline ? "Team online now" : "Our team replies during working hours") : `${conversation.subject}${otherOnline ? " · online now" : ""}`}
                </small>
              </div>
              <div className="chat-head__actions">
                {side === "staff" && <StatusMenu status={conversation.status} onChange={(status) => void call(`${apiBase}/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ status }) }, side).then(() => loadThread(conversation.id))} />}
                {side === "client" && conversation.status === "closed" && <span className="chat-status chat-status--closed">Closed</span>}
                {features.chat.videoCalls && conversation.status !== "closed" && (
                  <button type="button" className="chat-icon-btn" title="Start a video call" aria-label="Start a video call" onClick={() => void call(`${apiBase}/conversations/${conversation.id}/call`, { method: "POST" }, side).catch((reason: Error) => setError(reason.message))}><VideoCamera size={20} /></button>
                )}
                <button type="button" className={`chat-icon-btn${showDetails ? " is-on" : ""}`} title="Details" aria-label="Details" onClick={() => setShowDetails((value) => !value)}><Info size={20} /></button>
              </div>
            </header>

            {thread.pinned.length > 0 && (
              <button type="button" className="chat-pinbar" onClick={() => document.getElementById(`m-${thread.pinned[0].id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}>
                <PushPin size={16} weight="fill" />
                <span><strong>Pinned</strong> {thread.pinned[0].body || thread.pinned[0].files[0]?.name || "Message"}</span>
                {thread.pinned.length > 1 && <em>+{thread.pinned.length - 1}</em>}
              </button>
            )}

            <Messages
              thread={thread} side={side} me={me} apiBase={apiBase} features={features} links={links} scroller={scroller}
              onScroll={(element) => { stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; if (element.scrollTop < 60 && thread.hasMore) void loadOlder(); }}
              typingName={typingName}
              onOpenFile={(file) => { const index = sharedFiles.findIndex((item) => item.id === file.id); setViewer({ files: index >= 0 ? sharedFiles : [file], index: Math.max(index, 0) }); }}
              onChanged={(message) => setThread((current) => current && { ...current, messages: current.messages.map((item) => (item.id === message.id ? message : item)), pinned: message.pinned ? [message, ...current.pinned.filter((item) => item.id !== message.id)] : current.pinned.filter((item) => item.id !== message.id) })}
              onError={setError}
            />
            {error && <p className="chat-error chat-error--inline" role="alert">{error} <button type="button" onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button></p>}
            <Composer
              key={conversation.id}
              side={side} apiBase={apiBase} conversation={conversation} features={features}
              clientId={conversation.clientId}
              onSent={(message) => { stickToBottom.current = true; setThread((current) => current && !current.messages.some((item) => item.id === message.id) ? { ...current, messages: [...current.messages, message] } : current); }}
              onReopen={side === "client" ? () => void call(`${apiBase}/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ status: "open" }) }, side).then(() => loadThread(conversation.id)) : undefined}
              onError={setError}
            />
          </>
        )}
      </section>

      {/* ---------- Details ---------- */}
      {thread && conversation && showDetails && (
        <aside className="chat-details" aria-label="Details">
          <header>
            <strong>Details</strong>
            <button type="button" className="chat-icon-btn" onClick={() => setShowDetails(false)} aria-label="Close details"><X size={18} /></button>
          </header>
          {side === "staff" && (
            <section className="chat-details__block">
              <div className="chat-details__person">
                <span className="chat-avatar chat-avatar--lg">{initials(conversation.clientName)}{otherOnline && <i className="chat-presence" />}</span>
                <div><strong>{conversation.clientName}</strong>{conversation.clientCompany && <small>{conversation.clientCompany}</small>}</div>
              </div>
              {client && (
                <dl className="chat-details__facts">
                  <div><dt>Email</dt><dd><a href={`mailto:${client.email}`}>{client.email}</a></dd></div>
                  {client.phone && <div><dt>Phone</dt><dd><a href={`tel:${client.phone}`}>{client.phone}</a></dd></div>}
                </dl>
              )}
              <AssignField value={conversation.assignedTo} me={me.name} onSave={(assignedTo) => void call(`${apiBase}/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ assignedTo }) }, side).then(() => loadThread(conversation.id))} />
              <a className="portal-btn portal-btn--ghost portal-btn--block" href={`/admin/client-files/${conversation.clientId}`}>Open {conversation.clientName.split(" ")[0]}&apos;s files</a>
              {features.quotes.enabled && <a className="portal-btn portal-btn--ghost portal-btn--block" href={`/admin/quotes?client=${conversation.clientId}&conversation=${conversation.id}`}>New quote for this client</a>}
            </section>
          )}
          {side === "client" && (
            <section className="chat-details__block">
              <p className="chat-details__note"><LockSimple size={16} weight="duotone" /> Only you and the Premium Construction Group team can see this conversation.</p>
              {conversation.status !== "closed"
                ? <button type="button" className="portal-link" onClick={() => void call(`${apiBase}/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ status: "closed" }) }, side).then(() => loadThread(conversation.id))}>Close this conversation</button>
                : <button type="button" className="portal-link" onClick={() => void call(`${apiBase}/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ status: "open" }) }, side).then(() => loadThread(conversation.id))}>Re-open this conversation</button>}
            </section>
          )}
          <section className="chat-details__block">
            <h3><PushPin size={16} weight="duotone" /> Pinned</h3>
            {thread.pinned.length ? (
              <ul className="chat-details__pins">
                {thread.pinned.map((message) => (
                  <li key={message.id}><button type="button" onClick={() => document.getElementById(`m-${message.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}><small>{message.authorName} · {listTime(message.createdAt)}</small>{message.body || message.files[0]?.name || "Message"}</button></li>
                ))}
              </ul>
            ) : <p className="chat-details__empty">Pin important messages — the agreed price, final drawings — to find them in one tap.</p>}
          </section>
          <section className="chat-details__block">
            <h3><FolderOpen size={16} weight="duotone" /> Shared files <em>{sharedFiles.length}</em></h3>
            {sharedFiles.length ? (
              <ul className="chat-details__files">
                {sharedFiles.slice(0, 30).map((file, index) => (
                  <li key={file.id}><button type="button" onClick={() => setViewer({ files: sharedFiles, index })}><span className="chat-file__icon"><FileGlyph file={file} size={18} /></span><span><strong>{file.name}</strong><small>{formatBytes(file.originalSize || file.size)}</small></span></button></li>
                ))}
              </ul>
            ) : <p className="chat-details__empty">Files sent in this conversation will be listed here.</p>}
          </section>
        </aside>
      )}

      {creating && (
        <NewConversation side={side} apiBase={apiBase} clients={clients} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); void loadList(); open(id); }} />
      )}
      {viewer && <FileViewer files={viewer.files} index={viewer.index} apiBase={apiBase} onClose={() => setViewer(null)} onIndex={(index) => setViewer((current) => current && { ...current, index })} />}
    </div>
  );
}

function StatusMenu({ status, onChange }: { status: ConversationStatus; onChange: (status: ConversationStatus) => void }) {
  return (
    <label className={`chat-status-select chat-status--${status}`}>
      <span className="visually-hidden">Status</span>
      <select value={status} onChange={(event) => onChange(event.target.value as ConversationStatus)}>
        <option value="open">Open</option>
        <option value="waiting">Waiting on client</option>
        <option value="closed">Closed</option>
      </select>
      <CaretDown size={14} />
    </label>
  );
}

function AssignField({ value, me, onSave }: { value: string; me: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="chat-assign">
      <label htmlFor="chat-assign"><UserCircle size={16} weight="duotone" /> Looked after by</label>
      <div>
        <input id="chat-assign" value={draft} placeholder="Nobody yet" maxLength={60} onChange={(event) => setDraft(event.target.value)} onBlur={() => draft !== value && onSave(draft)} />
        {draft !== me && <button type="button" className="portal-link" onClick={() => { setDraft(me); onSave(me); }}>Me</button>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

function Messages({ thread, side, me, apiBase, features, links, scroller, onScroll, typingName, onOpenFile, onChanged, onError }: {
  thread: Thread; side: Side; me: { id: string; name: string }; apiBase: string; features: PortalFeatures; links: { quoteBase: string; progress: string };
  scroller: React.RefObject<HTMLDivElement | null>; onScroll: (element: HTMLDivElement) => void; typingName: string;
  onOpenFile: (file: PortalFileItem) => void; onChanged: (message: ChatMessage) => void; onError: (text: string) => void;
}) {
  const [menu, setMenu] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const otherRead = side === "client" ? thread.readSeq.staff : thread.readSeq.client;
  const windowMs = features.chat.editMinutes * 60_000;
  let lastDay = "";
  let lastAuthor = "";

  async function act(message: ChatMessage, action: "pin" | "unpin" | "delete" | "edit", text?: string) {
    setMenu("");
    try {
      const url = `${apiBase}/messages/${message.id}`;
      const result = await call<{ message: ChatMessage }>(url, action === "delete" ? { method: "DELETE" } : { method: "PATCH", body: JSON.stringify(action === "edit" ? { body: text } : { pinned: action === "pin" }) }, side);
      onChanged(result.message);
      setEditing(null);
    } catch (reason) { onError(reason instanceof Error ? reason.message : "That didn't work."); }
  }

  return (
    <div className="chat-messages" ref={scroller} onScroll={(event) => onScroll(event.currentTarget)}>
      {thread.hasMore && <p className="chat-older">Scroll up for older messages</p>}
      {!thread.messages.length && (
        <div className="chat-empty-thread">
          <p>Say hello, share drawings or record a voice note.{side === "client" ? " Our team will reply here." : ""}</p>
        </div>
      )}
      {thread.messages.map((message) => {
        const day = dayLabel(message.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = message.authorType === side && (side === "client" || message.authorId === me.id);
        const ours = message.authorType === side; // same side (team colleague) — shown on the right for staff
        const grouped = !showDay && lastAuthor === `${message.authorType}:${message.authorId}:${message.internal}`;
        lastAuthor = `${message.authorType}:${message.authorId}:${message.internal}`;
        const canChange = mine && !message.deleted && (message.kind === "text" || message.kind === "voice") && Date.now() - new Date(message.createdAt).getTime() < windowMs;
        const card = message.kind === "call" || message.kind === "quote" || message.kind === "milestone";
        return (
          <div key={message.id}>
            {showDay && <div className="chat-day"><span>{day}</span></div>}
            <div id={`m-${message.id}`} className={`chat-msg${ours ? " is-mine" : ""}${grouped ? " is-grouped" : ""}${message.internal ? " is-internal" : ""}${card ? " is-card" : ""}${message.deleted ? " is-deleted" : ""}`}>
              {!ours && !grouped && <span className={`chat-avatar chat-avatar--sm${message.authorType !== "client" ? " chat-avatar--team" : ""}`}>{message.authorType !== "client" ? <span className="chat-avatar__mark">PCG</span> : initials(message.authorName)}</span>}
              <div className="chat-bubble">
                {!grouped && (!ours || side === "staff") && <span className="chat-bubble__author">{message.internal && <><InternalNoteIcon size={14} /> Internal note · </>}{ours && side === "staff" && !mine ? message.authorName : !ours ? (side === "client" && message.authorType !== "client" ? `${message.authorName || "Our team"} · PCG` : message.authorName) : mine ? "You" : message.authorName}</span>}
                {message.replyTo && (
                  <button type="button" className="chat-reply-quote" onClick={() => document.getElementById(`m-${message.replyTo!.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}>
                    <strong>{message.replyTo.authorName}</strong><span>{message.replyTo.excerpt}</span>
                  </button>
                )}
                {message.deleted ? <p className="chat-text chat-text--deleted">This message was deleted.</p> : (
                  <>
                    {message.kind === "voice" && message.files[0] && <VoicePlayer src={fileUrl(apiBase, message.files[0].id)} peaks={(message.meta.peaks as number[]) || []} duration={Number(message.meta.duration) || 0} mine={ours} />}
                    {message.kind === "call" && <CallCard message={message} />}
                    {message.kind === "quote" && <QuoteCard message={message} href={`${links.quoteBase}${links.quoteBase.endsWith("=") ? "" : "/"}${String(message.meta.quoteId || "")}`} money={money} />}
                    {message.kind === "milestone" && <MilestoneCard message={message} href={links.progress} />}
                    {message.kind === "text" && message.files.length > 0 && <MessageFiles files={message.files} apiBase={apiBase} onOpen={onOpenFile} />}
                    {editing?.id === message.id ? (
                      <form className="chat-edit" onSubmit={(event) => { event.preventDefault(); void act(message, "edit", editing.text); }}>
                        <textarea value={editing.text} autoFocus rows={Math.min(8, editing.text.split("\n").length + 1)} onChange={(event) => setEditing({ id: message.id, text: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") setEditing(null); if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void act(message, "edit", editing.text); } }} />
                        <div><button type="button" className="portal-link" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="portal-btn portal-btn--primary portal-btn--sm"><Check size={14} weight="bold" /> Save</button></div>
                      </form>
                    ) : message.kind === "text" && message.body && <p className="chat-text">{linkify(message.body)}</p>}
                  </>
                )}
                <span className="chat-meta">
                  {message.pinned && <PushPin size={12} weight="fill" />}
                  {message.editedAt && !message.deleted && <span>edited</span>}
                  <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
                  {ours && !message.internal && !message.deleted && <Ticks read={otherRead >= message.seq} />}
                </span>
              </div>
              {!message.deleted && (
                <div className={`chat-actions${menu === message.id ? " is-open" : ""}`}>
                  <button type="button" className="chat-icon-btn chat-icon-btn--sm" aria-label="Message options" onClick={() => setMenu(menu === message.id ? "" : message.id)}><DotsThreeVertical size={18} weight="bold" /></button>
                  {menu === message.id && (
                    <div className="chat-menu" role="menu" onMouseLeave={() => setMenu("")}>
                      <button type="button" role="menuitem" onClick={() => { setMenu(""); window.dispatchEvent(new CustomEvent("chat-reply", { detail: message })); }}><ArrowBendUpLeft size={16} /> Reply</button>
                      <button type="button" role="menuitem" onClick={() => void act(message, message.pinned ? "unpin" : "pin")}>{message.pinned ? <><PushPinSlash size={16} /> Unpin</> : <><PushPin size={16} /> Pin</>}</button>
                      {message.body && <button type="button" role="menuitem" onClick={() => { void navigator.clipboard?.writeText(message.body); setMenu(""); }}><Copy /> Copy text</button>}
                      {canChange && message.kind === "text" && <button type="button" role="menuitem" onClick={() => { setMenu(""); setEditing({ id: message.id, text: message.body }); }}><PencilSimple size={16} /> Edit</button>}
                      {canChange && <button type="button" role="menuitem" className="is-danger" onClick={() => void act(message, "delete")}><Trash size={16} /> Delete</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {typingName && (
        <div className="chat-msg chat-msg--typing"><span className="chat-avatar chat-avatar--sm chat-avatar--team"><span className="chat-avatar__mark">{side === "client" ? "PCG" : initials(typingName)}</span></span><div className="chat-bubble"><span className="chat-dots"><i /><i /><i /></span></div></div>
      )}
    </div>
  );
}

function Copy() {
  return <svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round" aria-hidden="true"><rect x="88" y="88" width="128" height="128" rx="8" /><path d="M168 88V48a8 8 0 00-8-8H48a8 8 0 00-8 8v112a8 8 0 008 8h40" /></svg>;
}

/** Turns web addresses in a message into links. */
function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<]+[^\s<.,;:!?)"'])/g);
  return parts.map((part, index) => (index % 2 ? <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow">{part.replace(/^https?:\/\//, "").slice(0, 60)}{part.length > 68 ? "…" : ""}</a> : part));
}

/* ---------------------------------------------------------------------------------------------- */

function Composer({ side, apiBase, conversation, features, clientId, onSent, onReopen, onError }: {
  side: Side; apiBase: string; conversation: ConversationSummary; features: PortalFeatures; clientId: string;
  onSent: (message: ChatMessage) => void; onReopen?: () => void; onError: (text: string) => void;
}) {
  const storageKey = `chat-draft-${conversation.id}`;
  const [text, setText] = useState(() => (typeof window !== "undefined" ? window.localStorage.getItem(storageKey) || "" : ""));
  const [pending, setPending] = useState<Pending[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachMenu, setAttachMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const lastTyping = useRef(0);
  const voice = useVoiceRecorder();
  const target = side === "client" ? clientUploadTarget({ conversationId: conversation.id }) : staffUploadTarget(clientId, { conversationId: conversation.id });

  useEffect(() => {
    try { if (text) window.localStorage.setItem(storageKey, text); else window.localStorage.removeItem(storageKey); } catch { /* private mode */ }
  }, [text, storageKey]);
  useEffect(() => {
    const onReply = (event: Event) => { setReplyTo((event as CustomEvent<ChatMessage>).detail); textarea.current?.focus(); };
    window.addEventListener("chat-reply", onReply);
    return () => window.removeEventListener("chat-reply", onReply);
  }, []);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [text]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 20);
    for (const file of list) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      setPending((current) => [...current, { key, name: file.name, size: file.size, progress: 0, stage: "compressing" }]);
      uploadFile(file, target, {
        compressImages: features.files.compressImages,
        onProgress: (progress) => setPending((current) => current.map((item) => (item.key === key ? { ...item, stage: progress.stage, progress: progress.total ? progress.loaded / progress.total : 0 } : item))),
      })
        .then((stored) => setPending((current) => current.map((item) => (item.key === key ? { ...item, file: stored, progress: 1, size: stored.size } : item))))
        .catch((reason: Error) => setPending((current) => current.map((item) => (item.key === key ? { ...item, error: reason.message } : item))));
    }
  }

  const uploading = pending.some((item) => !item.file && !item.error);
  const ready = pending.filter((item) => item.file).map((item) => item.file!.id);
  const canSend = !sending && !uploading && (text.trim().length > 0 || ready.length > 0);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      const result = await call<{ message: ChatMessage }>(`${apiBase}/conversations/${conversation.id}/messages`, {
        method: "POST", body: JSON.stringify({ body: text, fileIds: ready, replyTo: replyTo?.id || "", internal }),
      }, side);
      onSent(result.message);
      setText("");
      setPending([]);
      setReplyTo(null);
      textarea.current?.focus();
    } catch (reason) { onError(reason instanceof Error ? reason.message : "Your message couldn't be sent."); }
    finally { setSending(false); }
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !touch) { event.preventDefault(); void send(); }
    if (event.key === "Escape" && replyTo) setReplyTo(null);
  }

  function typed(value: string) {
    setText(value);
    if (value && Date.now() - lastTyping.current > 3000) {
      lastTyping.current = Date.now();
      void fetch(`${apiBase}/conversations/${conversation.id}/typing`, { method: "POST" }).catch(() => undefined);
    }
  }

  async function finishVoice(keep: boolean) {
    const note = await voice.stop(keep);
    if (!note) return;
    setSending(true);
    try {
      const stored = await uploadFile(note.file, { ...target, extra: { ...target.extra, purpose: "voice" } }, { compressImages: false });
      const result = await call<{ message: ChatMessage }>(`${apiBase}/conversations/${conversation.id}/messages`, {
        method: "POST", body: JSON.stringify({ kind: "voice", fileIds: [stored.id], duration: note.seconds, peaks: note.peaks, replyTo: replyTo?.id || "", internal }),
      }, side);
      onSent(result.message);
      setReplyTo(null);
    } catch (reason) { onError(reason instanceof Error ? reason.message : "The voice note couldn't be sent."); }
    finally { setSending(false); }
  }

  if (conversation.status === "closed" && side === "client") {
    return (
      <div className="chat-closed">
        <span>This conversation is closed.</span>
        {onReopen && <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={onReopen}>Re-open it</button>}
      </div>
    );
  }

  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files); };

  return (
    <form className={`composer${internal ? " is-internal" : ""}${dragging ? " is-dragging" : ""}`} onSubmit={send}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      {dragging && <div className="composer__drop"><CloudArrowUp size={28} weight="duotone" /> Drop files to attach</div>}
      {replyTo && (
        <div className="composer__reply">
          <ArrowBendUpLeft size={16} />
          <span><strong>Replying to {replyTo.authorName}</strong>{replyTo.body || replyTo.files[0]?.name || "Message"}</span>
          <button type="button" className="chat-icon-btn chat-icon-btn--sm" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={16} /></button>
        </div>
      )}
      {pending.length > 0 && (
        <ul className="composer__files">
          {pending.map((item) => (
            <li key={item.key} className={item.error ? "is-error" : item.file ? "is-ready" : ""}>
              <span className="chat-file__icon"><FileGlyph file={{ name: item.name, mime: "" }} size={18} /></span>
              <span className="composer__file-text">
                <strong>{item.name}</strong>
                <small>{item.error || (item.file ? formatBytes(item.file.size) + (item.file.originalSize > item.file.size * 1.15 ? ` · compressed from ${formatBytes(item.file.originalSize)}` : "") : item.stage === "compressing" ? "Preparing…" : item.stage === "checking" ? "Checking…" : `${Math.round(item.progress * 100)}%`)}</small>
                {!item.file && !item.error && <i className="composer__bar" style={{ width: `${Math.round(item.progress * 100)}%` }} />}
              </span>
              <button type="button" className="chat-icon-btn chat-icon-btn--sm" aria-label={`Remove ${item.name}`} onClick={() => setPending((current) => current.filter((entry) => entry.key !== item.key))}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {voice.state === "recording" ? (
        <div className="composer__recording">
          <button type="button" className="chat-icon-btn" onClick={() => void finishVoice(false)} aria-label="Cancel recording"><Trash size={20} /></button>
          <span className="composer__rec-dot" />
          <span className="composer__rec-time">{Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}</span>
          <span className="composer__level"><i style={{ transform: `scaleX(${0.08 + voice.level * 0.92})` }} /></span>
          <button type="button" className="composer__send" onClick={() => void finishVoice(true)} aria-label="Send voice note"><PaperPlaneRight size={20} weight="fill" /></button>
        </div>
      ) : (
        <div className="composer__row">
          <div className="composer__attach">
            <button type="button" className={`chat-icon-btn${attachMenu ? " is-on" : ""}`} onClick={() => setAttachMenu((value) => !value)} aria-label="Attach" title="Attach"><Paperclip size={21} /></button>
            {attachMenu && (
              <div className="chat-menu chat-menu--up" role="menu" onMouseLeave={() => setAttachMenu(false)}>
                <button type="button" role="menuitem" onClick={() => { setAttachMenu(false); fileInput.current?.click(); }}><CloudArrowUp size={17} /> From this device</button>
                {(features.files.enabled || side === "staff") && <button type="button" role="menuitem" onClick={() => { setAttachMenu(false); setPicker(true); }}><FolderOpen size={17} /> From {side === "client" ? "my files" : "client's files"}</button>}
                <button type="button" role="menuitem" onClick={() => { setAttachMenu(false); cameraInput.current?.click(); }}><Camera size={17} /> Take a photo</button>
              </div>
            )}
            <input ref={fileInput} type="file" multiple hidden accept={ACCEPT_ATTRIBUTE} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
            <input ref={cameraInput} type="file" hidden accept="image/*" capture="environment" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
          </div>
          <textarea ref={textarea} rows={1} value={text} placeholder={internal ? "Internal note — only the team sees this" : "Write a message…"} onChange={(event) => typed(event.target.value)} onKeyDown={onKey}
            onPaste={(event) => { if (event.clipboardData.files.length) { event.preventDefault(); addFiles(event.clipboardData.files); } }} aria-label="Message" maxLength={8000} />
          {side === "staff" && (
            <button type="button" className={`chat-icon-btn${internal ? " is-internal" : ""}`} onClick={() => setInternal((value) => !value)} aria-pressed={internal} title={internal ? "Internal note (team only)" : "Switch to internal note"} aria-label="Internal note"><InternalNoteIcon size={20} weight={internal ? "duotone" : "regular"} /></button>
          )}
          {!text.trim() && !ready.length && features.chat.voiceNotes ? (
            <button type="button" className="composer__send composer__send--mic" onClick={() => void voice.start()} aria-label="Record a voice note" title="Record a voice note" disabled={sending}><Microphone size={20} weight="fill" /></button>
          ) : (
            <button type="submit" className="composer__send" disabled={!canSend} aria-label="Send"><PaperPlaneRight size={20} weight="fill" /></button>
          )}
        </div>
      )}
      {voice.state === "denied" && <p className="composer__hint">Allow the microphone in your browser settings to record voice notes.</p>}
      {voice.state === "unsupported" && <p className="composer__hint">This browser can&apos;t record audio. Try Chrome, Edge or Safari.</p>}
      {picker && <FilePicker side={side} apiBase={apiBase} clientId={clientId} onClose={() => setPicker(false)} onPick={(files) => { setPicker(false); setPending((current) => [...current, ...files.map((file) => ({ key: file.id, name: file.name, size: file.size, progress: 1, stage: "checking" as const, file }))]); }} />}
    </form>
  );
}

/** Choose files already stored in the client's space — they're shared without uploading again. */
function FilePicker({ side, apiBase, clientId, onClose, onPick }: { side: Side; apiBase: string; clientId: string; onClose: () => void; onPick: (files: PortalFileItem[]) => void }) {
  const [files, setFiles] = useState<PortalFileItem[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const url = side === "client" ? `${apiBase}/files` : `/api/admin/portal/clients/${clientId}/files`;
    void call<{ files: PortalFileItem[] }>(url, {}, side).then((data) => setFiles(data.files.filter((file) => !file.meta.voice))).catch(() => setFiles([]));
  }, [apiBase, clientId, side]);
  const shown = (files || []).filter((file) => file.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="Choose files" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="portal-modal__card portal-modal__card--wide">
        <header className="portal-modal__head"><h2>Share from {side === "client" ? "my files" : "the client's files"}</h2><button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <label className="chat-search"><MagnifyingGlass size={17} /><input type="search" placeholder="Find a file" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus /></label>
        <ul className="picker-list">
          {shown.map((file) => (
            <li key={file.id}>
              <label className={chosen.includes(file.id) ? "is-chosen" : ""}>
                <input type="checkbox" checked={chosen.includes(file.id)} onChange={(event) => setChosen((current) => (event.target.checked ? [...current, file.id] : current.filter((id) => id !== file.id)))} />
                <span className="chat-file__icon"><FileGlyph file={file} size={18} /></span>
                <span><strong>{file.name}</strong><small>{formatBytes(file.originalSize || file.size)} · {new Date(file.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
              </label>
            </li>
          ))}
          {files && !shown.length && <li className="picker-list__empty">No files {query ? "match" : "stored yet"}.</li>}
          {!files && <li className="picker-list__empty">Loading…</li>}
        </ul>
        <footer className="portal-modal__foot">
          <button type="button" className="portal-btn portal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="portal-btn portal-btn--primary" disabled={!chosen.length} onClick={() => onPick((files || []).filter((file) => chosen.includes(file.id)))}>Attach {chosen.length || ""}</button>
        </footer>
      </div>
    </div>
  );
}

function NewConversation({ side, apiBase, clients, onClose, onCreated }: { side: Side; apiBase: string; clients: ClientOption[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [clientId, setClientId] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("client") || "" : ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await call<{ id: string }>(`${apiBase}/conversations`, { method: "POST", body: JSON.stringify({ subject, message, clientId }) }, side);
      onCreated(result.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The conversation couldn't be started."); setBusy(false); }
  }
  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="New conversation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="portal-modal__card" onSubmit={submit}>
        <header className="portal-modal__head"><h2>New conversation</h2><button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {side === "staff" && (
          <label className="portal-field"><span>Client</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
              <option value="">Choose a client…</option>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}{item.company ? ` — ${item.company}` : ""}</option>)}
            </select>
          </label>
        )}
        <label className="portal-field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Kicukiro villa — revised drawings" maxLength={120} required autoFocus /></label>
        <label className="portal-field"><span>Message</span><textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={side === "client" ? "What would you like to discuss? You can attach files once the conversation is open." : "Optional first message"} maxLength={8000} /></label>
        {error && <p className="portal-alert portal-alert--error">{error}</p>}
        <footer className="portal-modal__foot">
          <button type="button" className="portal-btn portal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="portal-btn portal-btn--primary" disabled={busy || subject.trim().length < 3 || (side === "staff" && !clientId)}>{busy ? "Starting…" : "Start conversation"}</button>
        </footer>
      </form>
    </div>
  );
}
