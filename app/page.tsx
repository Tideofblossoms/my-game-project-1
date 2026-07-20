"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Country = "cn" | "us" | "jp";
type StatKey = "health" | "happiness" | "ability" | "money" | "relations" | "stress";
type Stats = Record<StatKey, number>;
type Screen = "splash" | "name" | "identity" | "game" | "end";
type PersonaId = "dreamer" | "connector" | "strategist" | "free-spirit";

type AccountInfo = {
  authenticated: boolean;
  localPreview: boolean;
  displayName: string;
};

type MediaCapabilities = { image: boolean; video: boolean };

type SavePayload = {
  version: 1;
  screen: Screen;
  country: Country;
  personaId: PersonaId;
  nameInput: string;
  startingStats: Stats;
  profile: ReturnType<typeof makeProfile>;
  stats: Stats;
  eventIndex: number;
  eventAge?: number;
  history: HistoryItem[];
  plannedEvents?: PlannedLifeEvent[];
  turnNumber?: number;
  videoJobs?: Record<string, PreloadedVideoJob>;
};

type Choice = {
  text: string;
  intent: string;
  effects: Partial<Stats>;
  fallback: string;
};

type LifeEvent = {
  age: number;
  chapter: string;
  title: string;
  scene: string;
  prompt: string;
  choices: Choice[];
  important?: boolean;
};

type PlannedLifeEvent = LifeEvent & {
  id: string;
  videoPrompt: string;
  origin: "ai" | "fallback";
};

type PreloadedVideoJob = {
  eventId: string;
  apiId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
};

type HistoryItem = {
  age: number;
  title: string;
  choice: string;
  narrative: string;
};

const countries: Record<Country, { name: string; subtitle: string; glyph: string; places: string[] }> = {
  cn: { name: "中国", subtitle: "家庭、流动与选择", glyph: "中", places: ["成都近郊", "苏州老城区", "西安城南", "广西的一座小城"] },
  us: { name: "美国", subtitle: "独立、机会与代价", glyph: "US", places: ["俄勒冈州小镇", "芝加哥南郊", "亚利桑那州凤凰城", "缅因州海边"] },
  jp: { name: "日本", subtitle: "秩序、归属与自我", glyph: "日", places: ["大阪郊区", "札幌市内", "福冈近郊", "长野县小镇"] },
};

const names: Record<Country, string[]> = {
  cn: ["林知夏", "陈砚", "周遥", "沈禾"],
  us: ["Avery Chen", "Jordan Reed", "Maya Brooks", "Noah Park"],
  jp: ["佐藤遥", "高桥澪", "中村葵", "山本律"],
};

const sharedEvents: LifeEvent[] = [
  {
    age: 6,
    chapter: "童年",
    title: "窗外的世界",
    scene: "childhood",
    prompt: "开学后的第三周，老师让每个人在全班面前讲一件自己最喜欢的事。你握着画满奇怪城市的本子，手心全是汗。",
    choices: [
      { text: "走上讲台，展示自己的画", intent: "尝试表达自己", effects: { ability: 7, stress: 4, happiness: 3 }, fallback: "你的声音一开始很轻，后来却越来越稳。有人笑了，也有人在下课后问你能不能再画一座城市。你第一次发现，害怕和勇敢可以同时存在。" },
      { text: "只说一句，然后回到座位", intent: "保护自己的安全感", effects: { stress: -3, relations: 2 }, fallback: "你很快结束了发言。老师没有责备你，邻座悄悄推来一张纸条，上面画着一扇门。那份不动声色的善意被你记了很多年。" },
      { text: "假装忘记带作业", intent: "回避这次挑战", effects: { stress: -5, ability: -2 }, fallback: "你暂时躲过了讲台，但回家的路上一直想着那本没有被打开的画册。逃避带来了轻松，也留下了一点难以命名的遗憾。" },
    ],
  },
  {
    age: 12,
    chapter: "少年",
    title: "两个人的秘密",
    scene: "school",
    prompt: "你最好的朋友被同学排挤，并请求你不要告诉任何人。第二天，老师单独问你是否知道发生了什么。",
    choices: [
      { text: "告诉老师，但要求保护朋友", intent: "寻求成年人的帮助", effects: { relations: 5, stress: 3, ability: 3 }, fallback: "事情没有立刻变好，但老师开始留意那些被忽略的角落。朋友起初生你的气，几周后才明白你没有背叛。你们的关系从此多了一条不那么轻松的纽带。" },
      { text: "遵守承诺，什么也不说", intent: "保护朋友的秘密", effects: { relations: 3, stress: 7 }, fallback: "你守住了秘密，也开始每天注意朋友有没有独自回家。承担另一个人的痛苦让你显得更成熟，却也让你第一次感到无能为力。" },
      { text: "劝朋友一起去找老师", intent: "共同面对问题", effects: { relations: 8, stress: 2, ability: 2 }, fallback: "你们在办公室门口徘徊了很久，最后一起敲门。问题没有神奇地消失，但朋友记住了那天你没有替他决定，而是陪他做了决定。" },
    ],
  },
  {
    age: 18,
    chapter: "离巢",
    title: "一张通往远方的票",
    scene: "departure",
    prompt: "你得到一个离家很远的学习机会。它更接近你的兴趣，但费用不低，家人也希望你留在身边。",
    important: true,
    choices: [
      { text: "去远方，接受不确定性", intent: "追求独立和兴趣", effects: { money: -12, ability: 10, relations: -3, stress: 7, happiness: 5 }, fallback: "列车启动时，你同时感到自由和内疚。新城市没有为你准备欢迎仪式，但陌生的街道迫使你学习如何照顾自己。这次离开成为此后许多选择的起点。" },
      { text: "留下，选择更稳妥的道路", intent: "重视家庭和稳定", effects: { money: 4, relations: 9, stress: -2, happiness: -2 }, fallback: "家里的生活继续以熟悉的速度向前。你获得了支持，也偶尔在深夜想象另一条时间线。留下不是失败，只是它的代价通常不会立刻显现。" },
      { text: "工作一年，再决定", intent: "延迟决定并积累资源", effects: { money: 8, ability: 4, stress: 5 }, fallback: "你开始用自己的劳动换取选择的空间。一年可能让梦想更清晰，也可能让人习惯眼前的生活。你把那张录取通知书收进抽屉，没有丢掉。" },
    ],
  },
  {
    age: 27,
    chapter: "青年",
    title: "向上的电梯",
    scene: "city",
    prompt: "工作进入第四年，你得到一次明显的晋升机会，但新职位意味着更长工时，并可能需要离开现在的城市。",
    choices: [
      { text: "接受晋升，把握窗口", intent: "优先发展事业", effects: { money: 14, ability: 8, stress: 13, relations: -6 }, fallback: "你的名片换了职位，日历也迅速被填满。能力和收入都在增长，但一些原本随时能见的人，渐渐只出现在聊天列表里。" },
      { text: "拒绝，守住现在的生活", intent: "优先生活和关系", effects: { happiness: 7, relations: 7, stress: -8, money: -3 }, fallback: "同事有人不理解你的决定，你却重新拥有了完整的晚上。几个月后，偶尔的动摇仍会出现，但生活不再只剩下一条衡量尺度。" },
      { text: "提出条件，尝试重新谈判", intent: "寻找折中方案", effects: { ability: 6, money: 6, stress: 5, relations: 2 }, fallback: "谈判没有给你完美答案，却改变了别人看待你的方式。你得到部分空间，也承担了证明这套安排可行的压力。" },
    ],
  },
  {
    age: 39,
    chapter: "中途",
    title: "父母的来电",
    scene: "home",
    prompt: "一位年长的家人开始频繁忘事，需要有人投入更多时间照顾。与此同时，你自己的生活正处在关键阶段。",
    important: true,
    choices: [
      { text: "调整工作，承担主要照护", intent: "承担家庭责任", effects: { relations: 13, money: -10, stress: 12, health: -4 }, fallback: "你的生活半径突然缩小，日程被复诊、购物和反复的解释占满。爱没有让照护变得轻松，但一些过去来不及说的话，在缓慢的日子里重新出现。" },
      { text: "寻找专业帮助并共同分担", intent: "建立可持续的照护方案", effects: { money: -8, relations: 7, stress: 4, ability: 3 }, fallback: "你花了很长时间寻找合适的帮助，也面对了家人的犹豫。安排并不完美，却让每个人都保留了一点继续生活的空间。" },
      { text: "维持距离，优先保住自己的生活", intent: "保护个人边界", effects: { money: 5, stress: 2, relations: -14, happiness: -4 }, fallback: "现实没有因此停止运转，但家人之间出现了难以弥合的沉默。你守住了自己的节奏，也必须与复杂的愧疚共处。" },
    ],
  },
  {
    age: 54,
    chapter: "转身",
    title: "重新开始的可能",
    scene: "crossroads",
    prompt: "你熟悉的行业正在变化。继续留下仍能维持体面生活，但一个埋藏很久的兴趣再次出现。",
    choices: [
      { text: "从零开始，转向真正想做的事", intent: "晚年之前重新选择", effects: { money: -12, happiness: 14, ability: 5, stress: 7 }, fallback: "重新成为新手并不浪漫。你犯下年轻时不会犯的错误，却也拥有年轻时没有的耐心。收入下降了，早晨醒来时的重量却变轻了一些。" },
      { text: "保留工作，把兴趣留给周末", intent: "稳健地平衡风险", effects: { happiness: 7, stress: 2, ability: 3 }, fallback: "你没有推翻人生，而是在原有生活旁边开了一扇小门。门很窄，但足以让新的空气进来。" },
      { text: "继续原来的道路，为退休做准备", intent: "优先财务安全", effects: { money: 12, happiness: -3, stress: -2 }, fallback: "你选择把不确定性留在门外。账户数字让未来更安稳，那个兴趣偶尔仍会在安静的周末敲门。" },
    ],
  },
  {
    age: 68,
    chapter: "晚年",
    title: "空出来的日历",
    scene: "late-life",
    prompt: "正式离开主要工作后，你第一次拥有大段没有安排的时间。身体仍允许你做很多事，但精力已不像从前。",
    choices: [
      { text: "去看一直想看的世界", intent: "完成未竟愿望", effects: { money: -12, happiness: 12, health: -2 }, fallback: "旅途比想象中更累，你却在陌生车站重新感到年轻。真正留下来的不是照片数量，而是你终于不再把愿望推给未来。" },
      { text: "留在社区，把经验教给年轻人", intent: "建立代际连接", effects: { relations: 13, happiness: 8, ability: 2 }, fallback: "一开始只有几个人来，后来每周都有人提前等你。你发现经验的价值，不在于证明自己走得多远，而在于能否为别人照亮一小段路。" },
      { text: "安静生活，重新整理自己的一生", intent: "向内回望", effects: { stress: -12, happiness: 5, relations: -2 }, fallback: "你开始整理旧物，也整理那些没有结论的往事。有些遗憾仍然是遗憾，但不再需要每次想起都与它争辩。" },
    ],
  },
  {
    age: 82,
    chapter: "余晖",
    title: "最后一封信",
    scene: "sunset",
    prompt: "医生说你的身体正在缓慢衰退。一个晴朗的下午，你决定留下一封信，给家人、朋友，或年轻时的自己。",
    important: true,
    choices: [
      { text: "写给最重要的人：谢谢你", intent: "表达感谢和连接", effects: { relations: 12, happiness: 9, stress: -8 }, fallback: "你没有写很多大道理，只写下几个具体的下午、几顿饭和一次争吵后的拥抱。信被折好时，你发现所谓一生，最终常常被记作这些微小的时刻。" },
      { text: "写给年轻的自己：你不必那么害怕", intent: "与过去和解", effects: { happiness: 11, stress: -12 }, fallback: "你写下那些当时没人告诉你的话。它无法改变过去，却让过去第一次停止追赶你。窗外的光移动得很慢，你也不再催促它。" },
      { text: "不写信，请大家来吃一顿饭", intent: "用陪伴代替告别", effects: { relations: 15, health: -2, happiness: 8 }, fallback: "桌上很吵，有人讲错了旧事，也有人偷偷擦眼泪。你没有发表告别，只让每个人再添了一次菜。那顿饭后来被记了很多年。" },
    ],
  },
];

