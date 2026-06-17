/**
 * 预制世界：《经济学原理》第一章
 * 目前作为备用世界，P0 阶段暂不接入
 */

import type { World } from "../types/world";

export const economicsWorld: World = {
  worldId: "w_economics",
  title: "经济学原理",
  biomeTheme: "social-science",
  startNodeId: "n_scarcity",
  layers: ["what", "how", "why", "system"],

  nodes: [
    {
      id: "n_scarcity",
      name: "稀缺性",
      icon: "/nodes/node_gear.png",
      mysteryQuestion: "为什么永远没有足够？",
      gateNpc: {
        id: "gate_scarcity",
        title: "守望者",
        avatar: "/nodes/node_gear.png",
      },
      position: { x: 300, y: 900 },
      neighbors: ["n_choice"],
      nextDiscoveryId: "n_choice",
      sourceExcerpt: "资源有限但欲望无限——这是经济学的起点。",
      introScene: {
        sceneText: "荒野中，旅人望着干涸的泉眼叹气。水就在不远处的山下，但体力已耗尽。有限的水、有限的体力——这就是稀缺。",
        visualHint: "cave_fire",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "稀缺性指人类欲望（无限）与资源及生产能力（有限）之间的基本矛盾。",
        },
        {
          type: "example",
          text: "空气曾经无限，现在洁净空气成了稀缺品；时间对所有人都是稀缺的。",
        },
        {
          type: "bridge",
          text: "稀缺性是经济学存在的理由——正是因为资源有限，我们才需要研究如何分配。",
        },
      ],
      mentorPrompts: {
        whatIntro: "稀缺听起来是坏事，但它实际上是经济学的基础。",
        how: "稀缺性如何影响人们的选择？",
        why: "为什么人类欲望是无限的？",
        system: "科技发展是解决还是加剧了稀缺问题？",
        finalReturn: "你已经从多角度审视了稀缺性。回到最初的问题：为什么永远没有足够？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    {
      id: "n_choice",
      name: "选择与权衡",
      icon: "/nodes/node_scale.png",
      mysteryQuestion: "每一个选择放弃了什么？",
      gateNpc: {
        id: "gate_choice",
        title: "岔路口守者",
        avatar: "/nodes/node_scroll.png",
      },
      position: { x: 540, y: 820 },
      neighbors: ["n_scarcity", "n_supply_demand"],
      nextDiscoveryId: "n_supply_demand",
      sourceExcerpt: "任何选择都意味着放弃另一个机会，即机会成本。",
      introScene: {
        sceneText: "岔路口，两条路延伸向不同方向。旅人站在中间，背包里的干粮只够走一条路。他必须选择。",
        visualHint: "stone_law",
        durationSec: 5,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "机会成本指为了获得某样东西而放弃的最佳替代选择的价值。",
        },
        {
          type: "example",
          text: "用100元买书就不能买衣服，书的机会成本是那件衣服的价值。",
        },
        {
          type: "bridge",
          text: "机会成本是理解个人决策、企业投资和政府政策的关键工具。",
        },
      ],
      mentorPrompts: {
        whatIntro: "选择必然带来放弃——经济学从放弃中看世界。",
        how: "机会成本如何帮助我们做出更好的决策？",
        why: "为什么人们常常忽视机会成本？",
        system: "社会的机会成本总和如何衡量？",
        finalReturn: "你已经从多角度审视了选择与权衡。回到最初的问题：每一个选择放弃了什么？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    {
      id: "n_supply_demand",
      name: "供给与需求",
      icon: "/nodes/node_coin.png",
      mysteryQuestion: "价格到底是谁决定的？",
      gateNpc: {
        id: "gate_market",
        title: "市场主持",
        avatar: "/nodes/npc_merchant.png",
      },
      position: { x: 780, y: 900 },
      neighbors: ["n_choice", "n_market_fail"],
      nextDiscoveryId: "n_market_fail",
      sourceExcerpt: "市场价格由供给与需求共同决定，并反过来调节两者。",
      introScene: {
        sceneText: "集市的早晨，卖家挂出货物，买家走近询价。价高则买家减少、卖家增多；价低则相反。最终，一个双方都能接受的价格浮现。",
        visualHint: "market_trade",
        durationSec: 6,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "供给指在某一价格下生产者愿意且能够提供的商品数量；需求指在某一价格下消费者愿意且能够购买的商品数量。",
        },
        {
          type: "example",
          text: "疫情时口罩供给不足，价格飙升；疫情结束后，口罩厂产能过剩，价格回落。",
        },
        {
          type: "bridge",
          text: "供需均衡是理解几乎所有市场价格——从房价到工资到股价——的基础。",
        },
      ],
      mentorPrompts: {
        whatIntro: "价格看起来是卖家定的，但实际上是谁在背后操纵？",
        how: "供给和需求如何共同决定均衡价格？",
        why: "为什么有些商品价格稳定，有些却剧烈波动？",
        system: "供需均衡在劳动力市场（工资）和金融市场（股价）中如何体现？",
        finalReturn: "你已经从多角度审视了供需关系。回到最初的问题：价格到底是谁决定的？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    {
      id: "n_market_fail",
      name: "市场失灵",
      icon: "/nodes/node_tribe.png",
      mysteryQuestion: "为什么市场有时也会失灵？",
      gateNpc: {
        id: "gate_market_fail",
        title: "公共牧者",
        avatar: "/nodes/node_tribe.png",
      },
      position: { x: 1020, y: 780 },
      neighbors: ["n_supply_demand", "n_pub_goods"],
      nextDiscoveryId: "n_pub_goods",
      sourceExcerpt: "当生产或消费影响到第三方时，市场结果就不再有效率。",
      introScene: {
        sceneText: "公共牧场上，每个牧人都想放更多牛——多出来的牛吃的是别人的草。草地逐渐沙化，但没有人愿意先减少牛群。公地悲剧在反复上演。",
        visualHint: "grain_field",
        durationSec: 7,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "市场失灵指市场无法有效配置资源的情况，包括外部性、公共物品、信息不对称和垄断。",
        },
        {
          type: "example",
          text: "工厂排污影响居民健康（负外部性）；盗版削弱创新激励（知识产权问题）。",
        },
        {
          type: "bridge",
          text: "市场失灵是政府干预的理论依据——但政府干预也可能带来新的失灵。",
        },
      ],
      mentorPrompts: {
        whatIntro: "市场是强大的工具，但它有弱点。哪些情况下市场会失灵？",
        how: "外部性、公共物品和信息不对称如何导致市场失灵？",
        why: "为什么个体理性追求最大利益会导致集体受损（公地悲剧）？",
        system: "政府干预能否完全解决市场失灵？为什么有时政府也会失灵？",
        finalReturn: "你已经从多角度审视了市场失灵。回到最初的问题：为什么市场有时也会失灵？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    {
      id: "n_pub_goods",
      name: "公共物品",
      icon: "/nodes/node_village.png",
      mysteryQuestion: "谁为路灯付钱？",
      gateNpc: {
        id: "gate_pub",
        title: "守夜人",
        avatar: "/nodes/node_village.png",
      },
      position: { x: 1260, y: 620 },
      neighbors: ["n_market_fail"],
      nextDiscoveryId: null,
      sourceExcerpt: "非排他、非竞争的物品通常需要政府参与提供。",
      introScene: {
        sceneText: "夜幕降临，路灯依次亮起。每一个夜行者都受益，但没有人在路灯下被要求付款。那是谁付的钱？",
        visualHint: "stargazing",
        durationSec: 5,
        trigger: "first_enter_what",
        state: "unseen",
      },
      whatCards: [
        {
          type: "definition",
          text: "公共物品具有非排他性（无法排除他人使用）和非竞争性（一人使用不减少他人可用量），如国防、路灯、基础研究。",
        },
        {
          type: "example",
          text: "新冠病毒疫苗：接种不减少他人可获得的剂量（非竞争性），且理论上难以完全排除未付费者使用（非排他性）。",
        },
        {
          type: "bridge",
          text: "公共物品问题解释了为什么有些东西——如教育、基础科学——市场无法充分提供，需要政府或社会机制介入。",
        },
      ],
      mentorPrompts: {
        whatIntro: "有些东西大家都需要，但没人愿意单独付钱。为什么？",
        how: "公共物品如何区别于私人物品？",
        why: "为什么会出现\"搭便车\"问题？",
        system: "数字时代的公共物品（社交网络、开源代码）如何解决？",
        finalReturn: "你已经从多角度审视了公共物品。回到最初的问题：谁为路灯付钱？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },
  ],
};
