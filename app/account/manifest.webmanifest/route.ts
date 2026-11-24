import { getFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";

/** Lets clients add their client space to the phone's Home Screen, where it opens like an app. */
export async function GET() {
  const { push } = await getFeatures();
  return Response.json({
    name: push.appName,
    short_name: push.appName.length > 14 ? "PCG Client" : push.appName,
    description: "Your private space with Premium Construction Group — messages, files, quotes and progress.",
    start_url: "/account",
    scope: "/",
    display: "standalone",
    background_color: "#102d3d",
    theme_color: "#102d3d",
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/app-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
