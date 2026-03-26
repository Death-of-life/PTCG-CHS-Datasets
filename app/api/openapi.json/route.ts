import { openApiDocument } from "@/lib/openapi";

export async function GET() {
  return Response.json(openApiDocument);
}
