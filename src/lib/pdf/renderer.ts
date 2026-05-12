// Thin wrapper around @react-pdf/renderer's pdf() stream API to give us a
// straightforward `renderToBuffer(<Doc/>)` call. Kept separate from the
// individual templates so each template stays a pure React component.

import type { DocumentProps } from "@react-pdf/renderer";
import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderToBuffer(
  doc: ReactElement<DocumentProps>
): Promise<Buffer> {
  const stream = await pdf(doc).toBuffer();
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}