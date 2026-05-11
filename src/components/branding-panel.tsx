import { BRAND_PURPLE, ProvidrLogo } from "@/components/providr-logo";

const FEATURES = [
  { tag: "AI", title: "Incident Reports" },
  { tag: "PDF", title: "Auto-Generated" },
  { tag: "NDIS", title: "Compliant" },
];

export function BrandingPanel() {
  return (
    <aside
      className="hidden lg:flex flex-1 flex-col items-center justify-center px-12 py-16 text-white"
      style={{ backgroundColor: BRAND_PURPLE }}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <ProvidrLogo tone="white" height={44} />

        <h2 className="mt-12 text-3xl font-bold leading-tight tracking-tight">
          NDIS Provider Management
          <br />
          Made Simple
        </h2>

        <p className="mt-5 max-w-sm text-base/relaxed text-white/85">
          Streamline incident reporting, manage your team, and stay
          compliant — all in one platform.
        </p>

        <div className="mt-12 grid w-full grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.tag} className="text-center">
              <div className="text-2xl font-bold">{f.tag}</div>
              <div className="mt-1 text-sm text-white/80">{f.title}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}