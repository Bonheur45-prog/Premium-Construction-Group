"use client";

import { Bell, BellRinging, DeviceMobile } from "@/components/icons";
import { usePush } from "@/components/portal/push";

/** Profile → alerts on this phone or computer (Web Push). */
export function DeviceAlerts({ enabled: featureOn }: { enabled: boolean }) {
  const push = usePush("/api/portal/push", featureOn);
  if (!featureOn) return null;
  return (
    <section className="device-alerts">
      <span className="device-alerts__icon">{push.enabled ? <BellRinging size={22} weight="duotone" /> : <DeviceMobile size={22} weight="duotone" />}</span>
      <div>
        <strong>Alerts on this device</strong>
        <p>{!push.supported ? "This browser can't show alerts. On iPhone, add the client space to your Home Screen first (Share → Add to Home Screen), then open it from there." : !push.available ? "Alerts aren't set up on our side yet." : push.enabled ? "On — you'll get an alert here when our team replies." : "Get an alert the moment our team replies, even when this page is closed."}</p>
      </div>
      {push.supported && push.available && (push.enabled
        ? <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => void push.disable()}>Turn off</button>
        : <button type="button" className="portal-btn portal-btn--primary portal-btn--sm" onClick={() => void push.enable()}><Bell size={15} weight="fill" /> Turn on</button>)}
    </section>
  );
}
