import { ensureDatabaseReady } from "@/lib/db/importer";
import { getSqlite } from "@/lib/db/connection";

export type FilterOption = {
  code: string;
  label: string;
  count?: number;
};

export type SearchParams = {
  q?: string;
  page: number;
  pageSize: number;
  sort: "collectionNumberAsc" | "nameAsc";
  cardTypeCodes: string[];
  attributeCodes: string[];
  trainerTypeCodes: string[];
  energyTypeCodes: string[];
  pokemonTypeCodes: string[];
  specialCardCodes: string[];
  regulationMarks: string[];
  rarityCodes: string[];
  collectionIds: string[];
};

export type CardPrinting = {
  id: number;
  imageUrl: string;
  collectionNumber: string;
  collectionName: string;
  collectionId: number;
  collectionNames: string[];
  collectionIds: number[];
  regulationMark?: string | null;
  rarityCode?: string | null;
  rarityLabel?: string | null;
};

export type CardListItem = {
  id: number;
  name: string;
  imageUrl: string;
  printCount: number;
  printings: CardPrinting[];
  cardTypeCode: string;
  cardTypeLabel: string;
  attributeCode?: string | null;
  attributeLabel?: string | null;
  trainerTypeCode?: string | null;
  trainerTypeLabel?: string | null;
  energyTypeCode?: string | null;
  energyTypeLabel?: string | null;
  pokemonTypeCode?: string | null;
  pokemonTypeLabel?: string | null;
  specialCardCode?: string | null;
  specialCardLabel?: string | null;
  hp?: number | null;
  evolveText?: string | null;
};

export type CardDetail = CardListItem & {
  yorenCode?: string | null;
  ruleLines: string[];
  attacks: Array<{
    id: number;
    name: string;
    text: string;
    cost: string[];
    damage?: string | null;
  }>;
  features: Array<{
    id: number;
    name: string;
    text: string;
  }>;
  weakness?: string | null;
  resistance?: string | null;
  retreatCost?: number | null;
  illustratorNames: string[];
  pokemonCategory?: string | null;
  pokedexCode?: string | null;
  pokedexText?: string | null;
  height?: number | null;
  weight?: number | null;
  commodityCodes: string[];
  commodityNames: string[];
  deckRuleLimit?: number | null;
};

export type MetaPayload = {
  summary: {
    totalCards: number;
    totalCollections: number;
  };
  filters: {
    cardTypes: FilterOption[];
    attributes: FilterOption[];
    trainerTypes: FilterOption[];
    energyTypes: FilterOption[];
    pokemonTypes: FilterOption[];
    specialCards: FilterOption[];
    regulationMarks: FilterOption[];
    rarities: FilterOption[];
    collections: FilterOption[];
  };
};

export type SearchResponse = {
  items: CardListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  appliedFilters: Omit<SearchParams, "page" | "pageSize" | "sort"> & { q?: string; sort: string };
};

export type DeckValidationCard = {
  id: number;
  name: string;
  supertype: string;
  subtype?: string | null;
  energyType?: string | null;
  pokemonStage?: string | null;
  pokemonTypeLabel?: string | null;
  specialCardLabel?: string | null;
  deckRuleLimit?: number | null;
};

type RowValue = string | number | null;

function parseJsonArray(value: string | null) {
  return value ? (JSON.parse(value) as string[]) : [];
}

