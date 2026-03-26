import { jsonError } from "@/lib/http";
import { parseSearchParams } from "@/lib/query-parsers";
import { searchCards } from "@/lib/ptcg-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await searchCards(parseSearchParams(searchParams));
    return Response.json(result);
  } catch (error) {
    return jsonError(400, "invalid-query", "Invalid query parameters.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
