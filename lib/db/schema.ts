import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  commodityCode: text("commodity_code").notNull(),
  salesDate: text("sales_date"),
});

export const cards = sqliteTable(
  "cards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fingerprint: text("fingerprint").notNull(),
    name: text("name").notNull(),
    yorenCode: text("yoren_code"),
    cardTypeCode: text("card_type_code").notNull(),
    cardTypeLabel: text("card_type_label").notNull(),
    trainerTypeCode: text("trainer_type_code"),
    trainerTypeLabel: text("trainer_type_label"),
    energyTypeCode: text("energy_type_code"),
    energyTypeLabel: text("energy_type_label"),
    pokemonTypeCode: text("pokemon_type_code"),
    pokemonTypeLabel: text("pokemon_type_label"),
    specialCardCode: text("special_card_code"),
    specialCardLabel: text("special_card_label"),
    attributeCode: text("attribute_code"),
    attributeLabel: text("attribute_label"),
    hp: integer("hp"),
    evolveText: text("evolve_text"),
    ruleText: text("rule_text"),
    weakness: text("weakness"),
    resistance: text("resistance"),
    retreatCost: integer("retreat_cost"),
    pokemonCategory: text("pokemon_category"),
    pokedexCode: text("pokedex_code"),
    pokedexText: text("pokedex_text"),
    height: real("height"),
    weight: real("weight"),
    illustratorsJson: text("illustrators_json").notNull(),
    searchText: text("search_text").notNull(),
    deckRuleLimit: integer("deck_rule_limit"),
    defaultPrintingId: integer("default_printing_id"),
    defaultImageUrl: text("default_image_url"),
    sortCollectionNumber: text("sort_collection_number"),
    sortCollectionNumberNumeric: integer("sort_collection_number_numeric"),
  },
  (table) => ({
    fingerprintUnique: uniqueIndex("cards_fingerprint_idx").on(table.fingerprint),
    nameIdx: index("cards_name_idx").on(table.name),
    typeIdx: index("cards_type_idx").on(table.cardTypeCode),
    attributeIdx: index("cards_attribute_idx").on(table.attributeCode),
    sortCollectionNumberIdx: index("cards_sort_collection_number_idx").on(
      table.sortCollectionNumberNumeric,
    ),
  }),
);

export const cardPrintings = sqliteTable(
  "card_printings",
  {
    id: integer("id").primaryKey(),
    cardId: integer("card_id").notNull(),
    commodityCode: text("commodity_code"),
    imagePath: text("image_path").notNull(),
    imageUrl: text("image_url").notNull(),
    hash: text("hash"),
    collectionNumber: text("collection_number").notNull(),
    collectionNumberNumeric: integer("collection_number_numeric"),
    regulationMark: text("regulation_mark"),
    rarityCode: text("rarity_code"),
    rarityLabel: text("rarity_label"),
  },
  (table) => ({
    cardIdx: index("card_printings_card_idx").on(table.cardId),
    regulationIdx: index("card_printings_regulation_idx").on(table.regulationMark),
    rarityIdx: index("card_printings_rarity_idx").on(table.rarityCode),
  }),
);

export const cardCollections = sqliteTable(
  "card_collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    printingId: integer("printing_id").notNull(),
    collectionId: integer("collection_id").notNull(),
    commodityCode: text("commodity_code"),
    commodityName: text("commodity_name").notNull(),
  },
  (table) => ({
    printingCollectionUnique: uniqueIndex("card_collections_unique_idx").on(
      table.printingId,
      table.collectionId,
      table.commodityCode,
    ),
    printingIdIdx: index("card_collections_printing_idx").on(table.printingId),
    collectionIdIdx: index("card_collections_collection_idx").on(table.collectionId),
  }),
);

export const cardAttacks = sqliteTable(
  "card_attacks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cardId: integer("card_id").notNull(),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    text: text("text").notNull(),
    costJson: text("cost_json").notNull(),
    damage: text("damage"),
  },
  (table) => ({
    cardIdx: index("card_attacks_card_idx").on(table.cardId),
  }),
);

export const cardFeatures = sqliteTable(
  "card_features",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cardId: integer("card_id").notNull(),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    text: text("text").notNull(),
  },
  (table) => ({
    cardIdx: index("card_features_card_idx").on(table.cardId),
  }),
);

export const dictEntries = sqliteTable(
  "dict_entries",
  {
    id: integer("id").primaryKey(),
    typeCode: text("type_code").notNull(),
    dictCode: text("dict_code").notNull(),
    dictValue: text("dict_value").notNull(),
    dictSort: integer("dict_sort").notNull(),
    status: integer("status").notNull(),
  },
  (table) => ({
    typeSortIdx: index("dict_entries_type_sort_idx").on(table.typeCode, table.dictSort),
    typeCodeUnique: uniqueIndex("dict_entries_type_code_unique_idx").on(
      table.typeCode,
      table.dictCode,
    ),
  }),
);