const extraLifeEvents: LifeEvent[] = [
  {
    age: 4, chapter: "幼年", title: "第一次说再见", scene: "childhood",
    prompt: "家里即将搬离你熟悉的小区。收拾纸箱时，你发现隔壁玩伴送的小木马，但明天已经来不及再见面了。",
    choices: [
      { text: "请家人带我去正式告别", intent: "学习表达不舍", effects: { relations: 5, happiness: 2, stress: 2 }, fallback: "你们在楼下交换了最后一个秘密。你第一次知道，告别不会让关系消失，只会改变它存在的位置。" },
      { text: "把木马藏进自己的行李", intent: "用物品保存记忆", effects: { happiness: 3, stress: -1 }, fallback: "很多年后你仍记得那个纸箱的气味。你开始习惯用物品替不擅长说出口的话作证。" },
      { text: "假装一点也不难过", intent: "保护自己不被看见", effects: { stress: 3, relations: -2, ability: 1 }, fallback: "你一路都没有哭，却在新房间的第一个夜晚突然醒来。坚强帮你走过变化，也让别人没能及时抱住你。" },
    ],
  },
  {
    age: 9, chapter: "童年", title: "没有拿到的第一名", scene: "school",
    prompt: "你认真准备了很久的比赛只得到第四名。前三名在台上合影，老师问你要不要留下来看颁奖。",
    choices: [
      { text: "留下来，认真看完颁奖", intent: "练习面对失败", effects: { ability: 5, stress: 2, happiness: -2 }, fallback: "掌声听起来有些刺耳，但你看清了差距，也发现第四名并没有让世界停止。失败第一次变成可以研究的东西。" },
      { text: "马上回家，下次不参加了", intent: "远离挫败感", effects: { stress: -3, ability: -3, happiness: 1 }, fallback: "离开会场后你轻松了许多。只是后来每当机会出现，你总会先想起这次没有被选中的感觉。" },
      { text: "去祝贺第一名，问对方怎么练习", intent: "把比较变成学习", effects: { ability: 7, relations: 4, stress: 1 }, fallback: "对方没有藏着方法，甚至把做满批注的本子借给你。你发现竞争也可能是一种靠近。" },
    ],
  },
  {
    age: 15, chapter: "青春", title: "另一个屏幕里的我", scene: "school",
    prompt: "你在网络上认识了一群真正理解你兴趣的人，但现实中的朋友觉得你最近越来越疏远。两种生活开始争夺同一段时间。",
    choices: [
      { text: "把线上朋友介绍给现实朋友", intent: "尝试连接不同的自己", effects: { relations: 6, stress: 4, happiness: 3 }, fallback: "气氛一开始很尴尬，后来有人发现彼此喜欢同一首歌。两个世界没有完全融合，但你不再需要把自己切成两半。" },
      { text: "保留线上世界，不向任何人解释", intent: "保护私人空间", effects: { happiness: 4, relations: -3, stress: -1 }, fallback: "屏幕成为只属于你的房间。它给你自由，也让现实中的误解在沉默里慢慢变厚。" },
      { text: "暂时退出网络，修复身边关系", intent: "优先眼前的人", effects: { relations: 7, happiness: -3, stress: 2 }, fallback: "你重新参与那些面对面的下午，却也想念线上世界里更完整的自己。取舍让关系变近，也留下了一块空白。" },
    ],
  },
  {
    age: 20, chapter: "初离家", title: "凌晨两点的账单", scene: "departure",
    prompt: "离开家后，房租、学费或生活费第一次同时压来。一个高薪但占用大量时间的兼职摆在你面前。",
    choices: [
      { text: "接下兼职，先解决现实问题", intent: "用时间换取安全感", effects: { money: 9, health: -4, stress: 8, ability: 3 }, fallback: "你的日历几乎没有空格，账户终于不再让人害怕。你学会了独立，也开始理解精力是一种同样有限的货币。" },
      { text: "向家人或朋友坦白求助", intent: "允许自己被帮助", effects: { relations: 7, money: 4, stress: -4 }, fallback: "开口比想象中难。帮助没有解决一切，却让你知道，独立并不等于永远独自承担。" },
      { text: "削减开支，保住学习与休息", intent: "守住长期投入", effects: { money: 2, ability: 6, happiness: -2, stress: 1 }, fallback: "生活变得朴素而重复。你错过一些热闹，却保住了最需要积累的那部分时间。" },
    ],
  },
  {
    age: 25, chapter: "亲密", title: "两把钥匙", scene: "home", important: true,
    prompt: "一段重要关系走到是否共同生活的路口。搬到一起能节省成本，也会让彼此真正看见生活里不浪漫的部分。",
    choices: [
      { text: "搬到一起，认真经营共同生活", intent: "走向更深的承诺", effects: { relations: 10, money: 4, stress: 6, happiness: 5 }, fallback: "牙膏、账单和沉默的夜晚都成了关系的一部分。亲密不再只是感觉，而是一连串需要共同维护的小决定。" },
      { text: "保持距离，给彼此更多空间", intent: "保护独立边界", effects: { stress: -3, relations: 2, money: -3 }, fallback: "你们没有按照别人期待的速度前进。距离保留了呼吸，也要求双方更诚实地安排靠近。" },
      { text: "结束关系，因为方向已经不同", intent: "承认无法共同前进", effects: { relations: -8, happiness: -7, stress: 3, ability: 4 }, fallback: "分开没有让过去变得虚假。你在失去里重新辨认自己的边界，也接受有些爱只能陪人走到这里。" },
    ],
  },
  {
    age: 30, chapter: "而立", title: "身体寄来的提醒", scene: "city",
    prompt: "连续几个月疲惫、失眠，体检报告也出现警告。重要项目却正在最后冲刺，团队都在等你。",
    choices: [
      { text: "请假检查，暂停一段时间", intent: "优先长期健康", effects: { health: 11, stress: -7, money: -4, ability: -1 }, fallback: "停下来并没有让一切崩塌。你花了很久恢复，也第一次认真学习如何不把身体当成无限续航的机器。" },
      { text: "撑过项目，再处理身体问题", intent: "先完成责任", effects: { money: 6, ability: 5, health: -10, stress: 9 }, fallback: "项目按时交付，掌声也如期出现。只是庆功夜里，你比任何时候都清楚这份结果是用什么换来的。" },
      { text: "重新分工，不再独自扛住", intent: "建立可持续的合作", effects: { relations: 5, health: 5, ability: 3, stress: -2 }, fallback: "交出一部分控制权让你不安，团队却因此变得更可靠。你发现负责并不等于把所有重量都抱在自己怀里。" },
    ],
  },
  {
    age: 34, chapter: "选择", title: "朋友递来的商业计划", scene: "city",
    prompt: "多年好友邀请你加入一个尚未证明可行的新项目。它很接近你想做的事，但会动用积蓄，也可能改变友情。",
    choices: [
      { text: "全职加入，一起赌一次", intent: "为共同理想承担风险", effects: { ability: 9, money: -10, stress: 10, relations: 4, happiness: 6 }, fallback: "你们第一次因为合同和预算争吵，也第一次看见想法变成真实产品。梦想有了成本，友情也开始接受现实的压力测试。" },
      { text: "小额支持，但不离开现有生活", intent: "有限度地参与", effects: { money: -4, relations: 6, ability: 3, stress: 2 }, fallback: "你没有成为故事的主角，却在关键处提供了支点。保守让机会变小，也让关系保留了退路。" },
      { text: "拒绝投资，坦白自己的顾虑", intent: "保护边界与友情", effects: { money: 3, stress: -2, relations: -2, ability: 2 }, fallback: "对话并不舒服，但比含糊承诺更诚实。你们需要时间消化失望，也重新学习如何在不同道路上做朋友。" },
    ],
  },
  {
    age: 43, chapter: "中途", title: "空出来的那把椅子", scene: "home",
    prompt: "一个陪伴你多年的朋友决定移居远方。临走前，对方邀请你花一整周完成少年时一直没实现的旅行。",
    choices: [
      { text: "放下工作，陪朋友完成旅行", intent: "为关系留下一段完整时间", effects: { relations: 11, happiness: 8, money: -5, stress: -2 }, fallback: "旅行没有少年时想象得轻盈，你们却在疲惫里说出了很多迟到的话。离别仍然发生，但不再只剩匆忙。" },
      { text: "只参加最后一天的告别", intent: "在责任与关系间折中", effects: { relations: 5, money: -1, stress: 1 }, fallback: "一天装不下多年的友情，却足够让对方知道你来了。回程时，你开始计算自己究竟错过了多少次这样的邀请。" },
      { text: "工作太忙，只能线上送别", intent: "维持现有责任", effects: { money: 4, ability: 2, relations: -7, happiness: -3 }, fallback: "屏幕里的笑容很体面，通话结束后房间却突然安静。生活继续前进，只是那把空椅子偶尔会提醒你它的代价。" },
    ],
  },
  {
    age: 48, chapter: "变局", title: "被撤掉的职位", scene: "crossroads", important: true,
    prompt: "组织调整后，你熟悉的职位消失了。补偿足以支撑一段时间，但重新开始意味着承认过去的经验不再自动有效。",
    choices: [
      { text: "系统学习，转向新的领域", intent: "用不确定换取第二曲线", effects: { ability: 10, money: -7, stress: 7, happiness: 4 }, fallback: "重新坐进课堂让你局促，年轻同学却没有想象中在意年龄。你失去了一种身份，也获得重新定义自己的空间。" },
      { text: "依靠人脉，寻找相近职位", intent: "延续已有积累", effects: { relations: 7, money: 5, stress: 4, ability: 2 }, fallback: "过去建立的关系开始回响。新工作并不完全理想，却让你的经验在另一个地方继续生长。" },
      { text: "暂时停下，重新评估生活", intent: "把失去变成暂停", effects: { happiness: 7, stress: -6, money: -8, health: 4 }, fallback: "最初几周你每天都觉得自己应该做点什么。后来，空白慢慢从羞耻变成了能够听见内心的空间。" },
    ],
  },
  {
    age: 59, chapter: "回望", title: "老同学的聚会", scene: "home",
    prompt: "多年未见的人重新坐在一张桌边。有人耀眼，有人沉默，也有人提起一段你一直想忘记的旧事。",
    choices: [
      { text: "坦然谈起当年的自己", intent: "接受过去的不完整", effects: { happiness: 7, stress: -6, relations: 5 }, fallback: "故事从别人嘴里说出来时没有那么可怕。你们笑了一阵，也为一些当年不懂的事认真道歉。" },
      { text: "只聊近况，不碰过去", intent: "保留自己的边界", effects: { stress: -2, relations: 2 }, fallback: "聚会平稳结束，旧事依然留在原处。边界保护了你，也让一次可能的和解继续等待。" },
      { text: "提前离开，去见真正重要的人", intent: "不再服从社交期待", effects: { happiness: 5, relations: 1, stress: -4 }, fallback: "你走出喧闹的餐厅，拨通了另一个号码。年龄让你越来越清楚，时间应该给谁。" },
    ],
  },
  {
    age: 63, chapter: "缓慢", title: "膝盖与远山", scene: "late-life",
    prompt: "医生建议减少高强度活动。与此同时，一条你准备多年的远足路线今年可能是最后合适的机会。",
    choices: [
      { text: "缩短路线，做好准备后出发", intent: "调整愿望而非放弃", effects: { health: 2, happiness: 10, stress: 2, money: -3 }, fallback: "你走得很慢，也比过去看见更多细节。到达不再意味着征服，而是与身体谈成了一次合作。" },
      { text: "放弃远足，认真保护身体", intent: "接受现实限制", effects: { health: 8, stress: -3, happiness: -3 }, fallback: "放弃并不轻松，但疼痛逐渐减轻。你开始寻找不需要证明体力也能抵达的风景。" },
      { text: "照原计划完成全部路线", intent: "拒绝让年龄决定边界", effects: { happiness: 8, health: -9, stress: 5 }, fallback: "山顶的风令人难忘，恢复期也比预期漫长。你没有后悔，只是更清楚勇敢与逞强有时只隔一步。" },
    ],
  },
  {
    age: 72, chapter: "陪伴", title: "轮到你握住那只手", scene: "home", important: true,
    prompt: "一位重要的伴侣或朋友需要长期治疗。对方说不希望你的余下生活只剩医院，你也知道陪伴会改变自己的计划。",
    choices: [
      { text: "留下来，参与每一次治疗", intent: "把陪伴放在最前面", effects: { relations: 14, health: -4, stress: 9, happiness: -3 }, fallback: "医院的灯光替代了许多原本的风景。疲惫真实存在，而你们共同度过的每个普通早晨也同样真实。" },
      { text: "建立照护团队，也保留自己的生活", intent: "让陪伴能够持续", effects: { relations: 9, money: -8, stress: 3, health: 1 }, fallback: "你们花时间讨论边界，也允许别人加入。爱不再被证明为牺牲多少，而是能否陪得更久。" },
      { text: "尊重对方的要求，完成原来的计划", intent: "接受彼此独立的选择", effects: { happiness: 3, relations: -3, stress: 5 }, fallback: "离开的每一天都夹着愧疚和感激。你们用电话分享沿途风景，也共同承担选择的复杂。" },
    ],
  },
  {
    age: 76, chapter: "留存", title: "一箱没有整理的照片", scene: "late-life",
    prompt: "旧照片、录音和信件堆满一箱。家里人希望你把故事讲出来，但有些记忆你从未对任何人提起。",
    choices: [
      { text: "做成完整的人生档案", intent: "把记忆交给后来的人", effects: { relations: 9, happiness: 6, ability: 3, stress: 2 }, fallback: "整理用了很多个月。你发现照片记录的是表情，而你补上的故事让后来的人理解那些表情为什么出现。" },
      { text: "只挑快乐的部分留下", intent: "保护家人与自己的形象", effects: { happiness: 4, stress: -2, relations: 3 }, fallback: "留下的故事温暖而整齐，像一本精心装订的相册。那些没有被讲述的部分则继续只属于你。" },
      { text: "把最难的秘密告诉一个可信赖的人", intent: "在最后阶段选择诚实", effects: { relations: 8, stress: -8, happiness: 2 }, fallback: "对方没有给出答案，只安静地听完。秘密没有消失，但它终于不再由你一个人保管。" },
    ],
  },
  {
    age: 79, chapter: "失去", title: "熟悉号码不再响起", scene: "sunset", important: true,
    prompt: "一个陪伴你很久的人离开了。房间里的物品仍保持原样，旁人劝你尽快整理，好继续生活。",
    choices: [
      { text: "慢慢整理，每件物品都好好告别", intent: "允许悲伤拥有时间", effects: { happiness: -4, stress: -5, relations: 5 }, fallback: "整理持续了很久，有时一天只能处理一件东西。悲伤没有被清空，却从锋利变成了可以携带的重量。" },
      { text: "把物品送给需要它们的人", intent: "让记忆继续流动", effects: { relations: 8, happiness: 3, stress: -2 }, fallback: "熟悉的物品去了陌生家庭。你意外地感到安慰，仿佛一部分共同生活没有结束，只是换了形状。" },
      { text: "保持房间原样，暂时不碰", intent: "保护还没准备好的自己", effects: { stress: 2, happiness: -2 }, fallback: "那扇门很长时间没有打开。它既是避难所也是停住的时钟，直到某一天你愿意再次推门。" },
    ],
  },
];

