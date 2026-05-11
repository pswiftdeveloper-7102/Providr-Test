import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.webp";

// Brand colours sampled from the supplied PROVIDR logo. Single source of
// truth — referenced by the auth branding panel and other brand accents.
export const BRAND_PURPLE = "#7B1FA2";
export const BRAND_TEAL = "#14B8A6";

// The supplied logo is wide (mark + wordmark). Measured aspect ratio of the
// asset: roughly 4:1 (width:height). Adjust if you swap in a different
// crop. Anything off and `width="auto"` on the img tag will still keep it
// sane on render. `LOGO_SRC` is declared at the top of the file so you can
// switch between `.svg`/`.png` in one obvious place.
const LOGO_ASPECT = 4;

type Props = {
  className?: string;
  /**
   * "color"  — render the supplied logo as-is (default, used in the header)
   * "white"  — apply a CSS filter to make the logo solid white, for use on
   *            the dark/purple branding panel.
   */
  tone?: "color" | "white";
  /**
   * Render height in pixels. Width auto-calculates from `LOGO_ASPECT`.
   */
  height?: number;
};

/**
 * Renders the PROVIDR brand logo from `public/providr-logo.png`.
 *
 * Drop the supplied logo file there:
 *   `<project root>/public/providr-logo.png`
 * No code changes needed — this component picks it up automatically.
 *
 * If you have an SVG version instead, save it as `providr-logo.svg` and
 * change `LOGO_SRC` above to `/providr-logo.svg`.
 */
export function ProvidrLogo({
  className,
  tone = "color",
  height = 32,
}: Props) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_SRC}
      alt="Providr"
      width={width}
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className={cn(
        "shrink-0 select-none",
        // Invert + brightness:0 turns any coloured image solid white,
        // for use on the purple branding panel.
        tone === "white" && "brightness-0 invert",
        className
      )}
    />
  );
}