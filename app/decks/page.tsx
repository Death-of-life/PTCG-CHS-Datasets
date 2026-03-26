import { CatalogExperience } from "@/components/catalog-experience";
import { getSummary } from "@/lib/ptcg-db";

export default async function DecksPage() {
  const summary = await getSummary();
  return <CatalogExperience mode="deck" initialSummary={summary} />;
}