const countryEvent: Record<Country, LifeEvent> = {
  cn: {
    age: 23, chapter: "初入社会", title: "留下，还是回去", scene: "station", important: true,
    prompt: "毕业后，你在大城市得到一份起薪普通但有成长空间的工作。房租会占去近一半收入；家乡也有一份稳定工作，父母希望你回来。",
    choices: [
      { text: "留在大城市试三年", intent: "追求职业机会", effects: { money: -5, ability: 10, stress: 11, relations: -4 }, fallback: "你租下一间很小的房间，把三年写在便签上。城市没有承诺回报你的努力，但它给了你接触更大世界的机会。" },
      { text: "回家乡，靠近家人", intent: "选择稳定和家庭", effects: { money: 7, relations: 11, stress: -5, happiness: 4 }, fallback: "熟悉的街道让生活成本和孤独都下降了。你偶尔担心自己错过什么，也逐渐发现留下同样需要勇气。" },
      { text: "去另一座成本较低的城市", intent: "寻找第三条道路", effects: { ability: 6, money: 2, stress: 5, happiness: 3 }, fallback: "你没有选择最耀眼或最熟悉的答案。新的城市给了你喘息空间，也要求你重新建立一切。" },
    ],
  },
  us: {
    age: 23, chapter: "初入社会", title: "账单与机会", scene: "station", important: true,
    prompt: "毕业后，你拿到一份外州工作的邀请。薪水更高，但你还有学生贷款，并且需要离开熟悉的支持网络。",
    choices: [
      { text: "搬去外州，优先偿还贷款", intent: "追求收入和独立", effects: { money: 10, ability: 7, stress: 9, relations: -6 }, fallback: "第一份工资让数字开始朝正确方向移动，但新城市的孤独无法被电子账单显示。你学会了把自由和责任一起计算。" },
      { text: "留在本地，接受较低薪水", intent: "保留支持网络", effects: { money: -3, relations: 10, stress: -3, happiness: 5 }, fallback: "你没有选择简历上最好看的答案。熟悉的人让一些艰难的月份变得可承受，而贷款仍在提醒你这份选择的价格。" },
      { text: "与雇主谈远程和搬迁补助", intent: "主动谈判条件", effects: { money: 5, ability: 8, stress: 4 }, fallback: "你第一次把自己的处境摆上谈判桌。没有得到全部要求，但获得了几个月缓冲，也建立起一种不再被动接受条件的习惯。" },
    ],
  },
  jp: {
    age: 23, chapter: "初入社会", title: "春天的内定", scene: "station", important: true,
    prompt: "你得到一家东京公司的录用通知。它稳定、体面，却与你真正喜欢的方向不同；大阪的小团队愿意给你机会，但未来并不确定。",
    choices: [
      { text: "进入东京的大公司", intent: "选择稳定和主流路径", effects: { money: 9, ability: 6, stress: 11, relations: -5 }, fallback: "四月，你穿着新西装挤进早高峰。稳定带来了安心，也让一天的边界变得模糊。你开始学习在集体期待里保存一点自己。" },
      { text: "加入大阪的小团队", intent: "选择兴趣和不确定性", effects: { money: -5, happiness: 10, ability: 9, stress: 6 }, fallback: "办公室比想象中更小，很多制度都还不存在。你承担了更多风险，也更清楚每天的工作为什么与你有关。" },
      { text: "暂缓决定，做一年自由职业", intent: "探索不同道路", effects: { ability: 7, money: -7, stress: 8, happiness: 4 }, fallback: "没有固定名片让一些亲戚担心，但你第一次用自己的节奏安排时间。不稳定是真实的，获得的视野也是真实。" },
    ],
  },
};

