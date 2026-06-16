import type { World, WorldNode, WorldLayer } from "../types/world";

const whatNodes: WorldNode[] = [
  {
    id: "n_cog_rev",
    name: "认知革命",
    layer: "what",
    iconType: "cave_painting",
    neighbors: ["n_fire_control", "n_homo_sapiens"],
    sourceExcerpt:
      "约七万年前，智人开始拥有虚构故事的能力，这使得他们能突破 150 人的协作上限，建立大规模、灵活的社会网络。",
  },
  {
    id: "n_fire_control",
    name: "用火控制",
    layer: "what",
    iconType: "fire",
    neighbors: ["n_cog_rev", "n_homo_sapiens"],
    sourceExcerpt:
      "火的控制让人类能食用难以咀嚼的食物，肠道缩短、大脑获得更多能量，并且在夜间提供保护与温暖。",
  },
  {
    id: "n_homo_sapiens",
    name: "智人扩散",
    layer: "what",
    iconType: "tribe",
    neighbors: ["n_cog_rev", "n_fire_control", "n_agri_rev"],
    sourceExcerpt:
      "从东非出发，智人在几万年之内扩散到欧亚大陆、美洲与大洋洲，所到之处大型动物纷纷灭绝。",
  },
];

const howNodes: WorldNode[] = [
  {
    id: "n_agri_rev",
    name: "农业革命",
    layer: "how",
    iconType: "wheat",
    neighbors: ["n_homo_sapiens", "n_village", "n_empire"],
    sourceExcerpt:
      "约一万年前，人类从采集转向农耕。小麦等作物驯化了人类，使人口爆炸，但个体未必更幸福。",
  },
  {
    id: "n_village",
    name: "定居与村落",
    layer: "how",
    iconType: "village",
    neighbors: ["n_agri_rev", "n_empire"],
    sourceExcerpt:
      "固定的住所和粮食储存催生了财产、等级与社会分工，祭司、工匠与武士从农民中分化出来。",
  },
  {
    id: "n_empire",
    name: "帝国秩序",
    layer: "how",
    iconType: "scale",
    neighbors: ["n_village", "n_religion", "n_money"],
    sourceExcerpt:
      "帝国通过共同的法律、语言与虚构故事，把原本敌对的族群纳入同一政治框架下。",
  },
];

const whyNodes: WorldNode[] = [
  {
    id: "n_money",
    name: "金钱系统",
    layer: "why",
    iconType: "coin",
    neighbors: ["n_empire", "n_religion", "n_science_rev"],
    sourceExcerpt:
      "金钱是人类发明的最成功的互信系统——所有人都愿意相信一张本身毫无价值的纸币。",
  },
  {
    id: "n_religion",
    name: "宗教与虚构故事",
    layer: "why",
    iconType: "scroll",
    neighbors: ["n_empire", "n_money", "n_science_rev"],
    sourceExcerpt:
      "宗教通过超自然实体提供道德与社会规范，是早期社会最大规模的协作纽带。",
  },
];

const systemNodes: WorldNode[] = [
  {
    id: "n_science_rev",
    name: "科学革命",
    layer: "system",
    iconType: "gear",
    neighbors: ["n_money", "n_religion", "n_capitalism"],
    sourceExcerpt:
      "科学革命的关键不是获得新知识，而是承认自己的无知，并以观察与数学系统地填补无知。",
  },
  {
    id: "n_capitalism",
    name: "资本主义与帝国联姻",
    layer: "system",
    iconType: "ship",
    neighbors: ["n_science_rev"],
    sourceExcerpt:
      "资本、科学与帝国三者相互推动：信用让远征成为可能，远征带来新数据，新数据促进科学，再转化为更多资本。",
  },
];

const layers: WorldLayer[] = [
  { layer: "what", biomeName: "认知大草原", nodes: whatNodes },
  { layer: "how", biomeName: "结构金绿林", nodes: howNodes },
  { layer: "why", biomeName: "因果石灰原", nodes: whyNodes },
  { layer: "system", biomeName: "系统紫蓝海", nodes: systemNodes },
];

export const sapiensWorld: World = {
  worldId: "w_sapiens",
  title: "人类简史",
  subtitle: "从认知革命到资本帝国的认知地图",
  biomeTheme: "history-civilization",
  layers,
  startNodeId: "n_cog_rev",
};
