"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsFetch, timeAgo } from "@/components/admin/format";
import { COLLECTIONS, isCollectionId } from "@/lib/cms/collections";

type Row = { id: string; collection: string; title: string; status: string; deletedAt: string; deletedBy: string };

/** Everything moved to the trash, from every section. Restore it, or (administrators) delete it for good. */
export function TrashList({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows((await cmsFetch<{ entries: Row[] }>("/api/admin/cms/trash")).entries); }
    catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "The trash could not be loaded." }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function restore(row: Row) {
    try {
      await cmsFetch(`/api/admin/cms/entry/${row.id}`, { method: "POST", body: JSON.stringify({ action: "restore" }) });
      setNotice({ tone: "ok", text: `“${row.title}” is back${row.status === "published" ? " on the website" : " as a draft"}.` });
      await load();
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not restore." }); }
  }

  async function destroy(row: Row) {
    try {
      await cmsFetch(`/api/admin/cms/entry/${row.id}`, { method: "DELETE" });
      setNotice({ tone: "ok", text: `“${row.title}” was deleted for good.` });
      setConfirm(null);
      await load();
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not delete." }); }
  }

  return (
    <div className="cmsl">
      <div className="cmsl-intro"><p>Items you moved to the trash, from every section. Restoring puts them back exactly as they were.</p></div>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}
      {rows && rows.length > 0 && (
        <ul className="cmsl-rows">
          {rows.map((row) => {
            const def = isCollectionId(row.collection) ? COLLECTIONS[row.collection] : null;
            return (
              <li key={row.id}>
                <div className="cmsl-row cmsl-row--static">
                  <span className="cmsl-main"><strong>{row.title}</strong><small>{def ? def.singular[0].toUpperCase() + def.singular.slice(1) : row.collection} · trashed {timeAgo(row.deletedAt)}{row.deletedBy ? ` by ${row.deletedBy}` : ""}</small></span>
                  <span className="cmsl-meta">
                    <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => void restore(row)}>Restore</button>
                    {isAdmin && (confirm === row.id
                      ? <><button type="button" className="cms-btn cms-btn--danger cms-btn--small" onClick={() => void destroy(row)}>Delete for good</button><button type="button" className="cms-link" onClick={() => setConfirm(null)}>Cancel</button></>
                      : <button type="button" className="cms-link cms-link--danger" onClick={() => setConfirm(row.id)}>Delete…</button>)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rows && !rows.length && <div className="cmsl-empty"><strong>The trash is empty.</strong><p>When you move something to the trash, it waits here until you restore it.</p></div>}
    </div>
  );
}