function splitRuleText(ruleText: string | null) {
  return (ruleText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPlaceholders(values: unknown[]) {
  return values.map(() => "?").join(", ");
}

function buildMatchQuery(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `"${part.replaceAll('"', '""')}"`)
    .join(" AND ");
}

async function readyDb() {
  await ensureDatabaseReady();
  return getSqlite();
}

function mapPrintingRows(rows: Array<Record<string, RowValue>>) {
  const printings: CardPrinting[] = [];
  const byPrintingId = new Map<number, CardPrinting>();

  for (const row of rows) {
    const printingId = Number(row.printing_id);
    let printing = byPrintingId.get(printingId);

    if (!printing) {
      printing = {
        id: printingId,
        imageUrl: String(row.image_url ?? ""),
        collectionNumber: String(row.collection_number ?? ""),
        collectionName: String(row.collection_name ?? ""),
        collectionId: Number(row.collection_id ?? 0),
        collectionNames: [],
        collectionIds: [],
        regulationMark: (row.regulation_mark as string | null) ?? null,
        rarityCode: (row.rarity_code as string | null) ?? null,
        rarityLabel: (row.rarity_label as string | null) ?? null,
      };
      byPrintingId.set(printingId, printing);
      printings.push(printing);
    }

    const collectionId = Number(row.collection_id ?? 0);
    const collectionName = String(row.collection_name ?? "");

    if (collectionId > 0 && !printing.collectionIds.includes(collectionId)) {
      printing.collectionIds.push(collectionId);
    }

    if (collectionName && !printing.collectionNames.includes(collectionName)) {
      printing.collectionNames.push(collectionName);
    }
  }

  return printings;
}

async function getPrintingsMap(cardIds: number[]) {
  const printingsMap = new Map<number, CardPrinting[]>();

  if (!cardIds.length) {
    return printingsMap;
  }

  const db = await readyDb();
  const rows = db
    .prepare(
      `
        SELECT
          cp.card_id,
          cp.id AS printing_id,
          cp.image_url,
          cp.collection_number,
          cp.regulation_mark,
          cp.rarity_code,
          cp.rarity_label,
          COALESCE(cc.collection_id, 0) AS collection_id,
          COALESCE(collections.name, '') AS collection_name
        FROM card_printings cp
        LEFT JOIN card_collections cc ON cc.printing_id = cp.id
        LEFT JOIN collections ON collections.id = cc.collection_id
        WHERE cp.card_id IN (${buildPlaceholders(cardIds)})
        ORDER BY
          cp.card_id ASC,
          CASE WHEN cp.collection_number_numeric IS NULL THEN 1 ELSE 0 END ASC,
          cp.collection_number_numeric ASC,
          cp.collection_number ASC,
          cp.id ASC,
          cc.id ASC
      `,
    )
    .all(...cardIds) as Array<Record<string, RowValue>>;

  const groupedRows = new Map<number, Array<Record<string, RowValue>>>();

  for (const row of rows) {
    const cardId = Number(row.card_id);
    const bucket = groupedRows.get(cardId);

    if (bucket) {
      bucket.push(row);
    } else {
      groupedRows.set(cardId, [row]);
    }
  }

  for (const [cardId, grouped] of groupedRows) {
    printingsMap.set(cardId, mapPrintingRows(grouped));
  }

  return printingsMap;
}

function mapCardListRow(row: Record<string, RowValue>, printings: CardPrinting[]) {
  return {
    id: Number(row.id),
    name: String(row.name),
    imageUrl: String(row.default_image_url ?? printings[0]?.imageUrl ?? ""),
    printCount: printings.length,
    printings,
    cardTypeCode: String(row.card_type_code),
    cardTypeLabel: String(row.card_type_label),
    attributeCode: (row.attribute_code as string | null) ?? null,
    attributeLabel: (row.attribute_label as string | null) ?? null,
    trainerTypeCode: (row.trainer_type_code as string | null) ?? null,
    trainerTypeLabel: (row.trainer_type_label as string | null) ?? null,
    energyTypeCode: (row.energy_type_code as string | null) ?? null,
    energyTypeLabel: (row.energy_type_label as string | null) ?? null,
    pokemonTypeCode: (row.pokemon_type_code as string | null) ?? null,
    pokemonTypeLabel: (row.pokemon_type_label as string | null) ?? null,
    specialCardCode: (row.special_card_code as string | null) ?? null,
    specialCardLabel: (row.special_card_label as string | null) ?? null,
    hp: (row.hp as number | null) ?? null,
    evolveText: (row.evolve_text as string | null) ?? null,
  } satisfies CardListItem;
}

function addInFilter(
  conditions: string[],
  params: unknown[],
  column: string,
  values: string[],
) {
  if (!values.length) return;
  conditions.push(`${column} IN (${buildPlaceholders(values)})`);
  params.push(...values);
}

function buildBaseFilters(
  params: SearchParams,
  excludedGroup?: keyof Pick<
    SearchParams,
    | "cardTypeCodes"
    | "attributeCodes"
    | "trainerTypeCodes"
    | "energyTypeCodes"
    | "pokemonTypeCodes"
    | "specialCardCodes"
    | "regulationMarks"
    | "rarityCodes"
    | "collectionIds"
  >,
) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.q?.trim()) {
    const likeValue = `%${params.q.trim()}%`;
    const matchQuery = buildMatchQuery(params.q);
    conditions.push(
      `(cards.id IN (SELECT card_id FROM card_search WHERE card_search MATCH ?) OR cards.search_text LIKE ?)`,
    );
    values.push(matchQuery, likeValue);
  }

  if (excludedGroup !== "cardTypeCodes") {
    addInFilter(conditions, values, "cards.card_type_code", params.cardTypeCodes);
  }
  if (excludedGroup !== "attributeCodes") {
    addInFilter(conditions, values, "cards.attribute_code", params.attributeCodes);
  }
  if (excludedGroup !== "trainerTypeCodes") {
    addInFilter(conditions, values, "cards.trainer_type_code", params.trainerTypeCodes);
  }
  if (excludedGroup !== "energyTypeCodes") {
    addInFilter(conditions, values, "cards.energy_type_code", params.energyTypeCodes);
  }
  if (excludedGroup !== "pokemonTypeCodes") {
    addInFilter(conditions, values, "cards.pokemon_type_code", params.pokemonTypeCodes);
  }
  if (excludedGroup !== "specialCardCodes") {
    addInFilter(conditions, values, "cards.special_card_code", params.specialCardCodes);
  }

  if (excludedGroup !== "regulationMarks" && params.regulationMarks.length) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM card_printings cp
        WHERE cp.card_id = cards.id
        AND cp.regulation_mark IN (${buildPlaceholders(params.regulationMarks)})
      )`,
    );
    values.push(...params.regulationMarks);
  }

  if (excludedGroup !== "rarityCodes" && params.rarityCodes.length) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM card_printings cp
        WHERE cp.card_id = cards.id
        AND cp.rarity_code IN (${buildPlaceholders(params.rarityCodes)})
      )`,
    );
    values.push(...params.rarityCodes);
  }

  if (excludedGroup !== "collectionIds" && params.collectionIds.length) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM card_printings cp
        JOIN card_collections cc ON cc.printing_id = cp.id
        WHERE cp.card_id = cards.id
        AND cc.collection_id IN (${buildPlaceholders(params.collectionIds)})
      )`,
    );
    values.push(...params.collectionIds);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

async function getFacetCounts(
  params: SearchParams,
  group:
    | "cardTypeCodes"
    | "attributeCodes"
    | "trainerTypeCodes"
    | "energyTypeCodes"
    | "pokemonTypeCodes"
    | "specialCardCodes",
  sqlExpression: string,
) {
  const db = await readyDb();
  const { whereClause, values } = buildBaseFilters(params, group);

  const rows = db
    .prepare(`
      SELECT ${sqlExpression} as code, COUNT(DISTINCT cards.id) as count
      FROM cards
      ${whereClause}
      GROUP BY ${sqlExpression}
      HAVING ${sqlExpression} IS NOT NULL AND ${sqlExpression} != ''
    `)
    .all(...values) as Array<{ code: string; count: number }>;

  return new Map(rows.map((row) => [String(row.code), Number(row.count)]));
}

async function getPrintingFacetCounts(
  params: SearchParams,
  group: "regulationMarks" | "rarityCodes",
  column: "regulation_mark" | "rarity_code",
) {
  const db = await readyDb();
  const { whereClause, values } = buildBaseFilters(params, group);

  const rows = db
    .prepare(`
      SELECT cp.${column} as code, COUNT(DISTINCT cards.id) as count
      FROM cards
      JOIN card_printings cp ON cp.card_id = cards.id
      ${whereClause}
      GROUP BY cp.${column}
      HAVING cp.${column} IS NOT NULL AND cp.${column} != ''
    `)
    .all(...values) as Array<{ code: string; count: number }>;

  return new Map(rows.map((row) => [String(row.code), Number(row.count)]));
}

async function getCollectionFacetCounts(params: SearchParams) {
  const db = await readyDb();
  const { whereClause, values } = buildBaseFilters(params, "collectionIds");

  const rows = db
    .prepare(`
      SELECT CAST(cc.collection_id AS TEXT) as code, COUNT(DISTINCT cards.id) as count
      FROM cards
      JOIN card_printings cp ON cp.card_id = cards.id
      JOIN card_collections cc ON cc.printing_id = cp.id
      ${whereClause}
      GROUP BY cc.collection_id
    `)
    .all(...values) as Array<{ code: string; count: number }>;

  return new Map(rows.map((row) => [String(row.code), Number(row.count)]));
}

export async function searchCards(params: SearchParams): Promise<SearchResponse> {
  const db = await readyDb();
  const { whereClause, values } = buildBaseFilters(params);
  const orderClause =
    params.sort === "nameAsc"
      ? "ORDER BY cards.name COLLATE NOCASE ASC, cards.id ASC"
      : `ORDER BY
          CASE WHEN cards.sort_collection_number_numeric IS NULL THEN 1 ELSE 0 END ASC,
          cards.sort_collection_number_numeric ASC,
          cards.sort_collection_number ASC,
          cards.id ASC`;

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM cards ${whereClause}`)
    .get(...values) as { total: number };

  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(Math.max(params.page, 1), totalPages);
  const offset = (page - 1) * params.pageSize;

  const rows = db
    .prepare(`
      SELECT *
      FROM cards
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `)
    .all(...values, params.pageSize, offset) as Array<Record<string, RowValue>>;

  const cardIds = rows.map((row) => Number(row.id));
  const printingsMap = await getPrintingsMap(cardIds);

  return {
    items: rows.map((row) => mapCardListRow(row, printingsMap.get(Number(row.id)) ?? [])),
    pagination: {
      page,
      pageSize: params.pageSize,
      total,
      totalPages,
    },
    appliedFilters: {
      q: params.q,
      sort: params.sort,
      cardTypeCodes: params.cardTypeCodes,
      attributeCodes: params.attributeCodes,
      trainerTypeCodes: params.trainerTypeCodes,
      energyTypeCodes: params.energyTypeCodes,
      pokemonTypeCodes: params.pokemonTypeCodes,
      specialCardCodes: params.specialCardCodes,
      regulationMarks: params.regulationMarks,
      rarityCodes: params.rarityCodes,
      collectionIds: params.collectionIds,
    },
  };
}

