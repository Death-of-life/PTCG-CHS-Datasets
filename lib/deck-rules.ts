export type DeckEntry = {
  logicalCardId: number;
  quantity: number;
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

export type DeckValidationIssue = {
  code: string;
  message: string;
  level: "error" | "warning";
};

export type DeckValidationResult = {
  totalCards: number;
  uniqueCards: number;
  typeBreakdown: Record<string, number>;
  issues: DeckValidationIssue[];
  isValid: boolean;
};

const BASIC_POKEMON_TEXT = "基础";
const BASIC_ENERGY_TEXT = "基本能量";
const RADIANT_TEXT = "光辉宝可梦";
const ACE_SPEC_TEXT = "ACE SPEC";
const PRISM_TEXT = "棱镜之星";

function normalizeName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function validateDeck(
  entries: DeckEntry[],
  cardMap: Map<number, DeckValidationCard>,
): DeckValidationResult {
  const issues: DeckValidationIssue[] = [];
  const typeBreakdown: Record<string, number> = {
    宝可梦: 0,
    训练家: 0,
    能量: 0,
  };

  let totalCards = 0;
  let basicPokemonCount = 0;
  let radiantCount = 0;
  let aceSpecCount = 0;
  let prismStarCount = 0;

  for (const entry of entries) {
    totalCards += entry.quantity;
    const card = cardMap.get(entry.logicalCardId);

    if (!card) {
      issues.push({
        code: "unknown-card",
        message: `牌组中存在未知逻辑卡 ID：${entry.logicalCardId}。`,
        level: "error",
      });
      continue;
    }

    typeBreakdown[card.supertype] = (typeBreakdown[card.supertype] ?? 0) + entry.quantity;

    if (card.supertype === "宝可梦" && card.pokemonStage === BASIC_POKEMON_TEXT) {
      basicPokemonCount += entry.quantity;
    }

    if (card.pokemonTypeLabel === RADIANT_TEXT) {
      radiantCount += entry.quantity;
    }

    if (card.specialCardLabel === ACE_SPEC_TEXT) {
      aceSpecCount += entry.quantity;
    }

    if (card.specialCardLabel === PRISM_TEXT) {
      prismStarCount += entry.quantity;
    }
  }

  if (totalCards !== 60) {
    issues.push({
      code: "deck-size",
      message: `牌组必须正好 60 张，当前为 ${totalCards} 张。`,
      level: "error",
    });
  }

  if (basicPokemonCount === 0) {
    issues.push({
      code: "basic-pokemon",
      message: "牌组至少需要 1 张基础宝可梦。",
      level: "error",
    });
  }

  const byName = new Map<string, { quantity: number; card: DeckValidationCard }>();

  for (const entry of entries) {
    const card = cardMap.get(entry.logicalCardId);
    if (!card) {
      continue;
    }

    const key = normalizeName(card.name);
    const current = byName.get(key);
    if (current) {
      current.quantity += entry.quantity;
    } else {
      byName.set(key, { quantity: entry.quantity, card });
    }
  }

  for (const [name, value] of byName) {
    const { quantity, card } = value;
    const unlimitedBasicEnergy =
      card.supertype === "能量" && card.energyType === BASIC_ENERGY_TEXT;
    const deckLimit = card.deckRuleLimit ?? 4;

    if (!unlimitedBasicEnergy && quantity > deckLimit) {
      issues.push({
        code: "copy-limit",
        message: `${name} 最多可放入 ${deckLimit} 张，当前为 ${quantity} 张。`,
        level: "error",
      });
    }
  }

  if (radiantCount > 1) {
    issues.push({
      code: "radiant-limit",
      message: `光辉宝可梦最多 1 张，当前为 ${radiantCount} 张。`,
      level: "error",
    });
  }

  if (aceSpecCount > 1) {
    issues.push({
      code: "ace-spec-limit",
      message: `ACE SPEC 最多 1 张，当前为 ${aceSpecCount} 张。`,
      level: "error",
    });
  }

  if (prismStarCount > 1) {
    issues.push({
      code: "prism-star-limit",
      message: `棱镜之星最多 1 张，当前为 ${prismStarCount} 张。`,
      level: "warning",
    });
  }

  return {
    totalCards,
    uniqueCards: entries.length,
    typeBreakdown,
    issues,
    isValid: !issues.some((issue) => issue.level === "error"),
  };
}