const statMeta: Record<StatKey, { label: string; icon: string; positive: boolean; description: string }> = {
  health: { label: "健康", icon: "✦", positive: true, description: "体力、恢复速度与长期身体底子" },
  happiness: { label: "心境", icon: "☼", positive: true, description: "感受快乐、消化失落与重新振作的能力" },
  ability: { label: "能力", icon: "⌁", positive: true, description: "学习、判断、表达和解决问题的基础" },
  money: { label: "资源", icon: "◈", positive: true, description: "家庭能提供的金钱、时间与选择空间" },
  relations: { label: "关系", icon: "∞", positive: true, description: "家人、朋友与可信赖支持网络的强度" },
  stress: { label: "压力", icon: "≈", positive: false, description: "对风险与变化的敏感度；数值越低越从容" },
};

const STARTING_POINT_BUDGET = 330;
const defaultStartingStats: Stats = { health: 60, happiness: 55, ability: 50, money: 40, relations: 55, stress: 30 };
const positiveStatKeys: StatKey[] = ["health", "happiness", "ability", "money", "relations"];

const personas: Record<PersonaId, { name: string; emoji: string; tagline: string; color: string; stats: Stats }> = {
  dreamer: {
    name: "浪漫梦想家", emoji: "☁️", tagline: "相信直觉，也愿意为喜欢的事绕远路", color: "peach",
    stats: { health: 55, happiness: 60, ability: 65, money: 30, relations: 50, stress: 30 },
  },
  connector: {
    name: "温柔连接者", emoji: "🌷", tagline: "擅长照顾关系，在人群中寻找归属", color: "rose",
    stats: { health: 55, happiness: 60, ability: 45, money: 35, relations: 70, stress: 35 },
  },
  strategist: {
    name: "清醒策略家", emoji: "🧩", tagline: "喜欢提前准备，让机会变成可执行的计划", color: "sky",
    stats: { health: 50, happiness: 45, ability: 75, money: 55, relations: 40, stress: 35 },
  },
  "free-spirit": {
    name: "自在行动派", emoji: "🛼", tagline: "精力旺盛，跌倒以后会先笑再站起来", color: "mint",
    stats: { health: 65, happiness: 70, ability: 45, money: 25, relations: 55, stress: 30 },
  },
};

function startingPointCost(stats: Stats) {
  return positiveStatKeys.reduce((total, key) => total + stats[key], 0) + (100 - stats.stress);
}