export async function getCardById(id: number): Promise<CardDetail | null> {
  const db = await readyDb();
  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as Record<string, RowValue> | undefined;

  if (!row) {
    return null;
  }

  const attacks = db
    .prepare("SELECT * FROM card_attacks WHERE card_id = ? ORDER BY sort_order ASC, id ASC")
    .all(id) as Array<Record<string, RowValue>>;
  const features = db
    .prepare("SELECT * FROM card_features WHERE card_id = ? ORDER BY sort_order ASC, id ASC")
    .all(id) as Array<Record<string, RowValue>>;
  const commodityRows = db
    .prepare(`
      SELECT
        MIN(cc.id) AS first_id,
        cc.commodity_code,
        cc.commodity_name
      FROM card_printings cp
      JOIN card_collections cc ON cc.printing_id = cp.id
      WHERE cp.card_id = ?
      GROUP BY cc.commodity_code, cc.commodity_name
      ORDER BY first_id ASC
    `)
    .all(id) as Array<Record<string, RowValue>>;
  const printingsMap = await getPrintingsMap([id]);
  const printings = printingsMap.get(id) ?? [];

  return {
    ...mapCardListRow(row, printings),
    yorenCode: (row.yoren_code as string | null) ?? null,
    ruleLines: splitRuleText((row.rule_text as string | null) ?? null),
    attacks: attacks.map((attack) => ({
      id: Number(attack.id),
      name: String(attack.name),
      text: String(attack.text ?? ""),
      cost: parseJsonArray((attack.cost_json as string | null) ?? null),
      damage: (attack.damage as string | null) ?? null,
    })),
    features: features.map((feature) => ({
      id: Number(feature.id),
      name: String(feature.name),
      text: String(feature.text ?? ""),
    })),
    weakness: (row.weakness as string | null) ?? null,
    resistance: (row.resistance as string | null) ?? null,
    retreatCost: (row.retreat_cost as number | null) ?? null,
    illustratorNames: parseJsonArray((row.illustrators_json as string | null) ?? null),
    pokemonCategory: (row.pokemon_category as string | null) ?? null,
    pokedexCode: (row.pokedex_code as string | null) ?? null,
    pokedexText: (row.pokedex_text as string | null) ?? null,
    height: (row.height as number | null) ?? null,
    weight: (row.weight as number | null) ?? null,
    commodityCodes: commodityRows.map((item) => String(item.commodity_code ?? "")),
    commodityNames: commodityRows.map((item) => String(item.commodity_name)),
    deckRuleLimit: (row.deck_rule_limit as number | null) ?? null,
  };
}

