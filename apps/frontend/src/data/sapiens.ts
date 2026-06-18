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
  scholarStart: { x: 80, y: 800 },
  layers: ["what", "how", "why", "system"],

  nodes: [
    // ── What 1: 认知革命 ──────────────────────────────────────────────
    {
      id: "n_cog_rev",
      name: "认知革命",
      icon: "/nodes/node_cave_painting.png",
      iconNpc: "/scenes/cave_fire/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "老爷爷问'智人到底哪里不一样'……我第一反应是'更聪明'，但这个答案好像太敷衍了。" },
          { speaker: "mentor", text: "你感觉没错。智人的大脑不比尼安德特人大，真正的差别不是硬件，而是我们用的'软件'——语言。" },
          { speaker: "scholar", text: "动物不也有语言？蜜蜂跳舞、猴子报警，这不也是在交流吗？" },
          { speaker: "mentor", text: "区别在种类。动物的语言只能说真实的东西——'那边有吃的'。而智人的语言能说'不存在'的东西。" },
          { speaker: "mentor", text: "神、传说、规则、国家——这些看不见的东西，智人能靠语言描述出来，而且能让一群人共同相信。这就是我们最厉害的地方。" },
        ],
        whatScrolls: [
          { type: "definition", title: "认知革命的定义", content: "认知革命的本质不是大脑突变，而是一场语言使用方式的革命。智人获得了\u201c虚构\u201d的能力——能用语言描述不存在的事物，从此成为\u201c讲故事的物种\u201d。", mentorVoice: "第一张卷轴告诉我们：认知革命的关键不是智人变聪明了，而是语言变了——智人开始能谈论没见过、没摸过、不存在的东西。" },
          { type: "example", title: "篝火边的陌生人", content: "一群互不相识的原始人围坐在篝火旁，他们语言不通、部落不同，但都相信同一位\u201c森林之灵\u201d的神话。因为这个共同相信的故事，他们放下了武器，并肩协作。", mentorVoice: "第二张卷轴画出了那个场景：一群陌生人因为相信同一个神话而放下武器。这就是虚构故事的力量——让不认识的也能合作。" },
          { type: "bridge", title: "从传说到公司", content: "今天的跨国公司、国家、法律体系——其运作原理和远古人类围坐篝火讲神话，本质上完全一样：一群人共同相信一个虚构的实体。", mentorVoice: "最后这张最有意思：今天的大公司、国家，和远古神话的结构是一样的——都是大家共同相信一个看不见的东西。看完你有没有觉得，现代世界没那么\u201c现代\u201d？" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来如此……语言不只是交流工具，还能创造\u201c共同相信的东西\u201d。那今天的社会，其实也是建立在这种能力之上。" },
          { speaker: "mentor", text: "你已经开始看到连接了。现在选一张你觉得最关键的卷轴——它会成为我们继续深入的起点。" },
        ],
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
      iconNpc: "/scenes/cave_fire/gate_npc_1.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "火…不仅仅是取暖和烤肉的工具。我看到他们在火光中传达某种东西，像是在分享一种比语言更古老的默契。" },
          { speaker: "mentor", text: "你的观察很敏锐。火堆旁诞生的不只是温暖，更是最早的「信息交换站」——它是认知革命的前奏。" },
        ],
        whatScrolls: [
          { type: "definition", title: "用火控制", content: "用火控制是指人类学会使用和管理火的技术能力，包括烹饪、取暖和照明。火让人类熟食、保暖、驱赶猛兽，肠道缩短，大脑获得更多能量，夜间也能活动。这是人类掌握的第一种\u201c外部能源\u201d。", mentorVoice: "第一张卷轴给了我们一个简洁的定义：火是工具，但不仅仅是工具——它是人类第一次学会管理能源。这个能力改变了我们的身体和社会。" },
          { type: "example", title: "火堆旁的夜晚", content: "在寒冷的夜晚，部落成员围坐在火堆旁。火光照亮了黑暗，驱走了野兽。更重要的是，大家在火光中分享故事、交流信息。火堆成了最早的\u201c社交中心\u201d。", mentorVoice: "第二张卷轴画出了那个温暖的画面：火堆不只是取暖，更是人类最早的社交网络。光把大家聚在一起，语言在火光中流动。" },
          { type: "bridge", title: "从火到互联网", content: "从篝火到电灯到互联网——人类不断发明新的方式管理能量和信息。火是这一切的起点：它让人类可以控制环境，而不再被动适应环境。", mentorVoice: "最后这张做了一个跨越时空的连接：你今天用的电灯、手机，甚至互联网——底层逻辑和远古人类控制火是一样的：用外部能源扩大能力边界。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "所以火不只是\u201c做饭的工具\u201d，它是人类主动改造世界的第一步……" },
          { speaker: "mentor", text: "正是。选一张最关键的卷轴吧，它会带我们进入下一层。" },
        ],
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
      iconNpc: "/scenes/grain_field/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "农夫说日子比流浪时还苦……农业不是人类最伟大的进步之一吗？" },
          { speaker: "mentor", text: "对'人类'这个物种来说是进步——人口翻了百倍。但对'每一个具体的人'呢？你自己想一下：每天从早到晚种地，吃的东西就那几样，还动不动饿死。" },
          { speaker: "scholar", text: "所以说，对个体来说是更辛苦了……但为什么大家还是要种地？" },
          { speaker: "mentor", text: "因为开弓没有回头箭。一旦开始种地、人口变多、变成村落，你就回不去采集生活了。农业就像一桩糟糕的交易——智人以为自己赢了，其实是亏了。" },
          { speaker: "mentor", text: "很多历史学家管这叫'史上最大的骗局'。到底是人驯化了小麦，还是小麦驯化了人，看完这三张卡你就有答案了。" },
        ],
        whatScrolls: [
          { type: "definition", title: "农业革命的定义", content: "农业革命是智人从采集狩猎转向定居种植的历史转变。但这并非一次聪明的选择，而是一条没有退路的陷阱——人口增长后，再也回不去旧生活了。", mentorVoice: "第一张卷轴的定义很直接：农业革命不是\u201c进步\u201d，而是一条不归路。人口增长之后，回头路就断了。" },
          { type: "example", title: "小麦的胜利", content: "那个满头大汗的农夫，一天的工作量远超采集者，但吃得还不如从前。他的骨骼更差、牙齿更坏、传染病更多。小麦让他困在田里，走不掉了。", mentorVoice: "看这张卷轴上的农夫——他比采集者累得多，但身体反而更差。小麦赢了他。到底谁驯化了谁？" },
          { type: "bridge", title: "你也在种地？", content: "今天的\u201c上班\u201d和农业革命本质上一样：为了稳定的食物来源（工资），牺牲了自由和多样性。朝九晚五的现代人，和弯腰种地的农夫，没有本质区别。", mentorVoice: "最后这张卷轴做了一个现代连接：你有没有觉得每天上班和种地挺像的？为了稳定收入放弃自由——这个模式从农业革命就开始了。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来农业不一定是好事……那我每天上班、加班，是不是也是一种\u201c现代版农业陷阱\u201d？" },
          { speaker: "mentor", text: "好问题。带着这个角度选一张最关键的卷轴——它会带我们看得更深。" },
        ],
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
      iconNpc: "/scenes/market_trade/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "一张纸凭什么能买到包子？明明它自己就是一张纸。这个问题我一直觉得有点神奇。" },
          { speaker: "mentor", text: "神奇就对了。金钱的秘密就在于：所有人都相信它值钱。不是因为它本身有什么价值，而是因为每个人都这么信。" },
          { speaker: "scholar", text: "那不就是'大家约定好'？和法律、规则差不多吗？" },
          { speaker: "mentor", text: "对，但比法律更厉害。法律只能管一个国家的范围。而金钱——你拿一张人民币，在美国、非洲、南极都能花。世界上没有第二种东西有这么大的信任网络。" },
          { speaker: "mentor", text: "金钱是人类最成功的'共同想象'，比任何宗教的信徒都多。它让完全陌生的人也能立刻合作。" },
        ],
        whatScrolls: [
          { type: "definition", title: "货币的定义", content: "货币的本质不是黄金也不是纸张，而是一个信任系统。一切货币，不论贝壳、金币还是数字代码，都是\u201c共同想象的信用\u201d——所有人相信它有价值，它就有价值。", mentorVoice: "第一张卷轴点明了核心：金钱不是东西，是信任。贝壳、金币、纸币——形式不重要，重要的是所有人都信。" },
          { type: "example", title: "一枚金币的交易", content: "市集上，两个语言不通的陌生人相遇。一人拿出蔬菜，一人掏出一枚金币。两人都不认识对方，但都认识这枚金币。交易完成。金钱让陌生人瞬间互信。", mentorVoice: "这张卷轴画的是市集上那笔交易——两个陌生人，没有共同语言，但都接受了那枚金币。金钱是最早的\u201c通用语言\u201d。" },
          { type: "bridge", title: "从贝壳到比特币", content: "贝壳→金属→纸币→数字支付→比特币。变的是形式，不变的是信任。今天的微信支付扫码，和远古以物换物，底层的信任机制没有变过。", mentorVoice: "最后这张卷轴画了一条长长的线——从贝壳到比特币。你会发现：技术变了，但\u201c所有人相信\u201d这个核心，五千年没变过。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "所以金钱不是实物，而是一种大家都参加的信任游戏……难怪它的力量这么大。" },
          { speaker: "mentor", text: "对的。现在选一张你觉得最关键的卷轴——它会带我们进入这个信任游戏的下一层。" },
        ],
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
      iconNpc: "/scenes/stone_law/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "古代人信神我能理解，但咱们现代人应该不会这样了吧？" },
          { speaker: "mentor", text: "那我问你：法律不是写在纸上的吗？为什么它能有约束力？公司不是一个名字吗？为什么它能拥有财产、起诉别人？" },
          { speaker: "scholar", text: "……嗯，因为大家都承认这些规则。" },
          { speaker: "mentor", text: "这不就回到和'信神'一样了吗？——所有人共同承认一个看不见的东西存在，它就真的存在了。国家、法律、公司、人权，本质上和神一样的。" },
          { speaker: "mentor", text: "区别只是：我们不再叫它'神'，叫它'制度'。但这些制度的力量，不比任何神明小。" },
        ],
        whatScrolls: [
          { type: "definition", title: "想象的秩序的定义", content: "想象的秩序是：一群人共同相信一个不存在的东西，它因此变成了\u201c真实存在\u201d。不是物理上的真实，而是社会层面的真实——因为每个人都按它行事。", mentorVoice: "这张卷轴的定义很直接：想象的秩序就是\u201c信则有\u201d。神不存在，但因为所有人都信神，神的规则就成了真实的规则。" },
          { type: "example", title: "火把熄灭的瞬间", content: "祭司点燃火把，几个世代为敌的部落放下了武器。没有人见到神显灵，但所有人都因为相信神的存在而停止了厮杀。神的秩序压过了仇恨。", mentorVoice: "看这张卷轴画的那个瞬间——相信神比相信仇恨更强大。这就是想象的秩序的力量：它能压倒人类最原始的情感。" },
          { type: "bridge", title: "红绿灯也是一种秩序", content: "你今天过马路看到红灯停下——没有人拿枪逼你，你停是因为你知道别人也承认这个规则。红绿灯、排队、法律……和远古的图腾一样，都是写在集体想象中的共识。", mentorVoice: "最后这张卷轴做了个有趣的连接：你每天过马路等红灯，和古人相信神，结构是一样的——都是\u201c所有人都承认这个规则\u201d。现在还说和你没关系吗？" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "原来我每天都在遵守\u201c想象的秩序\u201d——法律、排队、红绿灯……它们和神的作用方式是一样的。" },
          { speaker: "mentor", text: "正是如此。选一张最关键的卷轴吧，我们会沿着这条路走得更深。" },
        ],
        how: "想象的秩序是如何被建立和强化的？",
        why: "为什么人类特别擅长创造和相信「故事」？",
        system: "数字时代出现了哪些新的「想象的秩序」？",
        finalReturn: "你已经从多角度审视了想象的秩序。回到最初的问题：为什么国家和公司都像故事？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 6: 帝国 ────────────────────────────────────────────────────
    {
      id: "n_empire",
      name: "帝国的崛起",
      icon: "/nodes/node_ship.png",
      iconNpc: "/scenes/empire_gate/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "罗马征服了希腊，结果罗马人开始学希腊语。蒙古人征服了中国，反过来变成了中国人……征服者怎么被反杀了？" },
          { speaker: "mentor", text: "你说的这个现象本身就是答案——武力能占领土地，但征服不了人心。要治理一块地，你需要文字、法律、宗教、文化。" },
          { speaker: "scholar", text: "但被征服的民族的文化，不就是'输家'的文化吗？为什么赢家反而要学？" },
          { speaker: "mentor", text: "因为你可能需要用对方的文字来收税，用对方的宗教来安抚人心，用对方的法律来断案。时间久了，征服者自己也被同化了。" },
          { speaker: "mentor", text: "雄狮走进笼子，以为自己征服了铁笼，其实是住进了别人建好的房子里。帝国最终的结局，往往是被自己征服的文明所改变。" },
        ],
        whatScrolls: [
          { type: "definition", title: "帝国的定义与悖论", content: "帝国是一个强大政权征服多个民族。但帝国最大的悖论是：军事上征服了别人，文化上却被别人征服。剑赢了战争，笔赢了帝国。", mentorVoice: "这张卷轴给帝国下了一个定义，后面跟了一个悖论：用剑征服的人，最终被文化征服。这是个规律，不是偶然。" },
          { type: "example", title: "罗马征服希腊之后", content: "罗马军团击败了希腊军队。但几十年后，罗马贵族用希腊语写作、崇拜希腊神灵、送子女去希腊上学。被征服者的文明，征服了征服者。", mentorVoice: "看这个例子：罗马人赢了战争，但穿上了希腊的长袍、读希腊的书、拜希腊的神。到底谁征服了谁？卷轴上的画已经告诉你了。" },
          { type: "bridge", title: "你的语言来自帝国", content: "你今天说的语言、用的文字、法律体系、甚至世界观——很多都来自两千年前的帝国遗产。帝国消失了，但它们留下的文化芯片，还在你的大脑里运行。", mentorVoice: "最后这张卷轴连到今天：你现在用的语言、写的字、信的法律，很多都来自那些消失的帝国。帝国死了，但它们的\u201c文化软件\u201d还在我们脑子里运行。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "所以武力赢不了文化……那今天的强国花那么大力气输出文化，也是在玩这个游戏。" },
          { speaker: "mentor", text: "你看到了今天的版本。选一张最关键的卷轴，我们往深处看。" },
        ],
        how: "帝国是如何维持对多元文化的统治的？",
        why: "为什么征服者总是被被征服者的文化影响？",
        system: "现代全球化是否也是一种「新帝国」？",
        finalReturn: "帝国与文化的关系错综复杂。回到最初的问题：为什么征服者最后也会被文化改变？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },

    // ── What 7: 科学革命 ───────────────────────────────────────────────
    {
      id: "n_sci_rev",
      name: "科学革命",
      icon: "/nodes/node_brain.png",
      iconNpc: "/scenes/stargazing/gate_npc.png",
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
        whatIntro: "科学革命最革命的地方，不是新发现，而是承认「我们不知道」。",
        whatDialogue: [
          { speaker: "scholar", text: "承认无知反而成为力量……这很反直觉。从小到大我们都被教育要自信、要懂答案、不要说'我不知道'。" },
          { speaker: "mentor", text: "你说到了关键。科学革命之前，所有文明都认为真理早就写好了——在经书里、在古书里、在祖宗的智慧里。'我不知道'是丢脸的。" },
          { speaker: "scholar", text: "科学的态度就是：古人说的不一定都对，我们要自己去验证？" },
          { speaker: "mentor", text: "对。而且更重要的：科学承认'我现在知道的，也可能错'。一旦你接受自己不知道，你就会去探索，而探索会带来新的发现。永远不会停止。" },
          { speaker: "mentor", text: "旧时代说：'一切答案都在书里。'科学说：'我不知道，所以我要去找。'——就是这个转变，让人类在过去两百年里，进步的速度超过了之前的所有时代。" },
        ],
        whatScrolls: [
          { type: "definition", title: "科学革命的定义", content: "科学革命不是人类发现了更多知识，而是人类决定承认自己无知，并建立了一套\u201c发现未知\u201d的方法。看似简单的一步，开启了无上限的探索。", mentorVoice: "这张卷轴给了科学革命一个简洁的定义：关键不是\u201c得到了新答案\u201d，而是\u201c承认旧答案可能不对\u201d。这个态度上的转变，才是革命的起点。" },
          { type: "example", title: "伽利略的望远镜", content: "教会说地球是宇宙中心。伽利略说：我要自己看看。他造了望远镜，看到了木星的卫星——亲眼所见，和书上写的不一样。他选择了相信自己的眼睛。", mentorVoice: "看这张卷轴上的望远镜——伽利略用它看到的，和经书上写的不一样。他选择了相信眼睛。这个\u201c我自己看\u201d的态度，就是科学的起点。" },
          { type: "bridge", title: "你今天也在用科学", content: "你今天打开手机查资料、用搜索引擎验证信息、看评测再买东西——这些都是在用科学革命的方法：承认自己不知道，然后去查证。科学革命还没结束，它就在你口袋里。", mentorVoice: "最后这张卷轴做了个巧妙连接：你每天用手机查资料、验证消息——\u201c我不知道，我来查一下\u201d——这就是科学革命的方法。它已经变成你的日常了。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "所以科学革命不是一堆发明，而是一种态度……\u201c我不知道，我来看看\u201d——就这么简单，又这么强大。" },
          { speaker: "mentor", text: "没错。现在选一张你最认可的卷轴——它会带我们进入科学革命的核心。" },
        ],
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
      iconNpc: "/scenes/temple_myth/gate_npc.png",
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
        whatDialogue: [
          { speaker: "scholar", text: "规则写在纸上就有约束力，这我平时不觉得奇怪。但仔细一想……合同里写的字凭什么让我还钱呢？" },
          { speaker: "mentor", text: "因为整个社会都承认这个规则。但你有没有想过更古怪的？——公司有财产、能签合同、能起诉你，但公司本身没有身体，没有脑子。它是个'法律虚构的人'。" },
          { speaker: "scholar", text: "法律虚构的人……就是说公司跟真人一样有权利，但它不是真人？" },
          { speaker: "mentor", text: "对。股票、商标、专利，甚至你今天用的APP背后，都是这种'人造人'在运作。现代世界的底层代码，就是这些法律虚构。" },
          { speaker: "mentor", text: "法律比刀剑更有力量——因为刀剑只能管住人，而法律能管住想象。" },
        ],
        whatScrolls: [
          { type: "definition", title: "资本主义的核心", content: "资本主义的核心创新不是赚钱，是把\u201c增长\u201d变成了一种社会义务。你不只是为了赚钱，你必须赚更多的钱。这个规则驱动了整个现代世界的运转。", mentorVoice: "这张卷轴的定义有点反直觉：资本主义的核心不是赚钱，是\u201c必须增长\u201d。这个\u201c必须\u201d二字，才是驱动一切的力量。" },
          { type: "example", title: "公司：一个虚构的人", content: "公司没有身体，但能拥有财产、签订合同、起诉你。它不生病、不死亡、可以无限扩张。这个法律虚构的\u201c人\u201d，是现代社会最强大的组织形态。", mentorVoice: "看这张卷轴上的奇怪生物——公司。它没有身体，但有权利；不会死，但能拥有财产。它是人类发明的最强大的\u201c人造人\u201d。" },
          { type: "bridge", title: "你活在法律虚构中", content: "你今天用的App、存的银行、住的房子——背后的所有权都建立在法律虚构之上。资本主义的本质不是什么经济理论，而是一套所有人相信的\u201c纸上规则\u201d。", mentorVoice: "最后这张卷轴掀开了现代生活的底牌：你的工资、房贷、股票，全是建立在\u201c法律虚构\u201d之上的。它们和古代的神明一样——信则有。" },
        ],
        whatWrapUp: [
          { speaker: "scholar", text: "所以公司是一个\u201c人造人\u201d……那整个经济体系就是一群人造人在一张纸上的规则里运转？" },
          { speaker: "mentor", text: "你抓住了本质。选一张最关键的卷轴，我们继续往下拆。" },
        ],
        how: "资本主义的经济循环是如何运作的？",
        why: "为什么「信用」这个「想象的秩序」能驱动真实世界的行动？",
        system: "从工业革命到人工智能，资本与科学联姻的模式如何演化？",
        finalReturn: "你已经从多个角度审视了资本与科学的关系。回到最初的问题：为什么信用让远征成为可能？",
      },
      finalQuestion: { source: "mysteryQuestion", state: "locked" },
    },
  ],
};
