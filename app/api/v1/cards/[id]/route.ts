import { getCardById } from "@/lib/ptcg-db";
import { jsonError } from "@/lib/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const card = await getCardById(Number(id));

  if (!card) {
    return jsonError(404, "card-not-found", "Card not found.", { id });
  }

  return Response.json(card);
}
