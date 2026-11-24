"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Buildings, HardHat, House, Ruler, Warehouse, Wrench } from "@/components/icons/estimator";
import { EstimateIcon } from "@/components/icons/custom";
import type { EstimatorFinish, EstimatorType } from "@/lib/features-shared";

/**
 * Public budget estimator (CMS → Features → Budget estimator). Indicative only: area × rate per m²
 * for the project type × finish multiplier, shown as a range. Every figure comes from the CMS.
 */
const ICONS: Record<string, typeof House> = { house: House, apartments: Buildings, commercial: Buildings, warehouse: Warehouse, renovation: Wrench };
const fmt = (value: number) => Math.round(value).toLocaleString("en-US");

function compact(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(value >= 1e10 ? 0 : 1)} bn`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e8 ? 0 : 1)} M`;
  return fmt(value);
}

export function BudgetEstimator({ types, finishes, spread, disclaimer, accountsOpen }: {
  types: EstimatorType[]; finishes: EstimatorFinish[]; spread: number; disclaimer: string; accountsOpen: boolean;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id || "");
  const [finishId, setFinishId] = useState(finishes[0]?.id || "");
  const [area, setArea] = useState(180);
  const [floors, setFloors] = useState(1);
  const type = types.find((item) => item.id === typeId) || types[0];
  const finish = finishes.find((item) => item.id === finishId) || finishes[0];
  const result = useMemo(() => {
    if (!type || !finish) return null;
    const total = area * type.ratePerM2 * finish.multiplier;
    const margin = total * (spread / 100);
    return { low: Math.max(0, total - margin), high: total + margin, perM2: type.ratePerM2 * finish.multiplier };
  }, [area, type, finish, spread]);
  const summary = type && finish && result ? `Estimate: ${type.label}, ${area} m² over ${floors} floor${floors === 1 ? "" : "s"}, ${finish.label} finish — RWF ${fmt(result.low)} to ${fmt(result.high)}.` : "";

  return (
    <div className="estimator">
      <div className="estimator__form">
        <fieldset className="estimator__step">
          <legend><span>01</span> What are you building?</legend>
          <div className="estimator__types">
            {types.map((item) => {
              const Icon = ICONS[item.id] || HardHat;
              return (
                <label key={item.id} className={item.id === typeId ? "is-on" : ""}>
                  <input type="radio" name="type" checked={item.id === typeId} onChange={() => setTypeId(item.id)} />
                  <Icon size={28} weight="duotone" />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="estimator__step">
          <legend><span>02</span> How big?</legend>
          <div className="estimator__area">
            <Ruler size={22} weight="duotone" />
            <input type="range" min={20} max={5000} step={10} value={area} onChange={(event) => setArea(Number(event.target.value))} aria-label="Floor area" />
            <label className="estimator__number"><input type="number" min={10} max={100000} value={area} onChange={(event) => setArea(Math.max(0, Number(event.target.value) || 0))} /><span>m²</span></label>
          </div>
          <div className="estimator__floors" role="group" aria-label="Floors">
            <span>Floors</span>
            {[1, 2, 3, 4, 5].map((count) => <button key={count} type="button" className={floors === count ? "is-on" : ""} onClick={() => setFloors(count)}>{count}{count === 5 ? "+" : ""}</button>)}
          </div>
          <small className="estimator__hint">Total floor area across all floors. A typical 3-bedroom house is 150–220 m².</small>
        </fieldset>
        <fieldset className="estimator__step">
          <legend><span>03</span> Which finish?</legend>
          <div className="estimator__finishes">
            {finishes.map((item) => (
              <label key={item.id} className={item.id === finishId ? "is-on" : ""}>
                <input type="radio" name="finish" checked={item.id === finishId} onChange={() => setFinishId(item.id)} />
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <aside className="estimator__result" aria-live="polite">
        <EstimateIcon size={34} weight="duotone" />
        <p className="estimator__label">Indicative budget</p>
        {result && (
          <>
            <p className="estimator__range"><small>RWF</small> {compact(result.low)} <span>–</span> {compact(result.high)}</p>
            <p className="estimator__exact">RWF {fmt(result.low)} – {fmt(result.high)}</p>
            <dl className="estimator__facts">
              <div><dt>Area</dt><dd>{fmt(area)} m²</dd></div>
              <div><dt>Approx. per m²</dt><dd>RWF {fmt(result.perM2)}</dd></div>
            </dl>
          </>
        )}
        <p className="estimator__small">{disclaimer}</p>
        <div className="estimator__actions">
          <Link className="button button--light" href={`/contact?message=${encodeURIComponent(summary)}`}>Discuss this estimate <span aria-hidden="true">↗</span></Link>
          {accountsOpen && <Link className="estimator__link" href="/account/signup">Or create an account to work with us →</Link>}
        </div>
      </aside>
    </div>
  );
}