function describeStartingProfile(stats: Stats) {
  const ranked = [...positiveStatKeys].sort((a, b) => stats[b] - stats[a]);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  let title = "不完美，但真实的起点";

  if (stats.ability >= 70 && stats.stress >= 55) title = "敏锐而紧绷的早熟者";
  else if (stats.relations >= 65 && stats.happiness >= 60) title = "被关系稳稳托住的人";
  else if (stats.money <= 35 && stats.ability >= 65) title = "靠能力争取空间的人";
  else if (stats.health >= 65 && stats.happiness >= 65) title = "拥有稳定生命底盘的人";
  else if (stats.stress <= 30 && stats.money <= 40) title = "资源有限，却不容易慌乱的人";

  const stressSentence = stats.stress >= 65
    ? "你会比别人更早察觉风险，也更容易在事情发生前耗尽精力。"
    : stats.stress <= 35
      ? "面对变化时你通常能够保持镇定，但偶尔也会低估危险的重量。"
      : "你对风险保持正常警觉，真正的压力会在连续选择中慢慢积累。";
  const supportSentence = stats.relations >= 65 && stats.money < 45
    ? "物质条件未必宽裕，但重要时刻通常有人愿意与你一起承担。"
    : stats.money >= 65 && stats.relations < 45
      ? "你拥有较多现实资源，却需要学习如何建立真正可靠的亲密关系。"
      : stats.money < 40 && stats.relations < 40
        ? "资源和支持都不充足，许多选择从一开始就需要自己承担后果。"
        : "现实资源与人际支持相对均衡，不会替你决定人生，却能提供缓冲。";

  return {
    title,
    description: `你的突出优势是${statMeta[strongest].label}，相对薄弱的是${statMeta[weakest].label}。${stressSentence}${supportSentence}`,
    signals: [`优势 · ${statMeta[strongest].label} ${stats[strongest]}`, `留意 · ${statMeta[weakest].label} ${stats[weakest]}`, `压力基线 · ${stats.stress}`],
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hash(seed: string) {
  return [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function makeProfile(country: Country, playerName: string, startingStats: Stats, personaId: PersonaId = "dreamer") {
  const seed = hash(`${country}-${playerName || Date.now()}`);
  const countryInfo = countries[country];
  const generatedName = playerName.trim() || names[country][seed % names[country].length];
  const place = countryInfo.places[(seed >> 3) % countryInfo.places.length];
  const family = startingStats.money >= 65 && startingStats.relations >= 60
    ? "家境稳定，照料与期待同样充足"
    : startingStats.money < 40 && startingStats.relations >= 60
      ? "生活并不宽裕，但家人彼此照应"
      : startingStats.money >= 60 && startingStats.relations < 45
        ? "物质条件不错，家人却不善于表达感情"
        : startingStats.money < 40 && startingStats.relations < 45
          ? "资源有限，很多决定需要独自承担"
          : ["经济普通，家人关系亲密", "家中重视教育，也重视稳定", "由一位家长和祖辈共同照顾"][(seed >> 5) % 3];
  const dominant = [...positiveStatKeys].sort((a, b) => startingStats[b] - startingStats[a])[0];
  const traitCore: Record<StatKey, string> = {
    health: "精力充沛，习惯先行动再调整",
    happiness: "情绪明亮，跌倒后通常愿意再试一次",
    ability: "早熟而好奇，喜欢弄清事情背后的原因",
    money: "对资源与秩序敏感，做决定时很少忽视现实代价",
    relations: "容易察觉他人的情绪，也愿意建立长期联系",
    stress: "对环境变化十分敏锐",
  };
  const stressTone = startingStats.stress >= 60 ? "，但经常提前为最坏结果担心" : startingStats.stress <= 35 ? "，面对陌生处境不容易慌乱" : "，谨慎与冒险之间大致平衡";
  const trait = `${traitCore[dominant]}${stressTone}`;
  return { name: generatedName, place, family, trait, personaId, persona: personas[personaId].name, birthYear: 2004 };
}

const scenePalettes: Record<string, [string, string, string, string]> = {
  childhood: ["#9dddf5", "#f9c7dc", "#72bd8c", "#fff0a8"], school: ["#a9d5ff", "#c8b9f5", "#70b98a", "#ffe18a"],
  departure: ["#f7b98c", "#8177cf", "#687da5", "#ffd56d"], station: ["#9dcde3", "#9b8acb", "#596c8b", "#ffca76"],
  city: ["#7ccae8", "#8b75c9", "#526b8d", "#ffc86d"], home: ["#f5b39e", "#c58bb7", "#77aa83", "#ffe39a"],
  crossroads: ["#f0b27f", "#9577c8", "#6d8f78", "#ffd16f"], "late-life": ["#efad75", "#8278b7", "#718a78", "#ffe1a3"],
  sunset: ["#f69a75", "#8a6ea8", "#5b6e78", "#ffd47e"],
};

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3) {
  const characters = [...text];
  const lines: string[] = [];
  let line = "";
  for (const character of characters) {
    const next = line + character;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.join("").length < text.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  return lines;
}

function drawStoryFrame(canvas: HTMLCanvasElement, event: LifeEvent, profile: ReturnType<typeof makeProfile>, narrative: string, progress = 0) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  const [skyA, skyB, ground, glow] = scenePalettes[event.scene] || scenePalettes.childhood;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, skyA); gradient.addColorStop(.58, skyB); gradient.addColorStop(1, ground);
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);

  const sunX = width * (.74 + Math.sin(progress * Math.PI * 2) * .025);
  const sunY = height * (.22 - Math.sin(progress * Math.PI) * .03);
  context.beginPath(); context.arc(sunX, sunY, 78, 0, Math.PI * 2); context.fillStyle = glow; context.fill();
  context.globalAlpha = .22; context.beginPath(); context.arc(sunX, sunY, 118, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;

  context.fillStyle = "rgba(255,255,255,.28)";
  for (let index = 0; index < 5; index += 1) {
    const x = ((index * 310 + progress * 70) % (width + 240)) - 120;
    const y = 90 + (index % 3) * 58;
    context.beginPath(); context.ellipse(x, y, 90, 28, 0, 0, Math.PI * 2); context.fill();
  }

  context.fillStyle = ground; context.beginPath(); context.moveTo(0, height * .62); context.quadraticCurveTo(width * .24, height * .46, width * .48, height * .65); context.quadraticCurveTo(width * .72, height * .84, width, height * .56); context.lineTo(width, height); context.lineTo(0, height); context.fill();
  context.fillStyle = "rgba(255,255,255,.16)"; context.beginPath(); context.moveTo(width * .52, height); context.quadraticCurveTo(width * (.55 + progress * .03), height * .73, width * .62, height * .59); context.lineWidth = 90; context.strokeStyle = "rgba(255,235,190,.75)"; context.stroke();

  const figureX = width * (.51 + progress * .06);
  const figureY = height * .69 - Math.sin(progress * Math.PI * 6) * 3;
  context.fillStyle = "#3c3158"; context.beginPath(); context.arc(figureX, figureY - 62, 22, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.roundRect(figureX - 19, figureY - 42, 38, 68, 17); context.fill();
  context.lineWidth = 9; context.lineCap = "round"; context.strokeStyle = "#3c3158";
  context.beginPath(); context.moveTo(figureX - 8, figureY + 18); context.lineTo(figureX - 18, figureY + 54); context.moveTo(figureX + 8, figureY + 18); context.lineTo(figureX + 21, figureY + 52); context.stroke();

  const overlay = context.createLinearGradient(0, height * .56, 0, height);
  overlay.addColorStop(0, "rgba(34,28,57,0)"); overlay.addColorStop(1, "rgba(34,28,57,.78)"); context.fillStyle = overlay; context.fillRect(0, height * .45, width, height * .55);
  context.fillStyle = "rgba(255,255,255,.9)"; context.font = "800 22px system-ui, sans-serif"; context.fillText(`${event.chapter} · ${event.age} 岁 · ${profile.name}`, 52, height - 156);
  context.fillStyle = "#fff"; context.font = "900 42px system-ui, sans-serif"; context.fillText(event.title, 52, height - 105);
  context.font = "500 19px system-ui, sans-serif";
  wrapCanvasText(context, narrative, width - 104, 2).forEach((line, index) => context.fillText(line, 52, height - 65 + index * 26));
}

async function createLocalSceneImage(event: LifeEvent, profile: ReturnType<typeof makeProfile>, narrative: string) {
  const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
  drawStoryFrame(canvas, event, profile, narrative, .35);
  return canvas.toDataURL("image/png", .94);
}

async function createLocalStoryVideo(event: LifeEvent, profile: ReturnType<typeof makeProfile>, narrative: string, onProgress?: (value: number) => void) {
  const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
  if (!("captureStream" in canvas) || typeof MediaRecorder === "undefined") throw new Error("当前浏览器不支持本地视频录制");
  const stream = canvas.captureStream(30);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (eventData) => { if (eventData.data.size) chunks.push(eventData.data); };
  const finished = new Promise<string>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("视频录制失败"));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "video/webm" })));
    };
  });
  recorder.start(250);
  const duration = 5200;
  const startedAt = performance.now();
  await new Promise<void>((resolve) => {
    const render = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      onProgress?.(progress * 100);
      drawStoryFrame(canvas, event, profile, narrative, progress);
      if (progress < 1) requestAnimationFrame(render); else resolve();
    };
    requestAnimationFrame(render);
  });
  recorder.stop();
  return finished;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [country, setCountry] = useState<Country>("cn");
  const [personaId, setPersonaId] = useState<PersonaId>("dreamer");
  const [nameInput, setNameInput] = useState("");
  const [startingStats, setStartingStats] = useState<Stats>(personas.dreamer.stats);
  const [profile, setProfile] = useState(() => makeProfile("cn", "", personas.dreamer.stats, "dreamer"));
  const [stats, setStats] = useState<Stats>(personas.dreamer.stats);
  const [eventIndex, setEventIndex] = useState(0);
  const [turnNumber, setTurnNumber] = useState(0);
  const [plannedEvents, setPlannedEvents] = useState<PlannedLifeEvent[]>([]);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [videoJobs, setVideoJobs] = useState<Record<string, PreloadedVideoJob>>({});
  const preloadStartedRef = useRef(new Set<string>());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<{ title: string; narrative: string; effects: Partial<Stats>; live: boolean } | null>(null);
  const [pendingChoice, setPendingChoice] = useState("");
  const [thinking, setThinking] = useState(false);
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [artLoading, setArtLoading] = useState(false);
  const [cgPlaying, setCgPlaying] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<"idle" | "queued" | "in_progress" | "completed" | "failed">("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [mediaCapabilities, setMediaCapabilities] = useState<MediaCapabilities>({ image: false, video: false });
  const [mediaNotice, setMediaNotice] = useState("");
  const [cloudSave, setCloudSave] = useState<SavePayload | null>(null);
  const [saveState, setSaveState] = useState<"loading" | "saved" | "saving" | "offline" | "error">("loading");

  const fallbackEvents = useMemo(() => [...sharedEvents, ...extraLifeEvents, countryEvent[country]].sort((a, b) => a.age - b.age), [country]);
  const currentEvent: LifeEvent = plannedEvents[0] || fallbackEvents[Math.min(eventIndex, fallbackEvents.length - 1)];
  const startingPointsRemaining = STARTING_POINT_BUDGET - startingPointCost(startingStats);
  const startingPortrait = useMemo(() => describeStartingProfile(startingStats), [startingStats]);

  useEffect(() => {
    async function loadAccountAndSave() {
      try {
        const [meResponse, saveResponse, capabilitiesResponse] = await Promise.all([fetch("/api/me"), fetch("/api/save"), fetch("/api/capabilities")]);
        if (meResponse.ok) setAccount(await meResponse.json());
        if (capabilitiesResponse.ok) setMediaCapabilities(await capabilitiesResponse.json());
        if (saveResponse.ok) {
          const data = await saveResponse.json();
          setCloudSave(data.save || null);
          setSaveState(data.save ? "saved" : "offline");
        } else {
          setSaveState("offline");
        }
      } catch {
        setSaveState("offline");
      }
    }
    void loadAccountAndSave();
  }, []);

  useEffect(() => {
    if (!videoId || !["queued", "in_progress"].includes(videoStatus)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/video?id=${encodeURIComponent(videoId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setVideoStatus(data.status);
        setVideoProgress(data.progress || 0);
        if (data.status === "completed") setVideoUrl(`/api/video/content?id=${encodeURIComponent(videoId)}`);
      } catch {
        setVideoStatus("failed");
      }
    }, 12000);
    return () => window.clearInterval(timer);
  }, [videoId, videoStatus]);

  const pendingPreloadKey = Object.values(videoJobs)
    .filter((job) => job.status === "queued" || job.status === "in_progress")
    .map((job) => `${job.eventId}:${job.apiId}:${job.status}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!pendingPreloadKey) return;
    const timer = window.setInterval(async () => {
      const pendingJobs = Object.values(videoJobs).filter((job) => job.status === "queued" || job.status === "in_progress");
      const updates = await Promise.all(pendingJobs.map(async (job) => {
        try {
          const response = await fetch(`/api/video?id=${encodeURIComponent(job.apiId)}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          return { ...job, status: data.status, progress: data.progress || 0 } as PreloadedVideoJob;
        } catch {
          return { ...job, status: "failed", progress: 0 } as PreloadedVideoJob;
        }
      }));
      if (updates.length) setVideoJobs((current) => ({ ...current, ...Object.fromEntries(updates.map((job) => [job.eventId, job])) }));
    }, 12000);
    return () => window.clearInterval(timer);
  }, [pendingPreloadKey, videoJobs]);

  useEffect(() => {
    const plannedCurrent = plannedEvents[0];
    if (!plannedCurrent) return;
    const job = videoJobs[plannedCurrent.id];
    if (!job) return;
    setVideoId(job.apiId);
    setVideoStatus(job.status);
    setVideoProgress(job.progress);
    if (job.status === "completed") {
      setVideoUrl(`/api/video/content?id=${encodeURIComponent(job.apiId)}`);
      setMediaNotice("这段大事件开场 CG 已在两个选择之前开始制作，并在事件到来时自动载入。");
    } else if (job.status === "queued" || job.status === "in_progress") {
      setMediaNotice(`导演已提前制作这一幕，当前进度 ${Math.round(job.progress)}%。`);
    }
  }, [plannedEvents, videoJobs]);

  async function requestEventPlan(
    activeProfile: ReturnType<typeof makeProfile>,
    activeStats: Stats,
    activeHistory: HistoryItem[],
    existingFuture: PlannedLifeEvent[],
    count: number,
    activeTurn: number,
    activeCountry: Country = country,
  ) {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: countries[activeCountry].name,
        profile: activeProfile,
        stats: activeStats,
        history: activeHistory,
        existingFuture: existingFuture.map((event) => ({ age: event.age, title: event.title, prompt: event.prompt })),
        count,
        turnNumber: activeTurn,
      }),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.events)) throw new Error(data.error || "人生导演暂时无法规划下一幕");
    return data.events as PlannedLifeEvent[];
  }

  function preloadFutureVideos(queue: PlannedLifeEvent[], activeProfile: ReturnType<typeof makeProfile>, activeCountry: Country = country) {
    if (!mediaCapabilities.video) return;
    queue.forEach((event, index) => {
      if (!event.important || index < 2 || preloadStartedRef.current.has(event.id) || videoJobs[event.id]) return;
      preloadStartedRef.current.add(event.id);
      void (async () => {
        try {
          const response = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: activeProfile,
              country: countries[activeCountry].name,
              age: event.age,
              scene: event.scene,
              narrative: event.prompt,
              videoPrompt: event.videoPrompt,
              preloaded: true,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setVideoJobs((current) => ({
            ...current,
            [event.id]: { eventId: event.id, apiId: data.id, status: data.status || "queued", progress: data.progress || 0 },
          }));
        } catch {
          setVideoJobs((current) => ({ ...current, [event.id]: { eventId: event.id, apiId: "", status: "failed", progress: 0 } }));
        }
      })();
    });
  }

  async function refillEventQueue(
    existingFuture: PlannedLifeEvent[],
    activeProfile: ReturnType<typeof makeProfile>,
    activeStats: Stats,
    activeHistory: HistoryItem[],
    activeTurn: number,
    activeCountry: Country = country,
  ) {
    const needed = Math.max(0, 3 - existingFuture.length);
    if (!needed) return existingFuture;
    if (!existingFuture.length) setDirectorLoading(true);
    try {
      const additions = await requestEventPlan(activeProfile, activeStats, activeHistory, existingFuture, needed, activeTurn, activeCountry);
      const queue = [...existingFuture, ...additions];
      setPlannedEvents(queue);
      preloadFutureVideos(queue, activeProfile, activeCountry);
      return queue;
    } finally {
      setDirectorLoading(false);
    }
  }

  async function persistSave(save: SavePayload) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/save", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(save) });
      if (!response.ok) throw new Error("save failed");
      setCloudSave(save);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function restoreSave() {
    if (!cloudSave || cloudSave.version !== 1) return;
    const savedEvents = [...sharedEvents, ...extraLifeEvents, countryEvent[cloudSave.country]].sort((a, b) => a.age - b.age);
    const lastCompletedAge = cloudSave.history.at(-1)?.age;
    const matchedIndex = cloudSave.eventAge
      ? savedEvents.findIndex((event) => event.age === cloudSave.eventAge)
      : typeof lastCompletedAge === "number"
        ? savedEvents.findIndex((event) => event.age > lastCompletedAge)
        : cloudSave.eventIndex;
    setCountry(cloudSave.country);
    setPersonaId(cloudSave.personaId);
    setNameInput(cloudSave.nameInput);
    setStartingStats(cloudSave.startingStats);
    setProfile(cloudSave.profile);
    setStats(cloudSave.stats);
    setEventIndex(cloudSave.screen === "end" ? savedEvents.length - 1 : Math.max(0, matchedIndex));
    setTurnNumber(cloudSave.turnNumber ?? cloudSave.history.length);
    setPlannedEvents(cloudSave.plannedEvents || []);
    setVideoJobs(cloudSave.videoJobs || {});
    Object.keys(cloudSave.videoJobs || {}).forEach((eventId) => preloadStartedRef.current.add(eventId));
    setHistory(cloudSave.history);
    setResult(null);
    setArtUrl(null);
    setVideoUrl(null);
    setScreen(cloudSave.screen === "game" || cloudSave.screen === "end" ? cloudSave.screen : "name");
    if (cloudSave.screen === "game") {
      const restoredQueue = cloudSave.plannedEvents || [];
      void refillEventQueue(restoredQueue, cloudSave.profile, cloudSave.stats, cloudSave.history, cloudSave.turnNumber ?? cloudSave.history.length, cloudSave.country);
      preloadFutureVideos(restoredQueue, cloudSave.profile, cloudSave.country);
    }
  }

  function selectPersona(nextPersona: PersonaId) {
    setPersonaId(nextPersona);
    setStartingStats({ ...personas[nextPersona].stats });
  }

  async function startLife() {
    if (startingPointsRemaining !== 0) return;
    const nextProfile = makeProfile(country, nameInput, startingStats, personaId);
    const nextStats = { ...startingStats };
    setProfile(nextProfile);
    setStats(nextStats);
    setHistory([]);
    setEventIndex(0);
    setTurnNumber(0);
    setPlannedEvents([]);
    setVideoJobs({});
    preloadStartedRef.current.clear();
    setResult(null);
    setArtUrl(null);
    setScreen("game");
    setDirectorLoading(true);
    try {
      const queue = await requestEventPlan(nextProfile, nextStats, [], [], 3, 0, country);
      setPlannedEvents(queue);
      preloadFutureVideos(queue, nextProfile, country);
      void persistSave({ version: 1, screen: "game", country, personaId, nameInput, startingStats, profile: nextProfile, stats: nextStats, eventIndex: 0, eventAge: queue[0]?.age, history: [], plannedEvents: queue, turnNumber: 0, videoJobs: {} });
    } catch {
      const fallbackQueue = fallbackEvents.slice(0, 3).map((event, index) => ({ ...event, id: `client-fallback-${Date.now()}-${index}`, videoPrompt: event.prompt, origin: "fallback" as const }));
      setPlannedEvents(fallbackQueue);
      void persistSave({ version: 1, screen: "game", country, personaId, nameInput, startingStats, profile: nextProfile, stats: nextStats, eventIndex: 0, eventAge: fallbackQueue[0]?.age, history: [], plannedEvents: fallbackQueue, turnNumber: 0, videoJobs: {} });
    } finally {
      setDirectorLoading(false);
    }
  }

  async function choose(choice: Choice) {
    if (thinking || result) return;
    setThinking(true);
    setPendingChoice(choice.text);
    setArtUrl(null);
    setCgPlaying(false);
    setVideoId(null);
    setVideoUrl(null);
    setVideoStatus("idle");
    setMediaNotice("");
    try {
      const response = await fetch("/api/turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: countries[country].name, profile, stats, history, event: currentEvent, choice }) });
      const data = await response.json();
      setResult({ title: data.title || currentEvent.title, narrative: data.narrative || choice.fallback, effects: data.effects || choice.effects, live: Boolean(data.live) });
    } catch {
      setResult({ title: currentEvent.title, narrative: choice.fallback, effects: choice.effects, live: false });
    } finally {
      setThinking(false);
    }
  }

  async function createArt() {
    if (!result || artLoading) return;
    setArtLoading(true);
    try {
      if (mediaCapabilities.image) {
        const response = await fetch("/api/illustrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, country: countries[country].name, age: currentEvent.age, scene: currentEvent.scene, narrative: result.narrative }) });
        const data = await response.json();
        if (!response.ok || !data.image) throw new Error(data.error || "AI 画面生成失败");
        setArtUrl(data.image);
        setMediaNotice("这张专属画面由 GPT Image 2 根据当前事件生成。");
      } else {
        setArtUrl(await createLocalSceneImage(currentEvent, profile, result.narrative));
        setMediaNotice("当前未连接 OpenAI API：已在你的设备上绘制专属场景。连接后会自动升级为 GPT Image 2 插画。");
      }
      setCgPlaying(true);
    } catch (error) {
      setArtUrl(await createLocalSceneImage(currentEvent, profile, result.narrative));
      setCgPlaying(true);
      setMediaNotice(`${error instanceof Error ? error.message : "AI 画面暂不可用"}；已自动改用本地专属场景。`);
    } finally {
      setArtLoading(false);
    }
  }

  async function createVideo() {
    if (!result || ["queued", "in_progress"].includes(videoStatus)) return;
    setVideoStatus(mediaCapabilities.video ? "queued" : "in_progress");
    setVideoProgress(0);
    try {
      if (!mediaCapabilities.video) {
        const localVideoUrl = await createLocalStoryVideo(currentEvent, profile, result.narrative, setVideoProgress);
        setVideoUrl(localVideoUrl);
        setVideoStatus("completed");
        setVideoProgress(100);
        setMediaNotice("已生成一段可播放、可保存的本地剧情短片。连接 OpenAI API 后，这个按钮会改为 Sora 2 视频。");
        return;
      }
      const response = await fetch("/api/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, country: countries[country].name, age: currentEvent.age, scene: currentEvent.scene, narrative: result.narrative }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setVideoId(data.id);
      setVideoStatus(data.status || "queued");
      setVideoProgress(data.progress || 0);
      setMediaNotice("Sora 2 已开始制作。真实视频通常需要数分钟，可以继续停留在本幕等待进度。");
    } catch (error) {
      try {
        setVideoStatus("in_progress");
        const localVideoUrl = await createLocalStoryVideo(currentEvent, profile, result.narrative, setVideoProgress);
        setVideoUrl(localVideoUrl);
        setVideoStatus("completed");
        setVideoProgress(100);
        setMediaNotice(`${error instanceof Error ? error.message : "Sora 暂不可用"}；已自动生成本地剧情短片。`);
      } catch (fallbackError) {
        setVideoStatus("failed");
        setMediaNotice(fallbackError instanceof Error ? fallbackError.message : "当前浏览器无法录制剧情短片。");
      }
    }
  }

  function continueLife() {
    if (!result) return;
    const nextStats = { ...stats };
    (Object.keys(result.effects) as StatKey[]).forEach((key) => {
      const delta = Math.max(-18, Math.min(18, Number(result.effects[key] || 0)));
      nextStats[key] = clamp(nextStats[key] + delta);
    });
    const nextHistory = [...history, { age: currentEvent.age, title: result.title, choice: pendingChoice || "做出了选择", narrative: result.narrative }];
    const ended = currentEvent.age >= 82 || nextHistory.length >= 40;
    const nextScreen: Screen = ended ? "end" : "game";
    const nextIndex = eventIndex + 1;
    const nextTurn = turnNumber + 1;
    const nextQueue = plannedEvents.length ? plannedEvents.slice(1) : [];
    const remainingIds = new Set(nextQueue.map((event) => event.id));
    const remainingVideoJobs = Object.fromEntries(Object.entries(videoJobs).filter(([eventId]) => remainingIds.has(eventId)));
    setStats(nextStats);
    setHistory(nextHistory);
    setTurnNumber(nextTurn);
    setPlannedEvents(nextQueue);
    setVideoJobs(remainingVideoJobs);
    setResult(null);
    setPendingChoice("");
    setArtUrl(null);
    setVideoId(null);
    setVideoUrl(null);
    setVideoStatus("idle");
    setVideoProgress(0);
    setMediaNotice("");
    setEventIndex(nextIndex);
    setScreen(nextScreen);
    if (ended) {
      void persistSave({ version: 1, screen: nextScreen, country, personaId, nameInput, startingStats, profile, stats: nextStats, eventIndex: nextIndex, eventAge: currentEvent.age, history: nextHistory, plannedEvents: [], turnNumber: nextTurn, videoJobs: {} });
      return;
    }
    void (async () => {
      try {
        const fullQueue = await refillEventQueue(nextQueue, profile, nextStats, nextHistory, nextTurn, country);
        void persistSave({ version: 1, screen: "game", country, personaId, nameInput, startingStats, profile, stats: nextStats, eventIndex: nextIndex, eventAge: fullQueue[0]?.age, history: nextHistory, plannedEvents: fullQueue, turnNumber: nextTurn, videoJobs: remainingVideoJobs });
      } catch {
        void persistSave({ version: 1, screen: "game", country, personaId, nameInput, startingStats, profile, stats: nextStats, eventIndex: nextIndex, eventAge: nextQueue[0]?.age, history: nextHistory, plannedEvents: nextQueue, turnNumber: nextTurn, videoJobs: remainingVideoJobs });
      }
    })();
  }

  function restart() {
    setNameInput("");
    setResult(null);
    setHistory([]);
    setPlannedEvents([]);
    setVideoJobs({});
    setScreen("splash");
  }

  if (screen === "splash") {
    return (
      <main className="splash-shell">
        <div className="splash-cloud cloud-one" /><div className="splash-cloud cloud-two" />
        <nav className="playful-nav"><div className="playful-logo"><span>一</span><b>这一生</b></div><div className="account-pill"><span className="account-dot" />{account?.displayName || "正在读取账号"}</div></nav>
        <section className="splash-hero">
          <p className="sticker">✦ AI LIFE STORY GAME</p>
          <h1>这一生<br /><em>会走向哪里？</em></h1>
          <p>取一个名字，选一副性格底牌。每一次决定都会改变故事、数值和下一幕的风景。</p>
          <div className="splash-actions">
            <button className="big-play-button" onClick={() => setScreen("name")}><span>开始新人生</span><b>▶</b></button>
            {cloudSave && <button className="continue-save" onClick={restoreSave}><span>继续 {cloudSave.profile.name} 的人生</span><small>{cloudSave.history.length} 个转折 · {saveState === "saved" ? "云端已保存" : "本地试玩存档"}</small></button>}
          </div>
          <div className="feature-bubbles"><span>🎭 自定义人设</span><span>🧠 AI 创造每个事件</span><span>🎬 大事件提前两步制作</span></div>
        </section>
        <aside className="splash-card"><span className="tiny-label">TODAY&apos;S PROPHECY</span><div className="mini-scene"><i>☀</i><b>你会遇见<br />意料之外的自己</b></div><p>没有最优解，只有被你走出来的路。</p></aside>
        <footer className="splash-footer"><span>{account?.localPreview ? "本地试玩模式" : account?.authenticated ? "ChatGPT 账号已连接" : "登录后可跨设备保存"}</span>{account && !account.localPreview && (account.authenticated ? <a href="/signout-with-chatgpt?return_to=/">退出账号</a> : <a href="/signin-with-chatgpt?return_to=/">用 ChatGPT 登录</a>)}</footer>
      </main>
    );
  }

  if (screen === "name") {
    return (
      <main className="setup-shell name-step">
        <nav className="setup-nav"><button onClick={() => setScreen("splash")}>← 返回</button><div><span className="active" /><span /></div><small>1 / 2</small></nav>
        <section className="name-card">
          <span className="step-emoji">✍️</span><p className="sticker">FIRST THINGS FIRST</p>
          <h1>这一生，<br />你想叫什么？</h1>
          <p>这是会出现在故事、回忆和人生结局里的名字。</p>
          <label className="big-name-input"><input autoFocus maxLength={24} value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="输入你的名字" /><span>{nameInput.length}/24</span></label>
          <button className="big-play-button" onClick={() => setScreen("identity")}><span>{nameInput.trim() ? `你好，${nameInput.trim()}` : "让命运替我取名"}</span><b>→</b></button>
        </section>
      </main>
    );
  }

  if (screen === "identity") {
    return (
      <main className="setup-shell identity-step">
        <nav className="setup-nav"><button onClick={() => setScreen("name")}>← 上一步</button><div><span className="active" /><span className="active" /></div><small>2 / 2</small></nav>
        <section className="identity-builder">
          <header><div><p className="sticker">BUILD YOUR BEGINNING</p><h1>选择你的<br />人生底牌</h1></div><p>先选一个人设作为起点，再亲手微调。所有人都拥有同样的 <b>{STARTING_POINT_BUDGET}</b> 点，没有完美开局。</p></header>
          <div className="identity-columns">
            <section className="choice-card"><div className="section-title"><span>01</span><div><b>出生背景</b><small>影响地点与特有事件</small></div></div><div className="country-grid playful">{(Object.keys(countries) as Country[]).map((key) => <button key={key} className={`country-card ${country === key ? "selected" : ""}`} onClick={() => setCountry(key)}><span>{countries[key].glyph}</span><b>{countries[key].name}</b><small>{countries[key].subtitle}</small></button>)}</div></section>
            <section className="choice-card"><div className="section-title"><span>02</span><div><b>身份人设</b><small>点击后仍可继续微调</small></div></div><div className="persona-grid">{(Object.keys(personas) as PersonaId[]).map((key) => <button key={key} data-color={personas[key].color} className={personaId === key ? "selected" : ""} onClick={() => selectPersona(key)}><span>{personas[key].emoji}</span><b>{personas[key].name}</b><small>{personas[key].tagline}</small></button>)}</div></section>
          </div>
          <section className="choice-card stat-choice"><div className="allocation-heading"><div className="section-title"><span>03</span><div><b>调整起点数值</b><small>压力越低，占用点数越多</small></div></div><div className="allocation-status" data-state={startingPointsRemaining === 0 ? "ready" : startingPointsRemaining > 0 ? "remaining" : "over"}><span>{startingPointsRemaining === 0 ? "刚刚好" : startingPointsRemaining > 0 ? "还剩" : "超出"}</span><strong>{Math.abs(startingPointsRemaining)}</strong></div></div><div className="stat-builder">{(Object.keys(statMeta) as StatKey[]).map((key) => <label className={`stat-control ${key === "stress" ? "inverse" : ""}`} key={key}><span><b>{statMeta[key].icon} {statMeta[key].label}</b><strong>{startingStats[key]}</strong></span><input type="range" min="20" max="80" step="5" value={startingStats[key]} onChange={(event) => setStartingStats((current) => ({ ...current, [key]: Number(event.target.value) }))} /><small>{statMeta[key].description}</small></label>)}</div><div className="starting-portrait"><span>你的起点画像</span><strong>{startingPortrait.title}</strong><p>{startingPortrait.description}</p><div>{startingPortrait.signals.map((signal) => <small key={signal}>{signal}</small>)}</div></div></section>
          <button className="big-play-button launch-life" onClick={startLife} disabled={startingPointsRemaining !== 0}><span>{startingPointsRemaining === 0 ? `开始 ${nameInput.trim() || "这位陌生人"} 的一生` : startingPointsRemaining > 0 ? `还需分配 ${startingPointsRemaining} 点` : `请减少 ${Math.abs(startingPointsRemaining)} 点`}</span><b>▶</b></button>
        </section>
      </main>
    );
  }

  if (screen === "game" && directorLoading && plannedEvents.length === 0) {
    return (
      <main className="director-loading-shell">
        <div className="director-loading-card">
          <div className="thinking-orbit"><span /><span /><span /></div>
          <p className="sticker">AI LIFE DIRECTOR</p>
          <h1>命运正在写下<br />你看不见的后两步</h1>
          <p>当前事件会先公开，未来事件保持隐藏；如果两步后是大事件，CG 会立即在后台开始制作。</p>
        </div>
      </main>
    );
  }

  if (screen === "end") {
    const years = history.at(-1)?.age || 82;
    const brightest = [...history].sort((a, b) => b.narrative.length - a.narrative.length)[0];
    return <main className="end-shell"><div className="end-card"><p className="sticker">A LIFE, REMEMBERED</p><h1>{profile.name}</h1><p className="lifespan">{profile.birthYear} — {profile.birthYear + years}</p><div className="epitaph">“{profile.name}曾经害怕许多尚未发生的事，也在真正到来时，比自己想象得更勇敢。人生没有成为计划中的样子，却留下了只属于自己的纹路。”</div><div className="life-summary"><div><small>走过</small><strong>{years} 年</strong></div><div><small>重要选择</small><strong>{history.length} 次</strong></div><div><small>最后心境</small><strong>{stats.happiness >= 65 ? "安宁" : stats.happiness >= 45 ? "复杂" : "仍有牵挂"}</strong></div></div>{brightest && <p className="remembered"><span>最清晰的记忆</span>{brightest.age}岁，{brightest.title}。{brightest.narrative}</p>}<div className="mini-timeline">{history.map((item) => <div key={`${item.age}-${item.title}`}><b>{item.age}</b><span>{item.title}</span></div>)}</div><button className="big-play-button" onClick={restart}><span>再活一次</span><b>↻</b></button></div></main>;
  }

  return (
    <main className={`game-shell scene-${currentEvent.scene}`}>
      <header className="game-header"><button className="wordmark" onClick={() => setScreen("splash")}><span className="brand-mark">一</span><b>这一生</b></button><div className="life-progress"><span style={{ width: `${Math.max(4, (currentEvent.age / 82) * 100)}%` }} /></div><div className="director-chip" data-loading={directorLoading}>{directorLoading ? "正在续写未来" : plannedEvents.length >= 3 ? "已秘密规划后两步" : "AI 实时导演"}</div><div className="save-chip" data-state={saveState}>{saveState === "saving" ? "正在保存" : saveState === "saved" ? "云端已保存" : account?.localPreview ? "本地试玩" : "未连接存档"}</div><div className="age-stamp"><small>{currentEvent.chapter}</small><strong>{currentEvent.age}<i>岁</i></strong></div></header>
      <section className="game-layout">
        <aside className="identity-panel"><div className="avatar-bubble">{personas[profile.personaId].emoji}</div><p className="panel-kicker">你的这一生</p><h2>{profile.name}</h2><p>{profile.birthYear}年生于{profile.place}</p><div className="profile-facts"><span>{profile.persona}</span><span>{profile.family}</span></div><div className="stats">{(Object.keys(statMeta) as StatKey[]).map((key) => <div className="stat" key={key}><div><span>{statMeta[key].icon} {statMeta[key].label}</span><b>{stats[key]}</b></div><i><em style={{ width: `${stats[key]}%` }} /></i></div>)}</div><div className="past"><span>已经走过</span><strong>{history.length} 个转折</strong></div></aside>
        <section className="story-panel">
          <div className={`memory-canvas ${artUrl ? "has-art" : ""} ${cgPlaying ? "cg-playing" : ""}`}>
            {videoUrl ? <video src={videoUrl} controls autoPlay playsInline /> : artUrl ? <img src={artUrl} alt={`${profile.name}${currentEvent.age}岁时的人生场景`} /> : <><div className="scene-stars">✦　·　✦</div><div className="sun" /><div className="horizon" /><div className="figure" /><p>{currentEvent.chapter}</p></>}
            {currentEvent.important && <span className="cg-badge">SPECIAL CG</span>}
          </div>
          <div className="story-content"><p className="chapter-label">第 {String(turnNumber + 1).padStart(2, "0")} 章 · {currentEvent.chapter} · {plannedEvents[0]?.origin === "ai" ? "AI 现场生成" : "备用剧情"}</p><h1>{result ? result.title : currentEvent.title}</h1>{!result && !thinking && <p className="event-copy">{currentEvent.prompt}</p>}
            {thinking && <div className="thinking-card"><div className="thinking-orbit"><span /><span /><span /></div><div><strong>人生导演正在推演</strong><p>读取过去的选择 · 衡量现实条件 · 寻找可能的结果</p></div></div>}
            {result && <div className="result-block"><div className="director-line"><span>{result.live ? "AI 实时推演" : "本地导演模式"}</span><i /></div><p>{result.narrative}</p><div className="effect-row">{(Object.entries(result.effects) as [StatKey, number][]).filter(([, value]) => value !== 0).map(([key, value]) => <span className={value > 0 === statMeta[key].positive ? "good" : "hard"} key={key}>{statMeta[key].label} {value > 0 ? "+" : ""}{value}</span>)}</div>
              <div className="cg-actions"><button className="art-button" onClick={artUrl ? () => setCgPlaying((value) => !value) : createArt} disabled={artLoading}><span>{artLoading ? "正在绘制专属场景…" : artUrl ? cgPlaying ? "暂停动态画面" : "播放动态画面" : mediaCapabilities.image ? "🪄 生成 AI 专属画面" : "🪄 绘制本地专属画面"}</span></button><button className="video-button" onClick={createVideo} disabled={["queued", "in_progress", "completed"].includes(videoStatus)}>{videoStatus === "queued" || videoStatus === "in_progress" ? `${mediaCapabilities.video ? "Sora 制作" : "本地录制"}中 ${Math.round(videoProgress)}%` : videoStatus === "completed" ? "✓ 剧情短片已生成" : videoStatus === "failed" ? "重新尝试生成视频" : mediaCapabilities.video ? "🎬 生成 Sora 视频" : "🎬 生成本地剧情短片"}</button></div>
              {mediaNotice && <p className="media-notice">{mediaNotice}</p>}
              {videoUrl && <a className="download-video" href={videoUrl} download={`${profile.name}-${currentEvent.age}岁-${currentEvent.title}.${videoId ? "mp4" : "webm"}`}>↓ 保存这段剧情短片</a>}
              <button className="continue-button" onClick={continueLife}>继续向前 <span>→</span></button></div>}
            {!result && !thinking && <div className="choices"><p>你会怎么选择？</p>{currentEvent.choices.map((choice, index) => <button key={choice.text} onClick={() => choose(choice)}><span>{String.fromCharCode(65 + index)}</span><strong>{choice.text}</strong><i>→</i></button>)}</div>}
          </div>
        </section>
      </section>
    </main>
  );
}
