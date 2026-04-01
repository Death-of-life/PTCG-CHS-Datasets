import { z } from "zod";

import { validateDeck } from "@/lib/deck-rules";
import { getDeckValidationMap } from "@/lib/ptcg-db";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({
  entries: z.array(
    z.object({
      logicalCardId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.parse(await request.json());
    const cardMap = await getDeckValidationMap(parsed.entries.map((entry) => entry.logicalCardId));
    return Response.json(validateDeck(parsed.entries, cardMap));
  } catch (error) {
    return jsonError(400, "invalid-body", "Invalid deck validation payload.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
