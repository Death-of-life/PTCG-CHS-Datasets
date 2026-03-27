import fs from "node:fs";
import { mkdir, readFile } from "node:fs/promises";

import { getSqlite } from "@/lib/db/connection";
import { dataDirPath, sourceJsonPath, sqlitePath } from "@/lib/db/paths";

const R2_PUBLIC_BASE_URL = "https://pub-a275b3fdda064fe5a8c45a3a5afb1266.r2.dev";

type RawDictItem = {
  id: number;
  typeCode: string;
  dictCode: string;
  dictValue: string;
  dictSort: number;
  status: number;
};

type RawCard = {
  id: number;
  name?: string;
  yorenCode?: string;
  cardType?: string;
  specialCard?: string;
  pokemonType?: string;
  trainerType?: string;
  energyType?: string;
  commodityCode?: string;
  image?: string;
  hash?: string;
  details: {
    cardName?: string;
    cardType?: string;
    cardTypeText?: string;
    hp?: number;
    attribute?: string;
    evolveText?: string;
    regulationMarkText?: string;
    collectionNumber?: string;
    commodityCode?: string;
    rarity?: string;
    rarityText?: string;
    trainerType?: string;
    trainerTypeText?: string;
    energyType?: string;
    energyTypeText?: string;
    pokemonType?: string;
    specialCard?: string;
    ruleText?: string;
    abilityItemList?: Array<{
      abilityName?: string;
      abilityText?: string;
      abilityCost?: string;
      abilityDamage?: string;
    }>;
    cardFeatureItemList?: Array<{
      featureName?: string;
      featureDesc?: string;
    }>;
    weaknessType?: string;
    weaknessFormula?: string;
    resistanceType?: string;
    resistanceFormula?: string;
    retreatCost?: number;
    pokemonCategory?: string;
    pokedexCode?: string;
    pokedexText?: string;
    height?: number;
    weight?: number;
    illustratorName?: string[];
    commodityList?: Array<{
      commodityName: string;
      commodityCode: string;
    }>;
  };
};

type RawCollection = {
  id: number;
  name: string;
  commodityCode: string;
  salesDate?: string;
  cards: RawCard[];
};

type RawDatabase = {
  collections: RawCollection[];
  dict: Record<string, RawDictItem[]>;
};

let ensurePromise: Promise<void> | null = null;

