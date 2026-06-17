/**
 * 预制世界：《人类简史》
 * 节点字段完全对齐 PRD §2.1.4 数据契约
 */

import type { World } from "../types/world";

export const sapiensWorld: World = {
  worldId: "w_sapiens",
  title: "人类简史",
  biomeTheme: "history-civilization",
  startNodeId: "n_cog_rev",
  layers: ["what", "how", "why", "system"],

  nodes: [
    // ── What 1: 认知革命 ──────────────────────────────────────────────
    {
      id: "n_cog_rev",
      name: "认知革命",
      icon: "/nodes/node_cave_painting.png",
      mysteryQuestion: "是什么让智人和其他动物不同？",
      gateNpc: {
        id: "gate_storyteller",
        title: "讲故事的人",
        avatar: "/nodes/npc_storyteller.png",
      },
      position: { x: 500, y: 820 },
      neighbors: ["n_fire_ctrl"],
      nextDiscoveryId: "n_fire_ctrl",
      sourceExcerpt:
        "约七万年前，智人开始拥有虚构故事的能力。这使得他们能突破邓巴数字，组织大规模协作。",
      introScene: {
        sceneText: "洞穴壁画前，几个人围着火堆听同一个故事。火光映照着墙上的图腾，陌生人因共同相信同一个故事而聚在一起。",
        visualHint: "cave_fire",
        durationSec: 7,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "认知革命指智人出现更复杂语言和虚构能力的阶段，大约发生在七万年前。",
        },
        {
          type: "example",
          text: "部落神话、图腾、法律、公司、货币——这些让陌生人协作的「共同想象」，都源于认知革命。",
        },
        {
          type: "bridge",
          text: "共同故事让陌生人也能围绕同一套秩序协作，这为后来的农业革命和帝国形成奠定了基础。",
        },
      ],
      mentorPrompts: {
        whatIntro: "先别急着回答。我们先看看这个问题由哪些事实组成。",
        how: "认知革命是如何一步步扩大人类协作规模的？",
        why: "为什么虚构故事比体力更能解释智人的胜出？",
        system: "现代公司、国家和货币与认知革命有什么共同底层逻辑？",
        finalReturn: "你已经从四个角度看过它了。现在回到最初的问题：是什么让智人和其他动物不同？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 2: 用火控制 ───────────────────────────────────────────────
    {
      id: "n_fire_ctrl",
      name: "用火控制",
      icon: "/nodes/node_fire.png",
      mysteryQuestion: "火为什么改变了人类？",
      gateNpc: {
        id: "gate_fire_keeper",
        title: "持火者",
        avatar: "/nodes/node_fire.png",
      },
      position: { x: 760, y: 850 },
      neighbors: ["n_cog_rev", "n_agri_rev"],
      nextDiscoveryId: "n_agri_rev",
      sourceExcerpt:
        "火让人类熟食、保暖、驱赶猛兽。肠道缩短，大脑获得更多能量，夜间也能活动。",
      introScene: {
        sceneText: "篝火边，猎人把刚捕获的肉放在火上炙烤。熟食的香气飘散，远处的黑暗中传来野兽的咆哮。",
        visualHint: "cave_fire",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "用火控制是指人类学会使用和管理火的技术能力，包括烹饪、取暖和照明。",
        },
        {
          type: "example",
          text: "烹饪使食物更易消化、杀死寄生虫；火光驱赶猛兽，让人类能在洞穴中安全过夜。",
        },
        {
          type: "bridge",
          text: "用火让人类获得更多能量，支撑了更大的大脑——为认知革命的智力爆发提供了生理基础。",
        },
      ],
      mentorPrompts: {
        whatIntro: "火改变了什么？让我们从几个角度看看。",
        how: "火是如何具体改变人类的身体和生活的？",
        why: "为什么是智人而不是其他动物学会了用火？",
        system: "从用火到用核能，人类对能源的掌控如何改变了社会结构？",
        finalReturn: "现在你更理解火的力量了。回到最初的问题：火为什么改变了人类？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 3: 农业革命 ──────────────────────────────────────────────
    {
      id: "n_agri_rev",
      name: "农业革命",
      icon: "/nodes/node_wheat.png",
      mysteryQuestion: "为什么农民比猎人更累？",
      gateNpc: {
        id: "gate_farmer",
        title: "老农夫",
        avatar: "/nodes/npc_farmer.png",
      },
      position: { x: 1000, y: 830 },
      neighbors: ["n_fire_ctrl", "n_money"],
      nextDiscoveryId: "n_money",
      sourceExcerpt:
        "约一万年前，人类从采集走向农耕。小麦在中东、水稻在东亚同时被驯化。农业带来人口爆炸，但个体幸福未必提升。",
      introScene: {
        sceneText: "金黄的麦田一眼望不到边。老农弯腰割麦，汗水滴入泥土。远处的谷仓堆满了粮食，他却疲惫不堪。丰收与劳碌形成鲜明对比。",
        visualHint: "grain_field",
        durationSec: 7,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "农业革命指人类从采集狩猎转向种植和畜牧的转折点，约发生在一万年前。",
        },
        {
          type: "example",
          text: "小麦从野生草本被驯化为稳定作物，单位面积产量远超野生采集，但所需劳动量也大幅增加。",
        },
        {
          type: "bridge",
          text: "农业革命带来了定居生活、财产积累和社会分层——这是后来城市、国家出现的必要前提。",
        },
      ],
      mentorPrompts: {
        whatIntro: "农业革命看起来是进步，但它真的让每个人更幸福了吗？",
        how: "农业是如何具体提高粮食产量的？代价是什么？",
        why: "为什么人类会主动选择农业——既然它带来更多劳动？",
        system: "农业革命如何为后来的帝国、货币和文字奠定了基础？",
        finalReturn: "你已经从多角度审视了农业革命。回到最初的问题：为什么农民比猎人更累？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 4: 货币 ───────────────────────────────────────────────────
    {
      id: "n_money",
      name: "货币的诞生",
      icon: "/nodes/node_coin.png",
      mysteryQuestion: "为什么一张纸能买到真实食物？",
      gateNpc: {
        id: "gate_merchant",
        title: "商人",
        avatar: "/nodes/npc_merchant.png",
      },
      position: { x: 1150, y: 700 },
      neighbors: ["n_agri_rev", "n_imagined_order"],
      nextDiscoveryId: "n_imagined_order",
      sourceExcerpt:
        "货币的本质是\"集体信任\"：所有人都相信一枚金币有价值，这使得陌生人之间的交换成为可能。",
      introScene: {
        sceneText: "集市上，两个人用一枚金币完成交换。金币在阳光下闪闪发光，旁边是真实的食物和工具。\"信任\"让这张金属圆片变成了价值的载体。",
        visualHint: "market_trade",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "货币是交换媒介，其核心是基于集体信任的价值共识，而不依赖商品本身的使用价值。",
        },
        {
          type: "example",
          text: "从贝壳到金币到电子支付，货币形式不断演化，但\"信任\"这一本质从未改变。",
        },
        {
          type: "bridge",
          text: "货币让陌生人可以合作，让专业化分工成为可能——这是市场经济和大帝国的技术基础。",
        },
      ],
      mentorPrompts: {
        whatIntro: "货币看起来是理所当然的，但它的本质是什么？",
        how: "货币是如何一步步从实物走向抽象的？",
        why: "为什么只有人类能发明货币，而其他动物不能？",
        system: "从贝壳到比特币，货币的演化揭示了人类信任网络的哪些规律？",
        finalReturn: "现在你对货币有了更深的理解。回到最初的问题：为什么一张纸能买到真实食物？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 5: 想象的秩序 ────────────────────────────────────────────
    {
      id: "n_imagined_order",
      name: "想象的秩序",
      icon: "/nodes/node_scroll.png",
      mysteryQuestion: "为什么国家和公司都像故事？",
      gateNpc: {
        id: "gate_scribe",
        title: "石碑书记",
        avatar: "/nodes/npc_scribe.png",
      },
      position: { x: 1250, y: 550 },
      neighbors: ["n_money", "n_empire"],
      nextDiscoveryId: "n_empire",
      sourceExcerpt:
        "国家、公司、法律——这些\"想象的秩序\"并非客观存在，但数十亿人共同相信它们存在，从而让大规模协作成为可能。",
      introScene: {
        sceneText: "法官、商人、士兵都指向同一块石碑。石碑上没有具体文字，只象征着共同的规则。原本敌对的陌生人，因为相信同一套秩序而并肩站立。",
        visualHint: "stone_law",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "想象的秩序是指大量个体共同相信某套规则或实体的存在，从而使相应的社会结构得以运转。",
        },
        {
          type: "example",
          text: "人权、国家、公司、品牌——这些概念没有物理实体，但深刻影响人类行为。",
        },
        {
          type: "bridge",
          text: "想象的秩序让陌生人能在同一法律和市场体系下合作——它是城市、国家和全球经济的技术前提。",
        },
      ],
      mentorPrompts: {
        whatIntro: "有些东西看不见摸不着，却让亿万人遵守。是什么维持了这些秩序？",
        how: "想象的秩序是如何被建立和强化的？",
        why: "为什么人类特别擅长创造和相信\"故事\"？",
        system: "数字时代出现了哪些新的\"想象的秩序\"？",
        finalReturn: "你已经从多角度审视了想象的秩序。回到最初的问题：为什么国家和公司都像故事？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 6: 帝国 ────────────────────────────────────────────────────
    {
      id: "n_empire",
      name: "帝国的崛起",
      icon: "/nodes/node_ship.png",
      mysteryQuestion: "为什么征服者最后也会被文化改变？",
      gateNpc: {
        id: "gate_emperor",
        title: "帝王使者",
        avatar: "/nodes/npc_emperor.png",
      },
      position: { x: 1200, y: 400 },
      neighbors: ["n_imagined_order", "n_sci_rev"],
      nextDiscoveryId: "n_sci_rev",
      sourceExcerpt:
        "帝国通过军事力量征服领土，但最终往往被被征服者的文化所同化——征服者接受了被征服者的语言、宗教和习俗。",
      introScene: {
        sceneText: "征服者手持长剑走入城门，身后却逐渐换上被征服者的服饰。文化像水一样渗透，帝国在扩张中悄然改变。",
        visualHint: "empire_gate",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "帝国是一种政治实体，通过扩张和多元人口的管理维持统治，往往超越单一民族或文化边界。",
        },
        {
          type: "example",
          text: "罗马帝国采用被征服者的希腊文化；清朝皇帝自称\"天子\"采用儒家治国——征服者被同化的例子比比皆是。",
        },
        {
          type: "bridge",
          text: "帝国的多元文化融合为后来的全球化、语言传播和宗教扩散奠定了基础——文化影响超越政治边界。",
        },
      ],
      mentorPrompts: {
        whatIntro: "帝国看似强大，但文化的力量有时比刀剑更持久。为什么？",
        how: "帝国是如何维持对多元文化的统治的？",
        why: "为什么征服者总是被被征服者的文化影响？",
        system: "现代全球化是否也是一种\"新帝国\"？",
        finalReturn: "帝国与文化的关系错综复杂。回到最初的问题：为什么征服者最后也会被文化改变？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 7: 科学革命 ───────────────────────────────────────────────
    {
      id: "n_sci_rev",
      name: "科学革命",
      icon: "/nodes/node_brain.png",
      mysteryQuestion: "为什么承认无知反而带来力量？",
      gateNpc: {
        id: "gate_astronomer",
        title: "观星者",
        avatar: "/nodes/npc_astronomer.png",
      },
      position: { x: 1300, y: 220 },
      neighbors: ["n_empire", "n_capitalism"],
      nextDiscoveryId: "n_capitalism",
      sourceExcerpt:
        "科学革命的关键不是获得新知识，而是承认自己的无知，并以观察与数学系统地填补认知空白。",
      introScene: {
        sceneText: "观星者擦掉星图上的旧答案，在空白处写下\"我不知道\"。新的观察仪器指向夜空，疑问比答案更有价值。",
        visualHint: "stargazing",
        durationSec: 7,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "科学革命指约公元1500年起，人类开始系统性地以观察和实验探索未知，并承认\"无知\"是探索的起点。",
        },
        {
          type: "example",
          text: "哥白尼的地心说被推翻、达尔文的进化论被接受——科学进步往往始于对\"权威答案\"的质疑。",
        },
        {
          type: "bridge",
          text: "承认无知→提出假设→实验验证的循环，使科学能与资本和帝国联姻，催生出现代技术和全球秩序。",
        },
      ],
      mentorPrompts: {
        whatIntro: "科学革命最革命的地方，不是新发现，而是承认\"我们不知道\"。",
        how: "科学方法具体是如何运作的？",
        why: "为什么现代科学出现在欧洲而不是其他文明？",
        system: "科学革命如何与资本主义和帝国主义相互强化？",
        finalReturn: "你已经从四个角度审视了科学革命。回到最初的问题：为什么承认无知反而带来力量？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 8: 资本与科学联姻 ──────────────────────────────────────────
    {
      id: "n_capitalism",
      name: "资本与科学联姻",
      icon: "/nodes/node_coin.png",
      mysteryQuestion: "为什么信用让远征成为可能？",
      gateNpc: {
        id: "gate_capitalist",
        title: "银行家",
        avatar: "/nodes/node_coin.png",
      },
      position: { x: 1500, y: 100 },
      neighbors: ["n_sci_rev"],
      nextDiscoveryId: null,
      sourceExcerpt:
        "信用让远征成为可能，远征带来新数据，新数据滋养科学，再转化为更多资本。资本与科学的联姻形成了现代世界的核心引擎。",
      introScene: {
        sceneText: "银行的账本上写满了远航计划。投资者相信这些计划会带回财富，于是掏钱资助船只。船只出发，带回了新物种、新矿产、新市场——账本上的数字变成了真实的金银。",
        visualHint: "market_trade",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "资本主义是一种经济秩序，其中利润的再投资被视为扩大生产的主要驱动力，以私有财产和自由市场为核心。",
        },
        {
          type: "example",
          text: "哥伦布的远航由西班牙王室和热那亚商人资助；现代科技公司通过IPO和风险投资获得扩张资本。",
        },
        {
          type: "bridge",
          text: "资本主义的\"信用—投资—回报\"循环与科学的\"假设—验证—应用\"循环相互强化，共同驱动了工业革命和数字化时代。",
        },
      ],
      mentorPrompts: {
        whatIntro: "资本和科学看起来是两回事，但它们如何相互依存？",
        how: "资本主义的经济循环是如何运作的？",
        why: "为什么\"信用\"这个\"想象的秩序\"能驱动真实世界的行动？",
        system: "从工业革命到人工智能，资本与科学联姻的模式如何演化？",
        finalReturn: "你已经从多个角度审视了资本与科学的关系。回到最初的问题：为什么信用让远征成为可能？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },
  ],
};
