import { readFile } from "node:fs/promises";

import { jsonError } from "@/lib/http";
import { getCardImagePath } from "@/lib/ptcg-db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const imagePath = await getCardImagePath(Number(id));

  if (!imagePath) {
    return jsonError(404, "image-not-found", "Card image not found.", { id });
  }

  const data = await readFile(imagePath);
  return new Response(data, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
