import { parseSearchParams } from "@/lib/query-parsers";
import { getMeta } from "@/lib/ptcg-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return Response.json(await getMeta(parseSearchParams(searchParams)));
}
