"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsFetch, formatDate } from "@/components/admin/format";

type Entry = { id: string; actorType: string; actorName: string; action: string; summary: string; createdAt: string };

const WHO = [["", "Everyone"], ["staff", "Team"], ["client", "Clients"], ["visitor", "Website visitors"]] as const;

/** Full audit trail: sign-ins, edits, uploads, client activity. Kept for a year. */
export function ActivityLog() {
  const [who, setWho] = useState("");
  const [items, setItems] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const data = await cmsFetch<{ items: Entry[]; total: number }>(`/api/admin/activity?offset=${offset}${who ? `&who=${who}` : ""}`);
      setItems((current) => (offset ? [...current, ...data.items] : data.items));
      setTotal(data.total);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The activity log could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [who]);
  useEffect(() => { void load(0); }, [load]);

  let lastDay = "";
  return (
    <div className="cms-activity">
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Filter by who">
          {WHO.map(([value, label]) => <button key={value} type="button" className={who === value ? "is-active" : ""} onClick={() => setWho(value)}>{label}</button>)}
        </div>
        <span className="cms-muted">{total} event{total === 1 ? "" : "s"} · kept for 12 months</span>
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}
      <ol className="cms-feed cms-card">
        {items.map((entry) => {
          const day = formatDate(entry.createdAt);
          const header = day !== lastDay ? <li key={`d-${entry.id}`} className="cms-feed__day">{day}</li> : null;
          lastDay = day;
          return [
            header,
            <li key={entry.id}>
              <span className={`cms-feed__dot cms-feed__dot--${entry.actorType}`} aria-hidden="true">{entry.actorType === "client" ? "●" : entry.actorType === "visitor" ? "✉" : "◆"}</span>
              <span className="cms-feed__text"><strong>{entry.actorName || "System"}</strong> {entry.summary}</span>
              <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
            </li>,
          ];
        })}
      </ol>
      {!loading && !items.length && <p className="cms-empty">Nothing recorded yet.</p>}
      {items.length < total && <button type="button" className="cms-btn cms-btn--ghost cms-btn--center" disabled={loading} onClick={() => void load(items.length)}>{loading ? "Loading…" : "Load older"}</button>}
    </div>
  );
}
