import { z } from "zod";

import type { SearchParams } from "@/lib/ptcg-db";

const pageSchema = z.coerce.number().int().min(1).default(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(60).default(24);
const sortSchema = z.enum(["collectionNumberAsc", "nameAsc"]).default("collectionNumberAsc");

function getArray(searchParams: URLSearchParams, key: string) {
  return searchParams.getAll(`${key}[]`).filter(Boolean);
}

export function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  return {
    q: searchParams.get("q")?.trim() || undefined,
    page: pageSchema.parse(searchParams.get("page") ?? undefined),
    pageSize: pageSizeSchema.parse(searchParams.get("pageSize") ?? undefined),
    sort: sortSchema.parse(searchParams.get("sort") ?? undefined),
    cardTypeCodes: getArray(searchParams, "cardType"),
    attributeCodes: getArray(searchParams, "attribute"),
    trainerTypeCodes: getArray(searchParams, "trainerType"),
    energyTypeCodes: getArray(searchParams, "energyType"),
    pokemonTypeCodes: getArray(searchParams, "pokemonType"),
    specialCardCodes: getArray(searchParams, "specialCard"),
    regulationMarks: getArray(searchParams, "regulationMark"),
    rarityCodes: getArray(searchParams, "rarity"),
    collectionIds: getArray(searchParams, "collectionId"),
  };
}