export async function getCardImageUrl(id: number) {
  const db = await readyDb();
  const row = db
    .prepare("SELECT default_image_url FROM cards WHERE id = ?")
    .get(id) as { default_image_url?: string | null } | undefined;

  return row?.default_image_url ?? null;
}

async function getDictOptions(typeCode: string) {
  const db = await readyDb();
  return db
    .prepare(
      "SELECT dict_code as code, dict_value as label FROM dict_entries WHERE type_code = ? ORDER BY dict_sort ASC",
    )
    .all(typeCode) as FilterOption[];
}

function mergeOptionsWithCounts(options: FilterOption[], counts: Map<string, number>) {
  return options.map((option) => ({
    ...option,
    count: counts.get(option.code) ?? 0,
  }));
}

export async function getMeta(params?: SearchParams): Promise<MetaPayload> {
  const db = await readyDb();
  const summary = db
    .prepare("SELECT (SELECT COUNT(*) FROM cards) as totalCards, (SELECT COUNT(*) FROM collections) as totalCollections")
    .get() as { totalCards: number; totalCollections: number };
  const collections = db
    .prepare(`
      SELECT collections.id as code, collections.name || ' (' || COUNT(DISTINCT cp.card_id) || ')' as label
      FROM collections
      LEFT JOIN card_collections cc ON cc.collection_id = collections.id
      LEFT JOIN card_printings cp ON cp.id = cc.printing_id
      GROUP BY collections.id
      HAVING COUNT(cc.printing_id) > 0
      ORDER BY collections.id DESC
    `)
    .all() as Array<{ code: number; label: string }>;
  const regulationMarks = db
    .prepare(`
      SELECT DISTINCT regulation_mark as code, regulation_mark as label
      FROM card_printings
      WHERE regulation_mark IS NOT NULL AND regulation_mark != ''
      ORDER BY regulation_mark ASC
    `)
    .all() as FilterOption[];
  const rarities = await getDictOptions("rarity");

  const baseParams: SearchParams = params ?? {
    q: undefined,
    page: 1,
    pageSize: 24,
    sort: "collectionNumberAsc",
    cardTypeCodes: [],
    attributeCodes: [],
    trainerTypeCodes: [],
    energyTypeCodes: [],
    pokemonTypeCodes: [],
    specialCardCodes: [],
    regulationMarks: [],
    rarityCodes: [],
    collectionIds: [],
  };

  const [
    cardTypeCounts,
    attributeCounts,
    trainerTypeCounts,
    energyTypeCounts,
    pokemonTypeCounts,
    specialCardCounts,
    regulationMarkCounts,
    rarityCounts,
    collectionCounts,
  ] = await Promise.all([
    getFacetCounts(baseParams, "cardTypeCodes", "cards.card_type_code"),
    getFacetCounts(baseParams, "attributeCodes", "cards.attribute_code"),
    getFacetCounts(baseParams, "trainerTypeCodes", "cards.trainer_type_code"),
    getFacetCounts(baseParams, "energyTypeCodes", "cards.energy_type_code"),
    getFacetCounts(baseParams, "pokemonTypeCodes", "cards.pokemon_type_code"),
    getFacetCounts(baseParams, "specialCardCodes", "cards.special_card_code"),
    getPrintingFacetCounts(baseParams, "regulationMarks", "regulation_mark"),
    getPrintingFacetCounts(baseParams, "rarityCodes", "rarity_code"),
    getCollectionFacetCounts(baseParams),
  ]);

  return {
    summary,
    filters: {
      cardTypes: mergeOptionsWithCounts(await getDictOptions("card_type"), cardTypeCounts),
      attributes: mergeOptionsWithCounts(await getDictOptions("attribute"), attributeCounts),
      trainerTypes: mergeOptionsWithCounts(await getDictOptions("trainer_type"), trainerTypeCounts),
      energyTypes: mergeOptionsWithCounts(await getDictOptions("energy_type"), energyTypeCounts),
      pokemonTypes: mergeOptionsWithCounts(await getDictOptions("pokemon_type"), pokemonTypeCounts),
      specialCards: mergeOptionsWithCounts(await getDictOptions("special_card"), specialCardCounts),
      regulationMarks: mergeOptionsWithCounts(regulationMarks, regulationMarkCounts),
      rarities: mergeOptionsWithCounts(rarities, rarityCounts),
      collections: collections.map((item) => ({
        code: String(item.code),
        label: item.label,
        count: collectionCounts.get(String(item.code)) ?? 0,
      })),
    },
  };
}

