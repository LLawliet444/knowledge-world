import type { World, WorldNode, WorldLayer } from "../types/world";

const whatNodes: WorldNode[] = [
  {
    id: "n_scarcity",
    name: "稀缺性",
    layer: "what",
    iconType: "gear",
    neighbors: ["n_choice"],
    sourceExcerpt: "资源有限但欲望无限——这是经济学的起点。",
    x: 8,
    y: 75,
  },
  {
    id: "n_choice",
    name: "选择与权衡",
    layer: "what",
    iconType: "scroll",
    neighbors: ["n_scarcity", "n_supply_demand"],
    sourceExcerpt: "任何选择都意味着放弃另一个机会，即机会成本。",
    x: 22,
    y: 62,
  },
];

const howNodes: WorldNode[] = [
  {
    id: "n_supply_demand",
    name: "供给与需求",
    layer: "how",
    iconType: "coin",
    neighbors: ["n_choice", "n_market"],
    sourceExcerpt: "市场价格由供给与需求共同决定，并反过来调节两者。",
    x: 44,
    y: 55,
  },
  {
    id: "n_market",
    name: "市场机制",
    layer: "how",
    iconType: "village",
    neighbors: ["n_supply_demand", "n_externality"],
    sourceExcerpt: "竞争市场能有效配置资源，但需要规则与信息透明。",
    x: 60,
    y: 48,
  },
];

const whyNodes: WorldNode[] = [
  {
    id: "n_externality",
    name: "外部性",
    layer: "why",
    iconType: "brain",
    neighbors: ["n_market", "n_public_goods"],
    sourceExcerpt: "当生产或消费影响到第三方时，市场结果就不再有效率。",
    x: 75,
    y: 40,
  },
  {
    id: "n_public_goods",
    name: "公共物品",
    layer: "why",
    iconType: "tool",
    neighbors: ["n_externality", "n_gdp"],
    sourceExcerpt: "非排他、非竞争的物品通常需要政府参与提供。",
    x: 85,
    y: 34,
  },
];

const systemNodes: WorldNode[] = [
  {
    id: "n_gdp",
    name: "GDP 与宏观均衡",
    layer: "system",
    iconType: "scroll",
    neighbors: ["n_public_goods"],
    sourceExcerpt: "一国经济总量由消费、投资、政府支出与净出口组成。",
    x: 92,
    y: 22,
  },
];

const layers: WorldLayer[] = [
  { layer: "what", biomeName: "基础概念", nodes: whatNodes },
  { layer: "how", biomeName: "市场运作", nodes: howNodes },
  { layer: "why", biomeName: "市场失效", nodes: whyNodes },
  { layer: "system", biomeName: "宏观系统", nodes: systemNodes },
];

export const economicsWorld: World = {
  worldId: "w_economics",
  title: "经济学原理",
  subtitle: "从稀缺性到宏观均衡",
  biomeTheme: "social-science",
  // Reuse the same map background — the layout is still RPG-style.
  mapImage: "/world_map_sapiens.jpg",
  startPosition: { x: 6, y: 80 },
  startNodeId: "n_scarcity",
  layers,
};
