import type { World, WorldNode, WorldLayer } from "../types/world";

/**
 * Node positions are defined as percentages (0–100) relative to the world map
 * image (world_map_sapiens.jpg). They roughly match visible landmarks on the
 * map — cave, village, mountain temple, science buildings, DNA tower.
 */
const whatNodes: WorldNode[] = [
  {
    id: "n_cog_rev",
    name: "认知革命",
    layer: "what",
    iconType: "cave_painting",
    neighbors: ["n_fire_control"],
    sourceExcerpt:
      "约七万年前，智人开始拥有虚构故事的能力。这使得他们能突破 150 人的协作上限。",
    x: 10,
    y: 78,
  },
  {
    id: "n_fire_control",
    name: "用火控制",
    layer: "what",
    iconType: "fire",
    neighbors: ["n_cog_rev", "n_agri_rev"],
    sourceExcerpt:
      "火让人类熟食、保暖、驱赶猛兽。肠道缩短，大脑获得更多能量，夜间也能活动。",
    x: 20,
    y: 66,
  },
];

const howNodes: WorldNode[] = [
  {
    id: "n_agri_rev",
    name: "农业革命",
    layer: "how",
    iconType: "wheat",
    neighbors: ["n_fire_control", "n_settlement"],
    sourceExcerpt:
      "约一万年前，人类从采集走向农耕。小麦在中东、水稻在东亚同时被驯化。",
    x: 36,
    y: 70,
  },
  {
    id: "n_settlement",
    name: "定居与村落",
    layer: "how",
    iconType: "village",
    neighbors: ["n_agri_rev", "n_empire"],
    sourceExcerpt:
      "固定住所让财产、等级和分工成为可能。祭司、工匠、武士从农民中分化出来。",
    x: 52,
    y: 75,
  },
];

const whyNodes: WorldNode[] = [
  {
    id: "n_empire",
    name: "帝国秩序",
    layer: "why",
    iconType: "scroll",
    neighbors: ["n_settlement", "n_religion"],
    sourceExcerpt:
      "通过共同的法律、货币与虚构故事，原本敌对的族群被纳入同一个政治框架。",
    x: 50,
    y: 38,
  },
  {
    id: "n_religion",
    name: "宗教与虚构",
    layer: "why",
    iconType: "coin",
    neighbors: ["n_empire", "n_science_rev"],
    sourceExcerpt:
      "宗教通过超自然实体提供道德与社会规范，是早期社会最大规模的协作纽带。",
    x: 58,
    y: 30,
  },
];

const systemNodes: WorldNode[] = [
  {
    id: "n_science_rev",
    name: "科学革命",
    layer: "system",
    iconType: "gear",
    neighbors: ["n_religion", "n_capitalism"],
    sourceExcerpt:
      "科学革命的关键不是获得新知识，而是承认自己的无知，并以观察与数学系统填补。",
    x: 75,
    y: 52,
  },
  {
    id: "n_capitalism",
    name: "资本与科学联姻",
    layer: "system",
    iconType: "brain",
    neighbors: ["n_science_rev"],
    sourceExcerpt:
      "信用让远征成为可能，远征带来新数据，新数据滋养科学，再转化为更多资本。",
    x: 92,
    y: 22,
  },
];

const layers: WorldLayer[] = [
  { layer: "what", biomeName: "认知大草原", nodes: whatNodes },
  { layer: "how", biomeName: "农业平原", nodes: howNodes },
  { layer: "why", biomeName: "统一山脉", nodes: whyNodes },
  { layer: "system", biomeName: "科学大陆", nodes: systemNodes },
];

export const sapiensWorld: World = {
  worldId: "w_sapiens",
  title: "人类简史",
  subtitle: "从认知革命到资本帝国的认知地图",
  biomeTheme: "history-civilization",
  mapImage: "/world_map_sapiens.jpg",
  startNodeId: "n_cog_rev",
  startPosition: { x: 6, y: 85 }, // character stands at bottom-left
  layers,
};
