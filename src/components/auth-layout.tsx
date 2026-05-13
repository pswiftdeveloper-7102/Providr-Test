import type { ReactNode } from "react";

import { BrandingPanel } from "@/components/branding-panel";
import { ProvidrLogo } from "@/components/providr-logo";

type Props = {
  children: ReactNode;
};

export function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-svh flex-1">
      <div className="flex flex-1 flex-col items-center bg-white px-5 py-8 sm:justify-center sm:px-12 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center sm:mb-10">
            <ProvidrLogo height={36} />
          </div>
          {children}
        </div>
      </div>
      <BrandingPanel />
    </div>
  );
}