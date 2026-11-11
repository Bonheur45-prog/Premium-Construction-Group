import type { CSSProperties, ReactNode } from "react";
import { getHomePageContent } from "@/lib/homepage/store";

export function SitePageTheme({ children }: { children: ReactNode }) {
  const { colors, bodyFont, headingFont } = getHomePageContent().theme;
  const style = {
    "--ink": colors.ink,
    "--ink-soft": colors.inkSoft,
    "--night": colors.night,
    "--night-deep": colors.nightDeep,
    "--blue": colors.blue,
    "--teal": colors.teal,
    "--teal-pale": colors.tealPale,
    "--amber": colors.amber,
    "--paper": colors.paper,
    "--white": colors.white,
    "--line": colors.line,
    "--home-body-font": bodyFont,
    "--home-heading-font": headingFont,
  } as CSSProperties;

  return <div className="site-page-theme" style={style}>{children}</div>;
}
