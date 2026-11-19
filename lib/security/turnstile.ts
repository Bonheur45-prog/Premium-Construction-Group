import "server-only";

/**
 * Cloudflare Turnstile (invisible "are you human" check) for public forms.
 * Environment: TURNSTILE_SITE_KEY (shown to browsers) and TURNSTILE_SECRET_KEY (server only).
 * When the keys are not set, checks are skipped so the site keeps working during setup.
 */
export function turnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || "";
}

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: unknown, ip: string) {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || "", response: token });
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile could not be verified.", error);
    return false;
  }
}
