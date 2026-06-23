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
  scholarStartByDepth: { what: { x: 60, y: 1020 }, how: { x: 60, y: 1020 }, why: { x: 60, y: 1020 }, system: { x: 60, y: 1020 } },
  layers: ["what", "how", "why", "system"],

  nodes: [
    {
      id: "n_scarcity",
      name: "稀缺性",
      icon: "/nodes/node_gear.png",
      iconNpc: "/scenes/cave_fire/gate_npc_2.png",
      mysteryQuestion: "为什么永远没有足够？",
      gateNpc: {
        id: "gate_scarcity",
        title: "守望者",
        avatar: "/nodes/node_gear.png",
      },
      positions: { what: { x: 300, y: 900 }, how: { x: 300, y: 900 }, why: { x: 300, y: 900 }, system: { x: 300, y: 900 } },
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
        whatDialogue: [
          { speaker: "scholar", text: "缺水、缺粮、缺钱……这些都是'不够'。但我总觉得想要'更多'是人的本性，这有什么好研究的？" },
          { speaker: "mentor", text: "正因为这是人的本性，'不够'才成了永恒的命题。如果哪天所有东西都无限，经济学也就消失了——但那一天不会来。" },
          { speaker: "scholar", text: "那为什么要把'稀缺'单独拎出来当成学科的起点？" },
          { speaker: "mentor", text: "因为稀缺逼迫我们做选择，而选择就意味着代价。经济学不是研究'钱'的学问，是研究'如何在不够的世界里做决定'的学问。" },
          { speaker: "mentor", text: "理解稀缺，是理解一切经济现象——从一瓶水到一份工资——的起点。" },
        ],
        whatScrolls: [
          { type: "definition", title: "稀缺性的定义", content: "稀缺性指人类欲望（无限）与资源及生产能力（有限）之间的基本矛盾。这不是某个时代的问题，而是人类社会的永恒状态。", mentorVoice: "第一张卷轴给稀缺下了个定义：不是'暂时没有'，而是'永远不可能够'。这才是关键。" },
          { type: "example", title: "洁净空气：从无限到稀缺", content: "空气曾经是免费且无限的。但工业革命之后，洁净空气成了稀缺品——有些城市里，呼吸一口干净的空气要钱。", mentorVoice: "这张卷轴画了'曾经无限的空气变成稀缺品'的过程。它说明稀缺不是固定的——昨天的无限，可能是今天的稀缺。" },
          { type: "bridge", title: "稀缺是经济学存在的理由", content: "如果没有稀缺，就不需要分配；不需要分配，就没有'经济'。稀缺是一切经济问题的原点——价格、市场、货币、贸易，都是人类应对稀缺的发明。", mentorVoice: "最后这张卷轴是连接：稀缺性是经济学的'原点'。没有稀缺，就没有价格、没有市场、没有货币。理解这一点，你就能把所有经济学串起来。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来稀缺不是'不够'这么简单，它背后是欲望无限和资源有限的永恒矛盾……" },
          { speaker: "mentor", text: "对。选一张你觉得最关键的卷轴——它会成为我们继续深入的起点。" },
        ],
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
      iconNpc: "/scenes/stone_law/gate_npc.png",
      mysteryQuestion: "每一个选择放弃了什么？",
      gateNpc: {
        id: "gate_choice",
        title: "岔路口守者",
        avatar: "/nodes/node_scroll.png",
      },
      positions: { what: { x: 540, y: 820 }, how: { x: 540, y: 820 }, why: { x: 540, y: 820 }, system: { x: 540, y: 820 } },
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
        whatDialogue: [
          { speaker: "scholar", text: "我想买书，又想买衣服，钱只够买一样。这种'两难'天天发生……" },
          { speaker: "mentor", text: "这就是经济学里说的'机会成本'——你选A放弃的，就是A的机会成本。注意：是'放弃的最佳替代物'，不是所有放弃的东西。" },
          { speaker: "scholar", text: "那'机会成本'是真实花出去的钱吗？" },
          { speaker: "mentor", text: "不是。它是看不见的成本——你为了得到A，放弃了什么。很多时候，放弃的反而比得到的更值钱。" },
          { speaker: "mentor", text: "理解机会成本，能帮你避开一个常见错觉：'免费的东西最贵'。因为表面上没付钱，背后的放弃往往被忽略。" },
        ],
        whatScrolls: [
          { type: "definition", title: "机会成本的定义", content: "机会成本指为了获得某样东西而放弃的最佳替代选择的价值。它不是实际支付的成本，而是'看不见的代价'。", mentorVoice: "第一张卷轴给机会成本下了个定义：不是'花了多少钱'，而是'放弃了什么'。看不见的代价，往往比看得到的更重。" },
          { type: "example", title: "100元买书还是买衣服？", content: "用100元买书就不能买衣服。此时书的机会成本不是100元，而是'那件本可以买到的衣服的价值'。如果衣服能让你更自信地工作，书的成本就是那份自信。", mentorVoice: "这张卷轴画的是'100元怎么花'的难题。注意：书的机会成本不是100元，是那件衣服可能带给你的价值——可能比书还大。" },
          { type: "bridge", title: "免费的东西最贵", content: "免费看视频的机会成本是'这段时间本可以做的其他事'——学习、陪伴、运动、休息。免费不等于无成本。读懂这一点，能避免很多'被时间骗'的决策。", mentorVoice: "最后这张卷轴是一个现代连接：免费视频看着免费，但机会成本可能很高——这段时间本可以做别的事。理解机会成本，是避免'时间贫困'的开始。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来选A不只是'得到A'，还是'放弃B'。每个选择都背着看不见的代价……" },
          { speaker: "mentor", text: "对。选一张你最关心的卷轴——它会带我们看得更深。" },
        ],
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
      iconNpc: "/scenes/market_trade/gate_npc.png",
      mysteryQuestion: "价格到底是谁决定的？",
      gateNpc: {
        id: "gate_market",
        title: "市场主持",
        avatar: "/nodes/npc_merchant.png",
      },
      positions: { what: { x: 780, y: 900 }, how: { x: 780, y: 900 }, why: { x: 780, y: 900 }, system: { x: 780, y: 900 } },
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
        whatDialogue: [
          { speaker: "scholar", text: "水果摊上苹果5元一斤，超市里可能8元，产地直供可能2元。价格差异这么大，到底谁说了算？" },
          { speaker: "mentor", text: "价格不是某个人说了算，是买卖双方'博弈'出来的结果。卖家想卖贵，买家想便宜，最终落在一个双方都愿意成交的数字上。" },
          { speaker: "scholar", text: "那'供需关系'是怎么决定这个数字的？" },
          { speaker: "mentor", text: "东西少、人多，价格就涨；东西多、人少，价格就跌。供需就像一个'看不见的手'，把价格推到均衡点。" },
          { speaker: "mentor", text: "理解供需，你就能解释'口罩为什么疫情时暴涨''房子为什么这两年跌'——这些不是偶然，是供需规律在起作用。" },
        ],
        whatScrolls: [
          { type: "definition", title: "供给与需求的定义", content: "供给指在某一价格下生产者愿意且能够提供的商品数量；需求指在某一价格下消费者愿意且能够购买的商品数量。两者共同决定均衡价格。", mentorVoice: "第一张卷轴给供需下了个定义：供给是'卖家愿意卖多少'，需求是'买家愿意买多少'。两者一起，决定了那个成交价格。" },
          { type: "example", title: "口罩价格的过山车", content: "疫情初期口罩供给不足，价格飙升到几十元一片；后来工厂扩产、需求下降，价格回落到几元。供需变化，价格跟着变——这就是市场的'自动调节'。", mentorVoice: "这张卷轴画的是口罩价格的'过山车'。疫情一来供不应求，价格飞天；产能上来需求回落，价格回归。注意这个过程没人下令——市场自己完成的。" },
          { type: "bridge", title: "房价、工资、股价：一个规律通吃", content: "从房子到工资到股票，几乎所有'价格'都遵循供需规律：稀缺则贵，富余则贱。理解这一点，你就有了一把解释世界价格的钥匙。", mentorVoice: "最后这张卷轴做了一个大连接：房价、工资、股价——表面看完全不同，背后都是同一个供需规律在起作用。掌握这把钥匙，你能解释很多看似复杂的经济现象。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来价格不是谁定的，是供需'博弈'出来的结果……" },
          { speaker: "mentor", text: "对。选一张你最有感触的卷轴，我们继续深入。" },
        ],
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
      iconNpc: "/scenes/grain_field/gate_npc.png",
      mysteryQuestion: "为什么市场有时也会失灵？",
      gateNpc: {
        id: "gate_market_fail",
        title: "公共牧者",
        avatar: "/nodes/node_tribe.png",
      },
      positions: { what: { x: 1020, y: 780 }, how: { x: 1020, y: 780 }, why: { x: 1020, y: 780 }, system: { x: 1020, y: 780 } },
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
        whatDialogue: [
          { speaker: "scholar", text: "市场这么厉害，怎么还会有'失灵'的时候？" },
          { speaker: "mentor", text: "市场擅长配置'看得见的成本和收益'。但有些影响是看不见的——比如工厂排污影响居民健康，没人付钱也没人赔偿，这就是'外部性'。" },
          { speaker: "scholar", text: "那还有哪些情况会让市场失灵？" },
          { speaker: "mentor", text: "还有'公共物品'——大家都用但没人付钱；'信息不对称'——买家不知道东西好坏；'垄断'——一家独大、价格扭曲。这些情况下，市场给出的'最优解'其实是次优的。" },
          { speaker: "mentor", text: "市场失灵不是市场'坏'，而是市场'不够用'。理解这一点，你就知道政府为什么要干预——但政府也不是万能的。" },
        ],
        whatScrolls: [
          { type: "definition", title: "市场失灵的四种情况", content: "市场失灵指市场无法有效配置资源的情况，包括外部性（污染影响第三方）、公共物品（路灯）、信息不对称（买家不知道真货假货）、垄断（一家独大定价）。", mentorVoice: "第一张卷轴列了四种'市场失灵'：外部性、公共物品、信息不对称、垄断。记住这四个关键词，你能解释绝大多数市场'不灵'的情况。" },
          { type: "example", title: "公地悲剧：人人放牛，草地沙化", content: "公共牧场上，每个牧人都想多放牛——多出来的牛吃的是公共的草。没人愿意先减少，于是草地沙化，集体受损。这就是'个体理性导致集体非理性'。", mentorVoice: "这张卷轴画的是经典的'公地悲剧'。每个牧人都觉得自己多一头牛没事，结果所有人加起来，草地就毁了。市场看不见这种'集体代价'。" },
          { type: "bridge", title: "市场失灵 vs 政府失灵", content: "市场失灵是政府干预的理由，但政府也可能失灵（腐败、低效、信息不灵）。理解这两者的边界，才能理解现代经济政策为什么总在'多一点市场'和'多一点政府'之间摇摆。", mentorVoice: "最后这张卷轴做了一个重要平衡：市场失灵不是要消灭市场，而是要找市场和政府的最佳组合。这个边界问题，是现代经济学的核心议题之一。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来市场不是万能的——看不见的代价它处理不了……" },
          { speaker: "mentor", text: "对，但也别走到另一个极端：政府也不是万能的。选一张你最有感触的卷轴，我们继续。" },
        ],
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
      iconNpc: "/scenes/stargazing/gate_npc.png",
      mysteryQuestion: "谁为路灯付钱？",
      gateNpc: {
        id: "gate_pub",
        title: "守夜人",
        avatar: "/nodes/node_village.png",
      },
      positions: { what: { x: 1260, y: 620 }, how: { x: 1260, y: 620 }, why: { x: 1260, y: 620 }, system: { x: 1260, y: 620 } },
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
        whatDialogue: [
          { speaker: "scholar", text: "路灯、公园、国防……这些我都在用，但好像没人找我要钱。谁在背后买单？" },
          { speaker: "mentor", text: "这就是'公共物品'问题。公共物品有两个特征：第一是'非排他'——你没法不让人用；第二是'非竞争'——多一个人用不减少其他人用的量。" },
          { speaker: "scholar", text: "那为什么市场不提供这些？" },
          { speaker: "mentor", text: "因为没人愿意付钱——你能用、我不付钱也能用，那我干嘛付？这叫'搭便车问题'。市场靠'谁付钱谁用'运转，公共物品打破了这个机制。" },
          { speaker: "mentor", text: "所以公共物品通常由政府提供——通过税收强制收费。这是市场机制之外的一种'集体决策'。" },
        ],
        whatScrolls: [
          { type: "definition", title: "公共物品的两大特征", content: "公共物品具有非排他性（无法排除他人使用）和非竞争性（一人使用不减少他人可用量）。典型例子：国防、路灯、基础研究、清洁空气。", mentorVoice: "第一张卷轴讲了公共物品的两个关键词：'非排他'（不能拒绝别人用）和'非竞争'（多用一个人不影响别人用）。记住这两个特征，你能识别几乎所有公共物品。" },
          { type: "example", title: "疫苗：人人受益，难收费", content: "新冠病毒疫苗：接种不减少他人可获得的剂量（非竞争性），且理论上难以完全排除未付费者使用（非排他性）。所以政府通常免费或低价提供，而不是让市场定价。", mentorVoice: "这张卷轴画的是疫苗的案例。注意：疫苗符合'非排他+非竞争'，所以市场不愿意提供——你付不付钱都能打，没人愿意付钱。于是政府接手。" },
          { type: "bridge", title: "数字时代的'新公共物品'", content: "开源代码、维基百科、公共气象数据——这些是数字时代的公共物品。它们往往靠捐赠、志愿者和基金会维持，而非传统市场。这是一种'新型集体协作'的雏形。", mentorVoice: "最后这张卷轴做了个现代连接：开源软件、维基百科，这些也是公共物品，但它们的提供方式不是政府，而是社区和志愿者。这是数字时代的新现象——理解它，你能看懂很多互联网公司的'非营利'部分。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来'谁为路灯付钱'背后是'搭便车'问题，市场解决不了……" },
          { speaker: "mentor", text: "对。公共物品揭示了市场的边界。选一张你想深入理解的卷轴，我们继续。" },
        ],
        how: "公共物品如何区别于私人物品？",
        why: "为什么会出现\"搭便车\"问题？",
        system: "数字时代的公共物品（社交网络、开源代码）如何解决？",
        finalReturn: "你已经从多角度审视了公共物品。回到最初的问题：谁为路灯付钱？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },
  ],
};