export async function getSummary() {
  const meta = await getMeta();
  return meta.summary;
}

export async function getDeckValidationMap(cardIds: number[]) {
  if (!cardIds.length) {
    return new Map<number, DeckValidationCard>();
  }

  const db = await readyDb();
  const rows = db
    .prepare(
      `SELECT id, name, card_type_label, trainer_type_label, energy_type_label, evolve_text, pokemon_type_label, special_card_label, deck_rule_limit
       FROM cards WHERE id IN (${buildPlaceholders(cardIds)})`,
    )
    .all(...cardIds) as Array<Record<string, RowValue>>;

  return new Map<number, DeckValidationCard>(
    rows.map((row) => [
      Number(row.id),
      {
        id: Number(row.id),
        name: String(row.name),
        supertype: String(row.card_type_label),
        subtype: (row.trainer_type_label as string | null) ?? (row.energy_type_label as string | null) ?? null,
        energyType: (row.energy_type_label as string | null) ?? null,
        pokemonStage: (row.evolve_text as string | null) ?? null,
        pokemonTypeLabel: (row.pokemon_type_label as string | null) ?? null,
        specialCardLabel: (row.special_card_label as string | null) ?? null,
        deckRuleLimit: (row.deck_rule_limit as number | null) ?? null,
      },
    ]),
  );
}
