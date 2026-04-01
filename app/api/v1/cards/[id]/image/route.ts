import { jsonError } from "@/lib/http";
import { getCardImageUrl } from "@/lib/ptcg-db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const imageUrl = await getCardImageUrl(Number(id));

  if (!imageUrl) {
    return jsonError(404, "image-not-found", "Card image not found.", { id });
  }

  return Response.redirect(imageUrl, 307);
}
