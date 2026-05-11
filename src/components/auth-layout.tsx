import type { ReactNode } from "react";

import { BrandingPanel } from "@/components/branding-panel";
import { ProvidrLogo } from "@/components/providr-logo";

type Props = {
  children: ReactNode;
};

export function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-1">
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <ProvidrLogo height={40} />
          </div>
          {children}
        </div>
      </div>
      <BrandingPanel />
    </div>
  );
}