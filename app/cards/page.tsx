import { CatalogExperience } from "@/components/catalog-experience";
import { getSummary } from "@/lib/ptcg-db";

export default async function CardsPage() {
  const summary = await getSummary();
  return <CatalogExperience mode="browse" initialSummary={summary} />;
}
