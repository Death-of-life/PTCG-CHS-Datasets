export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "PTCG CHS Database API",
    version: "2.0.0",
    description:
      "基于 SQLite 的 PTCG 简中卡牌数据库 API。列表与详情均以逻辑卡为主，具体卡面通过 printings 返回，图片资源来自 Cloudflare R2。",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v1/cards": {
      get: {
        summary: "搜索逻辑卡",
        description:
          "返回按同名且同效果合并后的逻辑卡。`q` 只搜索卡名、规则文本、招式、特性、插画师和图鉴文本，不搜索拓展包名称。",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", default: 24, minimum: 1, maximum: 60 },
          },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["collectionNumberAsc", "nameAsc"],
              default: "collectionNumberAsc",
            },
          },
          ...[
            "cardType[]",
            "attribute[]",
            "trainerType[]",
            "energyType[]",
            "pokemonType[]",
            "specialCard[]",
            "regulationMark[]",
            "rarity[]",
            "collectionId[]",
          ].map((name) => ({
            name,
            in: "query",
            schema: { type: "array", items: { type: "string" } },
            style: "form",
            explode: true,
          })),
        ],
        responses: {
          "200": {
            description: "分页逻辑卡列表",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/cards/{id}": {
      get: {
        summary: "获取单张逻辑卡详情",
        description: "`id` 为逻辑卡 ID。返回逻辑信息以及全部可选卡面。",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "逻辑卡详情",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CardDetail" },
              },
            },
          },
          "404": { description: "未找到" },
        },
      },
    },
    "/api/v1/cards/{id}/image": {
      get: {
        summary: "跳转到默认卡面的 R2 图片",
        description: "兼容接口。返回 307 重定向到逻辑卡默认卡面的 R2 图片 URL。",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "307": { description: "重定向到 R2 图片地址" },
          "404": { description: "未找到" },
        },
      },
    },
    "/api/v1/filters": {
      get: {
        summary: "获取筛选元数据",
        description: "统计以逻辑卡为单位去重。",
        responses: {
          "200": {
            description: "筛选项与统计信息",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MetaPayload" },
              },
            },
          },
        },
      },
    },
    "/api/v1/decks/validate": {
      post: {
        summary: "校验牌组",
        description: "按逻辑卡 ID 进行校验。",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        logicalCardId: { type: "integer" },
                        quantity: { type: "integer" },
                      },
                      required: ["logicalCardId", "quantity"],
                    },
                  },
                },
                required: ["entries"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "校验结果",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeckValidationResult" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      FilterOption: {
        type: "object",
        properties: {
          code: { type: "string" },
          label: { type: "string" },
          count: { type: "integer" },
        },
        required: ["code", "label"],
      },
      CardPrinting: {
        type: "object",
        properties: {
          id: { type: "integer", description: "具体卡面 / 印刷卡 ID" },
          imageUrl: { type: "string", format: "uri" },
          collectionNumber: { type: "string" },
          collectionName: { type: "string" },
          collectionId: { type: "integer" },
          collectionNames: { type: "array", items: { type: "string" } },
          collectionIds: { type: "array", items: { type: "integer" } },
          regulationMark: { type: "string", nullable: true },
          rarityCode: { type: "string", nullable: true },
          rarityLabel: { type: "string", nullable: true },
        },
        required: [
          "id",
          "imageUrl",
          "collectionNumber",
          "collectionName",
          "collectionId",
          "collectionNames",
          "collectionIds",
        ],
      },
      CardListItem: {
        type: "object",
        properties: {
          id: { type: "integer", description: "逻辑卡 ID" },
          name: { type: "string" },
          imageUrl: { type: "string", format: "uri" },
          printCount: { type: "integer" },
          printings: {
            type: "array",
            items: { $ref: "#/components/schemas/CardPrinting" },
          },
          cardTypeCode: { type: "string" },
          cardTypeLabel: { type: "string" },
          attributeCode: { type: "string", nullable: true },
          attributeLabel: { type: "string", nullable: true },
          trainerTypeCode: { type: "string", nullable: true },
          trainerTypeLabel: { type: "string", nullable: true },
          energyTypeCode: { type: "string", nullable: true },
          energyTypeLabel: { type: "string", nullable: true },
          pokemonTypeCode: { type: "string", nullable: true },
          pokemonTypeLabel: { type: "string", nullable: true },
          specialCardCode: { type: "string", nullable: true },
          specialCardLabel: { type: "string", nullable: true },
          hp: { type: "integer", nullable: true },
          evolveText: { type: "string", nullable: true },
        },
        required: [
          "id",
          "name",
          "imageUrl",
          "printCount",
          "printings",
          "cardTypeCode",
          "cardTypeLabel",
        ],
      },
      CardDetail: {
        allOf: [
          { $ref: "#/components/schemas/CardListItem" },
          {
            type: "object",
            properties: {
              yorenCode: { type: "string", nullable: true },
              ruleLines: { type: "array", items: { type: "string" } },
              attacks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    text: { type: "string" },
                    cost: { type: "array", items: { type: "string" } },
                    damage: { type: "string", nullable: true },
                  },
                  required: ["id", "name", "text", "cost"],
                },
              },
              features: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    text: { type: "string" },
                  },
                  required: ["id", "name", "text"],
                },
              },
              weakness: { type: "string", nullable: true },
              resistance: { type: "string", nullable: true },
              retreatCost: { type: "integer", nullable: true },
              illustratorNames: { type: "array", items: { type: "string" } },
              pokemonCategory: { type: "string", nullable: true },
              pokedexCode: { type: "string", nullable: true },
              pokedexText: { type: "string", nullable: true },
              height: { type: "number", nullable: true },
              weight: { type: "number", nullable: true },
              commodityCodes: { type: "array", items: { type: "string" } },
              commodityNames: { type: "array", items: { type: "string" } },
              deckRuleLimit: { type: "integer", nullable: true },
            },
            required: [
              "ruleLines",
              "attacks",
              "features",
              "illustratorNames",
              "commodityCodes",
              "commodityNames",
            ],
          },
        ],
      },
      SearchResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/CardListItem" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              pageSize: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
            required: ["page", "pageSize", "total", "totalPages"],
          },
          appliedFilters: {
            type: "object",
            properties: {
              q: { type: "string", nullable: true },
              sort: { type: "string" },
              cardTypeCodes: { type: "array", items: { type: "string" } },
              attributeCodes: { type: "array", items: { type: "string" } },
              trainerTypeCodes: { type: "array", items: { type: "string" } },
              energyTypeCodes: { type: "array", items: { type: "string" } },
              pokemonTypeCodes: { type: "array", items: { type: "string" } },
              specialCardCodes: { type: "array", items: { type: "string" } },
              regulationMarks: { type: "array", items: { type: "string" } },
              rarityCodes: { type: "array", items: { type: "string" } },
              collectionIds: { type: "array", items: { type: "string" } },
            },
            required: [
              "sort",
              "cardTypeCodes",
              "attributeCodes",
              "trainerTypeCodes",
              "energyTypeCodes",
              "pokemonTypeCodes",
              "specialCardCodes",
              "regulationMarks",
              "rarityCodes",
              "collectionIds",
            ],
          },
        },
        required: ["items", "pagination", "appliedFilters"],
      },
      MetaPayload: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              totalCards: { type: "integer", description: "逻辑卡总数" },
              totalCollections: { type: "integer" },
            },
            required: ["totalCards", "totalCollections"],
          },
          filters: {
            type: "object",
            properties: {
              cardTypes: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              attributes: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              trainerTypes: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              energyTypes: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              pokemonTypes: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              specialCards: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              regulationMarks: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              rarities: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
              collections: {
                type: "array",
                items: { $ref: "#/components/schemas/FilterOption" },
              },
            },
            required: [
              "cardTypes",
              "attributes",
              "trainerTypes",
              "energyTypes",
              "pokemonTypes",
              "specialCards",
              "regulationMarks",
              "rarities",
              "collections",
            ],
          },
        },
        required: ["summary", "filters"],
      },
      DeckValidationResult: {
        type: "object",
        properties: {
          totalCards: { type: "integer" },
          uniqueCards: { type: "integer" },
          typeBreakdown: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                level: { type: "string", enum: ["error", "warning"] },
              },
              required: ["code", "message", "level"],
            },
          },
          isValid: { type: "boolean" },
        },
        required: ["totalCards", "uniqueCards", "typeBreakdown", "issues", "isValid"],
      },
    },
  },
} as const;