function sanitizeImagePath(image: string | undefined) {
  return (image ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function buildCardImageUrlFromPath(imagePath: string | undefined) {
  const relativePath = sanitizeImagePath(imagePath).replace(/^img\//, "");
  return relativePath ? `${R2_PUBLIC_BASE_URL}/${relativePath}` : "";
}

function normalizeText(value: string | undefined | null) {
  return (value ?? "").trim();
}

function splitRuleText(ruleText: string | undefined) {
  return normalizeText(ruleText)
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNumericCollectionNumber(value: string | undefined) {
  const match = (value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function makeDictMap(items: RawDictItem[] = []) {
  return new Map(items.map((item) => [item.dictCode, item.dictValue]));
}

function detectDeckRuleLimit(
  ruleText: string,
  pokemonTypeLabel?: string | null,
  specialCardLabel?: string | null,
) {
  if (
    specialCardLabel === "ACE SPEC" ||
    specialCardLabel === "棱镜之星" ||
    pokemonTypeLabel === "光辉宝可梦"
  ) {
    return 1;
  }

  if (ruleText.includes("这副牌只可放入1张")) {
    return 1;
  }

  return null;
}

function createTables(db: ReturnType<typeof getSqlite>) {
  db.exec(`
    DROP VIEW IF EXISTS card_search_index;
    DROP TABLE IF EXISTS card_search;
    DROP TABLE IF EXISTS card_features;
    DROP TABLE IF EXISTS card_attacks;
    DROP TABLE IF EXISTS card_collections;
    DROP TABLE IF EXISTS cards;
    DROP TABLE IF EXISTS collections;
    DROP TABLE IF EXISTS dict_entries;

    CREATE TABLE collections (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      commodity_code TEXT NOT NULL,
      sales_date TEXT
    );
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      yoren_code TEXT,
      collection_number TEXT NOT NULL,
      collection_number_numeric INTEGER,
      commodity_code TEXT,
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      hash TEXT,
      card_type_code TEXT NOT NULL,
      card_type_label TEXT NOT NULL,
      trainer_type_code TEXT,
      trainer_type_label TEXT,
      energy_type_code TEXT,
      energy_type_label TEXT,
      pokemon_type_code TEXT,
      pokemon_type_label TEXT,
      special_card_code TEXT,
      special_card_label TEXT,
      attribute_code TEXT,
      attribute_label TEXT,
      regulation_mark TEXT,
      rarity_code TEXT,
      rarity_label TEXT,
      hp INTEGER,
      evolve_text TEXT,
      rule_text TEXT,
      weakness TEXT,
      resistance TEXT,
      retreat_cost INTEGER,
      pokemon_category TEXT,
      pokedex_code TEXT,
      pokedex_text TEXT,
      height REAL,
      weight REAL,
      illustrators_json TEXT NOT NULL,
      search_text TEXT NOT NULL,
      deck_rule_limit INTEGER
    );
    CREATE TABLE card_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      card_id INTEGER NOT NULL,
      collection_id INTEGER NOT NULL,
      commodity_code TEXT,
      commodity_name TEXT NOT NULL
    );
    CREATE TABLE card_attacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      card_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      cost_json TEXT NOT NULL,
      damage TEXT
    );
    CREATE TABLE card_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      card_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE TABLE dict_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      type_code TEXT NOT NULL,
      dict_code TEXT NOT NULL,
      dict_value TEXT NOT NULL,
      dict_sort INTEGER NOT NULL,
      status INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE card_search USING fts5(
      card_id UNINDEXED,
      name,
      rule_text,
      attacks_text,
      features_text,
      collection_text,
      illustrator_text,
      pokedex_text,
      tokenize = 'unicode61'
    );
    CREATE INDEX cards_name_idx ON cards(name);
    CREATE INDEX cards_type_idx ON cards(card_type_code);
    CREATE INDEX cards_attribute_idx ON cards(attribute_code);
    CREATE INDEX cards_regulation_idx ON cards(regulation_mark);
    CREATE INDEX cards_collection_number_idx ON cards(collection_number_numeric);
    CREATE INDEX card_collections_card_idx ON card_collections(card_id);
    CREATE UNIQUE INDEX card_collections_unique_idx ON card_collections(card_id, collection_id, commodity_code);
    CREATE INDEX card_attacks_card_idx ON card_attacks(card_id);
    CREATE INDEX card_features_card_idx ON card_features(card_id);
    CREATE INDEX dict_entries_type_sort_idx ON dict_entries(type_code, dict_sort);
    CREATE UNIQUE INDEX dict_entries_type_code_unique_idx ON dict_entries(type_code, dict_code);
    CREATE VIEW card_search_index AS
    SELECT
      cards.*,
      COALESCE((
        SELECT card_collections.collection_id
        FROM card_collections
        WHERE card_collections.card_id = cards.id
        ORDER BY card_collections.id ASC
        LIMIT 1
      ), 0) AS collection_id,
      COALESCE((
        SELECT card_collections.commodity_name
        FROM card_collections
        WHERE card_collections.card_id = cards.id
        ORDER BY card_collections.id ASC
        LIMIT 1
      ), '') AS collection_name
    FROM cards;
  `);
}

export async function importJsonToSqlite() {
  await mkdir(dataDirPath, { recursive: true });
  const raw = await readFile(sourceJsonPath, "utf8");
  const parsed = JSON.parse(raw) as RawDatabase;
  const db = getSqlite();
  createTables(db);

  const dictMaps = {
    attribute: makeDictMap(parsed.dict.attribute),
    cardType: makeDictMap(parsed.dict.card_type),
    trainerType: makeDictMap(parsed.dict.trainer_type),
    energyType: makeDictMap(parsed.dict.energy_type),
    pokemonType: makeDictMap(parsed.dict.pokemon_type),
    specialCard: makeDictMap(parsed.dict.special_card),
    weaknessType: makeDictMap(parsed.dict.weakness_type),
    resistanceType: makeDictMap(parsed.dict.resistance_type),
    abilityCost: makeDictMap(parsed.dict.ability_cost),
  };

  const insertCollection = db.prepare("INSERT INTO collections (id, name, commodity_code, sales_date) VALUES (?, ?, ?, ?)");
  const insertCard = db.prepare(`
    INSERT INTO cards (
      id, name, yoren_code, collection_number, collection_number_numeric, commodity_code, image_path, image_url, hash,
      card_type_code, card_type_label, trainer_type_code, trainer_type_label, energy_type_code, energy_type_label,
      pokemon_type_code, pokemon_type_label, special_card_code, special_card_label, attribute_code, attribute_label,
      regulation_mark, rarity_code, rarity_label, hp, evolve_text, rule_text, weakness, resistance, retreat_cost,
      pokemon_category, pokedex_code, pokedex_text, height, weight, illustrators_json, search_text, deck_rule_limit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCardCollection = db.prepare(
    "INSERT INTO card_collections (card_id, collection_id, commodity_code, commodity_name) VALUES (?, ?, ?, ?)",
  );
  const insertAttack = db.prepare(
    "INSERT INTO card_attacks (card_id, sort_order, name, text, cost_json, damage) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertFeature = db.prepare(
    "INSERT INTO card_features (card_id, sort_order, name, text) VALUES (?, ?, ?, ?)",
  );
  const insertDictEntry = db.prepare(
    "INSERT INTO dict_entries (id, type_code, dict_code, dict_value, dict_sort, status) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertSearch = db.prepare(`
    INSERT INTO card_search (
      card_id, name, rule_text, attacks_text, features_text, collection_text, illustrator_text, pokedex_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const insertedCardIds = new Set<number>();

    for (const collection of parsed.collections) {
      insertCollection.run(collection.id, collection.name, collection.commodityCode, collection.salesDate ?? null);
    }

    for (const [typeCode, items] of Object.entries(parsed.dict)) {
      for (const item of items) {
        insertDictEntry.run(item.id, typeCode, item.dictCode, item.dictValue, item.dictSort, item.status);
      }
    }

    for (const collection of parsed.collections) {
      for (const rawCard of collection.cards) {
        const details = rawCard.details;
        const commodityList = Array.from(
          new Map(
            (details.commodityList ?? [
              { commodityName: collection.name, commodityCode: collection.commodityCode },
            ]).map((item) => [`${item.commodityCode}::${item.commodityName}`, item] as const),
          ).values(),
        );

        if (!insertedCardIds.has(rawCard.id)) {
          insertedCardIds.add(rawCard.id);

          const name = rawCard.name ?? details.cardName ?? "未知卡牌";
          const cardTypeCode = details.cardType ?? rawCard.cardType ?? "";
          const trainerTypeCode = details.trainerType ?? rawCard.trainerType ?? null;
          const energyTypeCode = details.energyType ?? rawCard.energyType ?? null;
          const pokemonTypeCode = details.pokemonType ?? rawCard.pokemonType ?? null;
          const specialCardCode = details.specialCard ?? rawCard.specialCard ?? null;
          const attributeCode = details.attribute ?? null;
          const pokemonTypeLabel = pokemonTypeCode ? (dictMaps.pokemonType.get(pokemonTypeCode) ?? pokemonTypeCode) : null;
          const specialCardLabel = specialCardCode ? (dictMaps.specialCard.get(specialCardCode) ?? specialCardCode) : null;
          const imagePath = sanitizeImagePath(rawCard.image);
          const ruleText = splitRuleText(details.ruleText).join("\n");
          const attacks = (details.abilityItemList ?? []).map((item) => ({
            name: item.abilityName ?? "未命名招式",
            text: item.abilityText === "none" ? "" : normalizeText(item.abilityText),
            cost: normalizeText(item.abilityCost)
              .split(",")
              .map((part) => dictMaps.abilityCost.get(part.trim()) ?? part.trim())
              .filter(Boolean),
            damage: item.abilityDamage === "none" ? null : item.abilityDamage ?? null,
          }));
          const features = (details.cardFeatureItemList ?? []).map((item) => ({
            name: item.featureName ?? "特性",
            text: normalizeText(item.featureDesc),
          }));
          const illustrators = details.illustratorName ?? [];
          const searchText = [
            name,
            ruleText,
            attacks.map((item) => `${item.name} ${item.text}`).join(" "),
            features.map((item) => `${item.name} ${item.text}`).join(" "),
            commodityList.map((item) => item.commodityName).join(" "),
            illustrators.join(" "),
            normalizeText(details.pokedexText),
          ]
            .join(" ")
            .trim();

          insertCard.run(
            rawCard.id,
            name,
            rawCard.yorenCode ?? null,
            details.collectionNumber ?? "",
            parseNumericCollectionNumber(details.collectionNumber),
            details.commodityCode ?? rawCard.commodityCode ?? null,
            imagePath,
            buildCardImageUrlFromPath(imagePath),
            rawCard.hash ?? null,
            cardTypeCode,
            details.cardTypeText ?? dictMaps.cardType.get(cardTypeCode) ?? cardTypeCode,
            trainerTypeCode,
            trainerTypeCode ? (details.trainerTypeText ?? dictMaps.trainerType.get(trainerTypeCode) ?? trainerTypeCode) : null,
            energyTypeCode,
            energyTypeCode ? (details.energyTypeText ?? dictMaps.energyType.get(energyTypeCode) ?? energyTypeCode) : null,
            pokemonTypeCode,
            pokemonTypeLabel,
            specialCardCode,
            specialCardLabel,
            attributeCode,
            attributeCode ? (dictMaps.attribute.get(attributeCode) ?? attributeCode) : null,
            details.regulationMarkText ?? null,
            details.rarity ?? null,
            details.rarityText ?? null,
            details.hp ?? null,
            details.evolveText ?? null,
            ruleText || null,
            details.weaknessType && details.weaknessFormula
              ? `${dictMaps.weaknessType.get(details.weaknessType) ?? details.weaknessType} ${details.weaknessFormula}`
              : null,
            details.resistanceType && details.resistanceFormula
              ? `${dictMaps.resistanceType.get(details.resistanceType) ?? details.resistanceType} ${details.resistanceFormula}`
              : null,
            details.retreatCost ?? null,
            details.pokemonCategory ?? null,
            details.pokedexCode ?? null,
            details.pokedexText ?? null,
            details.height ?? null,
            details.weight ?? null,
            JSON.stringify(illustrators),
            searchText,
            detectDeckRuleLimit(ruleText, pokemonTypeLabel, specialCardLabel),
          );

          attacks.forEach((item, index) => {
            insertAttack.run(rawCard.id, index, item.name, item.text, JSON.stringify(item.cost), item.damage);
          });

          features.forEach((item, index) => {
            insertFeature.run(rawCard.id, index, item.name, item.text);
          });

          insertSearch.run(
            rawCard.id,
            name,
            ruleText,
            attacks.map((item) => `${item.name} ${item.text}`).join(" "),
            features.map((item) => `${item.name} ${item.text}`).join(" "),
            commodityList.map((item) => item.commodityName).join(" "),
            illustrators.join(" "),
            normalizeText(details.pokedexText),
          );
        }

        commodityList.forEach((item) => {
          insertCardCollection.run(rawCard.id, collection.id, item.commodityCode ?? null, item.commodityName);
        });
      }
    }
  });

  transaction();
}

export async function ensureDatabaseReady() {
  if (fs.existsSync(sqlitePath) && fs.statSync(sqlitePath).size > 0) {
    return;
  }

  if (!ensurePromise) {
    ensurePromise = importJsonToSqlite();
  }

  await ensurePromise;
}
