import { REQUEST_STATUS_FLOW, STATUS_LABEL, statusStep, type RequestStatus } from "@/lib/portal/constants";

/**
 * The request's journey drawn as a building section: each stage is a level, the current one is "under construction".
 * Used in the client portal and the CMS.
 */
export function StageTracker({ status, compact = false }: { status: RequestStatus; compact?: boolean }) {
  const current = statusStep(status);
  const side = current === -1;
  return (
    <div className={`stage-tracker${compact ? " stage-tracker--compact" : ""}${side ? " stage-tracker--paused" : ""}`} role="img" aria-label={`Stage: ${STATUS_LABEL[status]}${side ? "" : `, step ${current + 1} of ${REQUEST_STATUS_FLOW.length}`}`}>
      <ol>
        {REQUEST_STATUS_FLOW.map((step, index) => {
          const state = side ? "todo" : index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li key={step.id} className={`is-${state}`}>
              <span className="stage-tracker__node" aria-hidden="true">{state === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span>
              {!compact && <span className="stage-tracker__label">{step.label}</span>}
            </li>
          );
        })}
      </ol>
      {compact && <span className="stage-tracker__caption">{STATUS_LABEL[status]}</span>}
    </div>
  );
}
