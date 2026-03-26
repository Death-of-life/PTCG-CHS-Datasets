export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "PTCG CHS Database API",
    version: "1.0.0",
    description: "基于 SQLite 的 PTCG 简中卡牌数据库 API。",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v1/cards": {
      get: {
        summary: "搜索卡牌",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 24, maximum: 60 } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["collectionNumberAsc", "nameAsc"], default: "collectionNumberAsc" } },
          ...["cardType[]", "attribute[]", "trainerType[]", "energyType[]", "pokemonType[]", "specialCard[]", "regulationMark[]", "collectionId[]"].map(
            (name) => ({
              name,
              in: "query",
              schema: { type: "array", items: { type: "string" } },
              style: "form",
              explode: true,
            }),
          ),
        ],
        responses: {
          "200": {
            description: "分页卡牌列表",
          },
        },
      },
    },
    "/api/v1/cards/{id}": {
      get: {
        summary: "获取单卡详情",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "卡牌详情" }, "404": { description: "未找到" } },
      },
    },
    "/api/v1/cards/{id}/image": {
      get: {
        summary: "获取卡图",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "PNG 图片" }, "404": { description: "未找到" } },
      },
    },
    "/api/v1/filters": {
      get: {
        summary: "获取筛选元数据",
        responses: { "200": { description: "筛选项与统计信息" } },
      },
    },
    "/api/v1/decks/validate": {
      post: {
        summary: "校验牌组",
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
                        cardId: { type: "integer" },
                        quantity: { type: "integer" },
                      },
                      required: ["cardId", "quantity"],
                    },
                  },
                },
                required: ["entries"],
              },
            },
          },
        },
        responses: { "200": { description: "校验结果" } },
      },
    },
  },
} as const;
