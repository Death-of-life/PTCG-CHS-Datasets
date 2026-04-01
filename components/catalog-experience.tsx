"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./catalog-experience.module.css";

type Summary = {
  totalCards: number;
  totalCollections: number;
};

type FilterOption = {
  code: string;
  label: string;
  count?: number;
};

type MetaPayload = {
  summary: Summary;
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

type CardPrinting = {
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

type CardListItem = {
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

type CardDetail = CardListItem & {
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

type SearchResponse = {
  items: CardListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type DeckEntry = {
  logicalCardId: number;
  quantity: number;
};

type DeckValidationResult = {
  totalCards: number;
  uniqueCards: number;
  typeBreakdown: Record<string, number>;
  issues: Array<{
    code: string;
    message: string;
    level: "error" | "warning";
  }>;
  isValid: boolean;
};

const emptyValidation: DeckValidationResult = {
  totalCards: 0,
  uniqueCards: 0,
  typeBreakdown: { 宝可梦: 0, 训练家: 0, 能量: 0 },
  issues: [],
  isValid: false,
};

const deckStorageKey = "ptcg-deck-builder-v3";

type Props = {
  mode: "browse" | "deck";
  initialSummary: Summary;
};

export function CatalogExperience({ mode, initialSummary }: Props) {
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({
    items: [],
    pagination: { page: 1, pageSize: 24, total: 0, totalPages: 1 },
  });
  const [page, setPage] = useState(1);
  const [selectedLogicalCardId, setSelectedLogicalCardId] = useState<number | null>(null);
  const [selectedPrintingId, setSelectedPrintingId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deck, setDeck] = useState<DeckEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const value = window.localStorage.getItem(deckStorageKey);
    if (!value) return [];
    try {
      return JSON.parse(value) as DeckEntry[];
    } catch {
      return [];
    }
  });
  const [validation, setValidation] = useState<DeckValidationResult>(emptyValidation);
  const [cardCache, setCardCache] = useState<Record<number, CardListItem | CardDetail>>({});
  const selectedLogicalCardIdRef = useRef<number | null>(null);

  const [filters, setFilters] = useState({
    cardType: [] as string[],
    attribute: [] as string[],
    trainerType: [] as string[],
    energyType: [] as string[],
    pokemonType: [] as string[],
    specialCard: [] as string[],
    regulationMark: [] as string[],
    rarity: [] as string[],
    collectionId: [] as string[],
  });

  const activePrinting = useMemo(() => {
    if (!selectedCard) return null;
    return (
      selectedCard.printings.find((printing) => printing.id === selectedPrintingId) ??
      selectedCard.printings[0] ??
      null
    );
  }, [selectedCard, selectedPrintingId]);

  const deckCards = useMemo(
    () =>
      deck
        .map((entry) => ({
          ...entry,
          card: cardCache[entry.logicalCardId] ?? null,
        }))
        .sort((left, right) => left.logicalCardId - right.logicalCardId),
    [cardCache, deck],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "24",
      sort: "collectionNumberAsc",
    });

    if (debouncedQuery) params.set("q", debouncedQuery);
    for (const [key, values] of Object.entries(filters)) {
      values.forEach((value) => params.append(`${key}[]`, value));
    }

    fetch(`/api/v1/filters?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: MetaPayload) => {
        setMeta(payload);
      });
  }, [debouncedQuery, filters]);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "24",
      sort: "collectionNumberAsc",
    });

    if (debouncedQuery) params.set("q", debouncedQuery);

    for (const [key, values] of Object.entries(filters)) {
      values.forEach((value) => params.append(`${key}[]`, value));
    }

    const controller = new AbortController();

    fetch(`/api/v1/cards?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: SearchResponse) => {
        setResults(payload);
        setLoadingCards(false);
        setCardCache((current) => {
          const next = { ...current };
          payload.items.forEach((item) => {
            next[item.id] = item;
          });
          return next;
        });

        if (!payload.items.length) {
          setSelectedLogicalCardId(null);
          setSelectedPrintingId(null);
          setSelectedCard(null);
          return;
        }

        const stillVisible = payload.items.some((item) => item.id === selectedLogicalCardIdRef.current);
        if (!stillVisible) {
          const firstCard = payload.items[0];
          setLoadingDetail(true);
          setSelectedLogicalCardId(firstCard.id);
          setSelectedPrintingId(firstCard.printings[0]?.id ?? null);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadingCards(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, filters, page]);

  useEffect(() => {
    selectedLogicalCardIdRef.current = selectedLogicalCardId;
  }, [selectedLogicalCardId]);

  useEffect(() => {
    if (!selectedLogicalCardId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/v1/cards/${selectedLogicalCardId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: CardDetail) => {
        setSelectedCard(payload);
        setCardCache((current) => ({ ...current, [payload.id]: payload }));
        setSelectedPrintingId((currentPrintingId) => {
          if (currentPrintingId && payload.printings.some((printing) => printing.id === currentPrintingId)) {
            return currentPrintingId;
          }
          return payload.printings[0]?.id ?? null;
        });
        setLoadingDetail(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [selectedLogicalCardId]);

  useEffect(() => {
    if (typeof window === "undefined" || mode !== "deck") return;
    window.localStorage.setItem(deckStorageKey, JSON.stringify(deck));

    const controller = new AbortController();
    fetch("/api/v1/decks/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: deck }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: DeckValidationResult) => setValidation(payload))
      .catch(() => undefined);

    return () => controller.abort();
  }, [deck, mode]);

  function toggleFilter(group: keyof typeof filters, value: string) {
    setLoadingCards(true);
    setPage(1);
    setFilters((current) => {
      const set = new Set(current[group]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return {
        ...current,
        [group]: Array.from(set),
      };
    });
  }

  function clearFilters() {
    setLoadingCards(true);
    setPage(1);
    setQuery("");
    setDebouncedQuery("");
    setFilters({
      cardType: [],
      attribute: [],
      trainerType: [],
      energyType: [],
      pokemonType: [],
      specialCard: [],
      regulationMark: [],
      rarity: [],
      collectionId: [],
    });
  }

  function addCard(logicalCardId: number) {
    setDeck((current) => {
      const existing = current.find((item) => item.logicalCardId === logicalCardId);
      if (existing) {
        return current.map((item) =>
          item.logicalCardId === logicalCardId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { logicalCardId, quantity: 1 }];
    });
  }

  function removeCard(logicalCardId: number) {
    setDeck((current) =>
      current
        .map((item) =>
          item.logicalCardId === logicalCardId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>PTCG CHS DATABASE</p>
          <h1>{mode === "deck" ? "牌组编辑器" : "逻辑卡数据库"}</h1>
          <p className={styles.heroText}>
            同名同效果的卡牌已合并为逻辑卡，详情区可切换不同拓展包与不同卡面的印刷版本。
          </p>
        </div>
        <nav className={styles.nav}>
          <Link href="/cards" className={mode === "browse" ? styles.navActive : styles.navLink}>
            卡牌库
          </Link>
          <Link href="/decks" className={mode === "deck" ? styles.navActive : styles.navLink}>
            牌组编辑
          </Link>
          <Link href="/api/docs" className={styles.navLink}>
            API Docs
          </Link>
        </nav>
        <div className={styles.heroStats}>
          <div>
            <span>逻辑卡总数</span>
            <strong>{meta?.summary.totalCards ?? initialSummary.totalCards}</strong>
          </div>
          <div>
            <span>卡包数量</span>
            <strong>{meta?.summary.totalCollections ?? initialSummary.totalCollections}</strong>
          </div>
        </div>
      </header>

      <section className={mode === "deck" ? styles.layoutDeck : styles.layoutBrowse}>
        <aside className={styles.filtersPanel}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>搜索与筛选</h2>
              <button onClick={clearFilters}>清空</button>
            </div>
            <input
              className={styles.searchInput}
              value={query}
              placeholder="搜索卡名、规则文本、招式、特性、插画师、图鉴"
              onChange={(event) => {
                setLoadingCards(true);
                setPage(1);
                setQuery(event.target.value);
              }}
            />
            <div className={styles.filterGroups}>
              <FilterGroup title="卡种" options={meta?.filters.cardTypes ?? []} value={filters.cardType} onToggle={(code) => toggleFilter("cardType", code)} />
              <FilterGroup title="属性" options={meta?.filters.attributes ?? []} value={filters.attribute} onToggle={(code) => toggleFilter("attribute", code)} />
              <FilterGroup title="训练家" options={meta?.filters.trainerTypes ?? []} value={filters.trainerType} onToggle={(code) => toggleFilter("trainerType", code)} />
              <FilterGroup title="能量" options={meta?.filters.energyTypes ?? []} value={filters.energyType} onToggle={(code) => toggleFilter("energyType", code)} />
              <FilterGroup title="特殊规则" options={meta?.filters.pokemonTypes ?? []} value={filters.pokemonType} onToggle={(code) => toggleFilter("pokemonType", code)} />
              <FilterGroup title="特殊机制" options={meta?.filters.specialCards ?? []} value={filters.specialCard} onToggle={(code) => toggleFilter("specialCard", code)} />
              <FilterGroup title="规则标" options={meta?.filters.regulationMarks ?? []} value={filters.regulationMark} onToggle={(code) => toggleFilter("regulationMark", code)} />
              <FilterGroup title="稀有度" options={meta?.filters.rarities ?? []} value={filters.rarity} onToggle={(code) => toggleFilter("rarity", code)} />
              <FilterGroup title="卡包" options={meta?.filters.collections ?? []} value={filters.collectionId} onToggle={(code) => toggleFilter("collectionId", code)} />
            </div>
          </div>
        </aside>

        <section className={styles.resultsColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>结果</h2>
              <div className={styles.pagination}>
                <button
                  disabled={results.pagination.page <= 1}
                  onClick={() => {
                    setLoadingCards(true);
                    setPage((current) => current - 1);
                  }}
                >
                  上一页
                </button>
                <span>
                  {results.pagination.page} / {results.pagination.totalPages} · {results.pagination.total} 张逻辑卡
                </span>
                <button
                  disabled={results.pagination.page >= results.pagination.totalPages}
                  onClick={() => {
                    setLoadingCards(true);
                    setPage((current) => current + 1);
                  }}
                >
                  下一页
                </button>
              </div>
            </div>

            {loadingCards ? (
              <div className={styles.emptyState}>正在查询数据库……</div>
            ) : (
              <div className={styles.cardGrid}>
                {results.items.map((card) => {
                  const primaryPrinting = card.printings[0] ?? null;

                  return (
                    <article
                      key={card.id}
                      className={`${styles.card} ${selectedLogicalCardId === card.id ? styles.cardSelected : ""}`}
                    >
                      <button
                        className={styles.cardButton}
                        onClick={() => {
                          setLoadingDetail(true);
                          setSelectedLogicalCardId(card.id);
                          setSelectedPrintingId(primaryPrinting?.id ?? null);
                        }}
                      >
                        <Image alt={card.name} src={card.imageUrl} width={320} height={447} unoptimized className={styles.cardImage} />
                        <div className={styles.cardBody}>
                          <strong>{card.name}</strong>
                          <span>{primaryPrinting ? `${primaryPrinting.collectionName} · ${primaryPrinting.collectionNumber}` : "未标记卡面"}</span>
                          <span>共 {card.printCount} 个卡面 / 印刷版本</span>
                          <div className={styles.tagRow}>
                            <Tag text={card.cardTypeLabel} />
                            {card.attributeLabel ? <Tag text={card.attributeLabel} /> : null}
                            {card.pokemonTypeLabel ? <Tag text={card.pokemonTypeLabel} /> : null}
                            {card.specialCardLabel ? <Tag text={card.specialCardLabel} /> : null}
                            {primaryPrinting?.regulationMark ? <Tag text={`Reg ${primaryPrinting.regulationMark}`} /> : null}
                          </div>
                        </div>
                      </button>
                      {mode === "deck" ? (
                        <button className={styles.addButton} onClick={() => addCard(card.id)}>
                          加入牌组
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>卡牌详情</h2>
              {activePrinting ? <a href={activePrinting.imageUrl}>R2 图片</a> : null}
            </div>
            {loadingDetail || !selectedCard ? (
              <div className={styles.emptyState}>选择一张逻辑卡查看详情。</div>
            ) : (
              <div className={styles.detailPanel}>
                <Image
                  alt={selectedCard.name}
                  src={activePrinting?.imageUrl ?? selectedCard.imageUrl}
                  width={320}
                  height={447}
                  unoptimized
                  className={styles.detailImage}
                />
                <div className={styles.detailMeta}>
                  <h3>{selectedCard.name}</h3>
                  <p>
                    {activePrinting
                      ? `${activePrinting.collectionName} · ${activePrinting.collectionNumber}`
                      : "未选择卡面"}
                  </p>
                  <p>共 {selectedCard.printCount} 个卡面 / 印刷版本</p>
                  <div className={styles.tagRow}>
                    <Tag text={selectedCard.cardTypeLabel} />
                    {selectedCard.attributeLabel ? <Tag text={selectedCard.attributeLabel} /> : null}
                    {selectedCard.pokemonTypeLabel ? <Tag text={selectedCard.pokemonTypeLabel} /> : null}
                    {selectedCard.specialCardLabel ? <Tag text={selectedCard.specialCardLabel} /> : null}
                    {activePrinting?.regulationMark ? <Tag text={`规则标 ${activePrinting.regulationMark}`} /> : null}
                    {activePrinting?.rarityLabel ? <Tag text={activePrinting.rarityLabel} /> : null}
                  </div>
                  <div className={styles.printingSwitcher}>
                    {selectedCard.printings.map((printing) => (
                      <button
                        key={printing.id}
                        className={printing.id === activePrinting?.id ? styles.printingChipActive : styles.printingChip}
                        onClick={() => setSelectedPrintingId(printing.id)}
                      >
                        <strong>{printing.collectionNumber || `卡面 #${printing.id}`}</strong>
                        <span>{printing.collectionName}</span>
                      </button>
                    ))}
                  </div>
                  <dl className={styles.metaGrid}>
                    <div><dt>HP</dt><dd>{selectedCard.hp ?? "-"}</dd></div>
                    <div><dt>阶段</dt><dd>{selectedCard.evolveText ?? "-"}</dd></div>
                    <div><dt>稀有度</dt><dd>{activePrinting?.rarityLabel ?? "-"}</dd></div>
                    <div><dt>弱点</dt><dd>{selectedCard.weakness ?? "-"}</dd></div>
                    <div><dt>抵抗</dt><dd>{selectedCard.resistance ?? "-"}</dd></div>
                    <div><dt>撤退</dt><dd>{selectedCard.retreatCost ?? "-"}</dd></div>
                    <div><dt>插画师</dt><dd>{selectedCard.illustratorNames.join(" / ") || "-"}</dd></div>
                    <div><dt>收录</dt><dd>{activePrinting?.collectionNames.join(" / ") || "-"}</dd></div>
                  </dl>
                </div>
                <DetailSection title="特性 / 机制" items={selectedCard.features.map((feature) => ({ title: feature.name, text: feature.text }))} />
                <DetailSection
                  title="招式"
                  items={selectedCard.attacks.map((attack) => ({
                    title: `${attack.name}${attack.damage ? ` · ${attack.damage}` : ""}`,
                    text: `${attack.cost.length ? `费用：${attack.cost.join(" / ")}` : "费用：-"}${attack.text ? `\n${attack.text}` : ""}`,
                  }))}
                />
                <PlainSection title="规则文本" lines={selectedCard.ruleLines} />
                <PlainSection title="图鉴" lines={selectedCard.pokedexText ? [selectedCard.pokedexText] : []} />
              </div>
            )}
          </div>

          {mode === "deck" ? (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>当前牌组</h2>
                <button onClick={() => setDeck([])}>清空</button>
              </div>
              <div className={styles.deckStats}>
                <div><span>总张数</span><strong>{validation.totalCards} / 60</strong></div>
                <div><span>宝可梦</span><strong>{validation.typeBreakdown["宝可梦"] ?? 0}</strong></div>
                <div><span>训练家</span><strong>{validation.typeBreakdown["训练家"] ?? 0}</strong></div>
                <div><span>能量</span><strong>{validation.typeBreakdown["能量"] ?? 0}</strong></div>
              </div>
              <div className={styles.deckList}>
                {deckCards.length ? (
                  deckCards.map((entry) => {
                    const card = entry.card;
                    const primaryPrinting = card?.printings[0];

                    return (
                      <div key={entry.logicalCardId} className={styles.deckItem}>
                        <div>
                          <strong>{card?.name ?? `逻辑卡 #${entry.logicalCardId}`}</strong>
                          <span>
                            {primaryPrinting
                              ? `${primaryPrinting.collectionName} · ${primaryPrinting.collectionNumber}`
                              : ""}
                          </span>
                        </div>
                        <div className={styles.deckActions}>
                          <button onClick={() => removeCard(entry.logicalCardId)}>-</button>
                          <strong>{entry.quantity}</strong>
                          <button onClick={() => addCard(entry.logicalCardId)}>+</button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>从左侧结果列表加入逻辑卡。</div>
                )}
              </div>
              <div className={styles.validationList}>
                {validation.issues.length ? (
                  validation.issues.map((issue) => (
                    <div key={`${issue.code}-${issue.message}`} className={issue.level === "error" ? styles.validationError : styles.validationWarning}>
                      {issue.message}
                    </div>
                  ))
                ) : (
                  <div className={styles.validationOk}>当前牌组符合基础组牌规则。</div>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function FilterGroup({
  title,
  options,
  value,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  value: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <section className={styles.filterGroup}>
      <h3>{title}</h3>
      <div className={styles.checkboxList}>
        {options.map((option) => (
          <label key={`${title}-${option.code}`} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={value.includes(option.code)}
              disabled={(option.count ?? 0) === 0 && !value.includes(option.code)}
              onChange={() => onToggle(option.code)}
            />
            <span>
              {option.label}
              {typeof option.count === "number" ? ` (${option.count})` : ""}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function Tag({ text }: { text: string }) {
  return <span className={styles.tag}>{text}</span>;
}

function DetailSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; text: string }>;
}) {
  if (!items.length) return null;
  return (
    <section className={styles.detailSection}>
      <h4>{title}</h4>
      {items.map((item, index) => (
        <div key={`${title}-${index}`} className={styles.detailBlock}>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </div>
      ))}
    </section>
  );
}

function PlainSection({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <section className={styles.detailSection}>
      <h4>{title}</h4>
      {lines.map((line, index) => (
        <p key={`${title}-${index}`}>{line}</p>
      ))}
    </section>
  );
}
