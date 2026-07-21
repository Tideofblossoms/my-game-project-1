import { NextResponse } from "next/server";

const statNames = ["health", "happiness", "ability", "money", "relations", "stress"] as const;
const scenes = ["childhood", "school", "departure", "station", "city", "home", "crossroads", "late-life", "sunset"] as const;

type PlanRequest = {
  locale?: "zh" | "en" | "es";
  country?: string;
  profile?: Record<string, unknown>;
  stats?: Record<string, number>;
  history?: Array<{ age?: number; title?: string; choice?: string; narrative?: string }>;
  existingFuture?: Array<{ age?: number; title?: string; prompt?: string }>;
  count?: number;
  turnNumber?: number;
};

function extractOutputText(payload: unknown) {
  const response = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function safeEffects(value: unknown) {
  const effects = (value || {}) as Record<string, number>;
  return Object.fromEntries(statNames.map((key) => [key, Math.max(-14, Math.min(14, Number(effects[key] || 0)))]));
}

function chapterForAge(age: number, locale: PlanRequest["locale"] = "zh") {
  const chapters = locale === "en"
    ? ["Early years", "Childhood", "Youth", "Leaving home", "Young adult", "Midlife", "New direction", "Later life", "Twilight"]
    : locale === "es"
      ? ["Primeros años", "Infancia", "Juventud", "Partida", "Adultez joven", "Mitad de vida", "Nuevo rumbo", "Madurez", "Atardecer"]
      : ["幼年", "童年", "青春", "初离家", "青年", "中途", "转身", "晚年", "余晖"];
  if (age < 6) return chapters[0];
  if (age < 13) return chapters[1];
  if (age < 19) return chapters[2];
  if (age < 26) return chapters[3];
  if (age < 36) return chapters[4];
  if (age < 51) return chapters[5];
  if (age < 66) return chapters[6];
  if (age < 78) return chapters[7];
  return chapters[8];
}

type FallbackScenario = {
  minAge: number;
  maxAge: number;
  title: string;
  prompt: string;
  scene: typeof scenes[number];
  choices: Array<[string, string, Record<string, number>, string]>;
};

const concreteFallbackScenarios: FallbackScenario[] = [
  {
    minAge: 3, maxAge: 9, title: "弄丢的班级借阅书", scene: "school",
    prompt: "周五放学前，老师要收回班级借阅书。你把书落在公交车上了，家里这个月也没有多余的钱立刻赔一本。老师正在逐个点名。",
    choices: [
      ["马上告诉老师，请求周末一起寻找", "诚实说明并争取补救时间", { ability: 4, stress: 3, relations: 3 }, "你说得磕磕绊绊，老师没有当众责备，只让你周一带来寻找结果。那个周末，你第一次认真记住了失物招领处的位置。"],
      ["先向同学借一本同样的书交上去", "先解决眼前检查", { stress: -2, relations: -2, ability: 1 }, "点名顺利过去了，但借来的书还要还。一个小问题被推迟成了两个，你开始明白隐瞒也会占用时间。"],
      ["用自己的零花钱买一本二手书", "独自承担损失", { money: -4, ability: 2, stress: 1 }, "你跑了两家旧书店才找到同一版。没有人知道这段插曲，但接下来几个星期，你放学后少买了很多想吃的东西。"],
    ],
  },
  {
    minAge: 7, maxAge: 14, title: "被改过的考试分数", scene: "school",
    prompt: "同桌把卷面上的分数偷偷改高了，请你在老师核对时帮忙作证。你知道对方最近因为成绩差一直被家里责骂。",
    choices: [
      ["拒绝作证，并劝同桌自己说明", "不参与隐瞒但陪对方面对", { relations: 4, ability: 3, stress: 3 }, "同桌起初不肯理你，最后还是在放学后留下来找老师。处罚没有消失，但事情没有继续变大。"],
      ["先帮忙瞒过这次，再一起补习", "用短期隐瞒换补救机会", { relations: 5, stress: 7, ability: 2 }, "核对当天没有露馅。之后每一次老师提到诚信，你们都会短暂地避开彼此的目光。"],
      ["私下告诉老师，请老师别通知全班", "寻求成年人介入", { relations: -3, ability: 4, stress: 2 }, "老师单独处理了这件事。同桌后来知道是你说的，你们的关系冷了一阵，但那张被改过的卷子没有再出现第二次。"],
    ],
  },
  {
    minAge: 13, maxAge: 20, title: "志愿表最后一晚", scene: "home",
    prompt: "志愿表明早截止。你喜欢的专业就业面窄，家人建议的专业更稳妥；两所学校的学费和离家距离也差了一大截。",
    choices: [
      ["填喜欢的专业，同时申请助学与兼职", "为兴趣承担现实成本", { ability: 7, money: -5, stress: 7, happiness: 6 }, "确认键按下后，你没有立刻轻松。接下来几个月，你一边准备入学，一边第一次认真计算每一笔生活费。"],
      ["选更稳妥的专业，把兴趣留作辅修", "优先就业并保留兴趣", { money: 4, ability: 4, happiness: -1, stress: -1 }, "家人松了一口气。你也得到了更清晰的路径，只是课程表之外，多出了一份必须自己守住的兴趣。"],
      ["申请间隔一年，先去相关岗位实习", "用一年验证选择", { money: 2, ability: 5, stress: 5, relations: -2 }, "同学陆续收到录取通知时，你开始每天通勤。真实工作让一些想象破灭，也让另一些愿望变得更具体。"],
    ],
  },
  {
    minAge: 18, maxAge: 29, title: "押金与第一份合同", scene: "city",
    prompt: "新工作下周报到，但合租房今天就要付两个月押金。中介催你签一份条款含糊的合同，另一间正规房源更远，也会让你每天多通勤一小时。",
    choices: [
      ["拒签含糊合同，选择更远的房子", "用通勤换居住确定性", { money: -5, stress: 2, health: -2, ability: 2 }, "你拖着行李换了两趟车。通勤很累，但第一次独自锁上门时，你清楚自己为这份安心付了什么。"],
      ["要求补充条款后再付款", "花时间谈清权责", { ability: 6, stress: 5, money: -2 }, "中介几次催促，你仍把问题一条条写进合同。房子不完美，但这次签名至少不是在慌乱里完成的。"],
      ["先住短租一周，继续找房", "花更多钱换决定时间", { money: -8, stress: 4, happiness: 1 }, "你在临时住处拆了又装行李。额外支出令人心疼，却让你避开了一个可能困住自己一年的决定。"],
    ],
  },
  {
    minAge: 23, maxAge: 39, title: "加班名单上的周末", scene: "city",
    prompt: "项目负责人临时要求全组周末到岗，而你已经答应参加家人的重要聚会。缺席不会立刻丢工作，但会影响下次晋升评价。",
    choices: [
      ["去公司，并提前向家人说明", "优先眼前职业机会", { money: 5, ability: 5, relations: -6, stress: 6 }, "会议比预想中更短，聚会却已经结束。你得到负责人一句肯定，也在家庭群里看见许多没有自己的合照。"],
      ["按原计划参加聚会，周日晚上补进度", "同时承担两边责任", { relations: 5, health: -4, stress: 8, ability: 3 }, "你没有缺席合照，也没能真正放松。周日晚上的屏幕亮到很晚，星期一仍然准时到来。"],
      ["和同事换班，承诺下次替对方承担", "用协商守住安排", { relations: 3, ability: 4, stress: 3 }, "同事答应了交换。你保住了这个周末，也欠下一个明确的人情；它比模糊的愧疚更容易偿还。"],
    ],
  },
  {
    minAge: 27, maxAge: 46, title: "续租通知提前到了", scene: "home",
    prompt: "房东通知下季度涨租。搬走能省钱，但要离开熟悉的邻里和通勤路线；留下则意味着每月削减一笔固定开支。",
    choices: [
      ["和房东谈长期续租，换取较小涨幅", "用稳定承诺争取价格", { ability: 4, money: -3, stress: 2 }, "你准备了附近租金和自己的付款记录。房东没有完全让步，但涨幅降到了一份可以计算的程度。"],
      ["搬到更便宜的片区", "用环境变化降低支出", { money: 7, relations: -3, stress: 6, ability: 2 }, "纸箱堆满新房时，你才发现熟悉也是一种资产。支出下降了，生活路线却要从头建立。"],
      ["留下，并暂停旅行与娱乐预算", "保住日常秩序", { money: -5, happiness: -4, stress: -1 }, "钥匙仍能打开同一扇门。你省下了搬家的混乱，也开始更频繁地拒绝朋友临时发来的邀请。"],
    ],
  },
  {
    minAge: 34, maxAge: 55, title: "父母的复查预约", scene: "home",
    prompt: "父母把复查时间说成了“普通检查”，你后来发现需要有人陪同。那天正好是你负责的重要汇报，临时请假会让同事接手。",
    choices: [
      ["请假陪同，把汇报完整交接给同事", "把家人的健康放在当天优先级", { relations: 9, ability: 2, stress: 6, money: -2 }, "候诊时间很长，检查结果还要继续观察。你错过了汇报现场，却第一次听清父母之前省略掉的细节。"],
      ["安排可靠的亲友陪同，自己会后赶去", "协调资源兼顾两边", { relations: 5, ability: 5, stress: 7, money: -2 }, "你在会议结束后匆忙赶到医院。没有一边被完全放下，也没有一边真正轻松。"],
      ["完成汇报，晚上再详细了解结果", "优先履行工作责任", { ability: 6, money: 3, relations: -5, stress: 4 }, "汇报顺利结束。晚上的电话里，父母仍说没事，你却能听见几次不自然的停顿。"],
    ],
  },
  {
    minAge: 42, maxAge: 65, title: "部门合并后的岗位", scene: "crossroads",
    prompt: "部门合并后，你可以留在原公司做薪资不变但权限更少的岗位，也可以拿补偿离开。家里的固定支出让空窗期不能太长。",
    choices: [
      ["先留下半年，同时更新技能和简历", "保住现金流并准备转身", { money: 5, ability: 6, stress: 6, happiness: -2 }, "新的工位离核心会议更远。你白天完成交接，晚上整理作品，半年第一次有了清楚的倒计时。"],
      ["拿补偿离开，集中寻找新方向", "用储蓄换完整转型时间", { money: -5, ability: 7, stress: 7, happiness: 4 }, "离职后的第一个星期安静得不真实。补偿金给了你窗口，也让每一次投递都带着明确的时间成本。"],
      ["争取转到仍在扩张的团队", "在公司内部重新证明价值", { ability: 5, relations: 3, stress: 8 }, "你约了几位陌生负责人谈话。没有人保证位置，但你不再只是等待组织替你安排下一步。"],
    ],
  },
  {
    minAge: 55, maxAge: 72, title: "老房子的维修清单", scene: "home",
    prompt: "住了多年的房子开始漏水，维修费不低。子女或亲友建议卖掉换小房，你却很难把那些熟悉的房间只看成一笔资产。",
    choices: [
      ["分阶段维修，继续住下去", "花钱保留熟悉生活", { money: -9, happiness: 5, stress: 3 }, "施工声持续了几周，墙面留下了新旧颜色的分界。房子没有回到从前，却还能继续承接日常。"],
      ["卖掉旧房，搬到更好打理的住处", "用告别换取轻松和安全", { money: 7, health: 4, happiness: -4, stress: 5 }, "签字后，你花了很久决定哪些东西带走。新家更方便，夜里醒来时却还会下意识寻找旧窗户的位置。"],
      ["先做必要维修，一年后再决定", "控制支出并延后告别", { money: -4, stress: 1, ability: 2 }, "最急的漏水止住了。你得到一年时间，也知道这不是取消决定，只是让它来得更从容。"],
    ],
  },
  {
    minAge: 66, maxAge: 82, title: "每周三的接送安排", scene: "late-life",
    prompt: "家人希望你每周固定帮忙接送孩子或照看长辈，这会让他们轻松很多，但也会占掉你原本用于锻炼、见朋友和休息的时间。",
    choices: [
      ["答应固定一天，但明确不能临时加码", "提供帮助并设定边界", { relations: 7, health: -1, stress: 2 }, "周三变得忙碌而有规律。家人逐渐学会提前安排，你也保住了其余几天的生活。"],
      ["只在紧急时帮忙，不承担固定安排", "优先保留自己的节奏", { relations: -2, health: 4, stress: -2, happiness: 3 }, "家人需要重新寻找方案，最初有些不习惯。你仍会在真正需要时出现，但不再默认自己的时间可以随时被占用。"],
      ["先试行一个月，再一起复盘", "用短期尝试检验负担", { relations: 5, stress: 3, ability: 2 }, "一个月里，有几次温暖也有几次疲惫。月底你们终于能依据真实日程，而不是内疚或想象来谈下一步。"],
    ],
  },
];

function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function fallbackPlan(body: PlanRequest, count: number, startingAge: number) {
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "zh";
  const usedTitles = new Set([...(body.history || []), ...(body.existingFuture || [])].map((item) => item.title).filter(Boolean));
  const signature = JSON.stringify({ profile: body.profile, stats: body.stats, turn: body.turnNumber });
  return Array.from({ length: count }, (_, index) => {
    const age = Math.min(82, startingAge + 1 + index * 2);
    const ageMatches = concreteFallbackScenarios.filter((scenario) => age >= scenario.minAge && age <= scenario.maxAge && !usedTitles.has(scenario.title));
    const candidates = ageMatches.length ? ageMatches : concreteFallbackScenarios.filter((scenario) => !usedTitles.has(scenario.title));
    const scenario = candidates[(hashText(signature) + Number(body.turnNumber || 0) * 7 + index * 11) % Math.max(1, candidates.length)] || concreteFallbackScenarios[index % concreteFallbackScenarios.length];
    usedTitles.add(scenario.title);
    const important = ((Number(body.turnNumber || 0) + Number(body.existingFuture?.length || 0) + index + 1) % 3) === 0;
    return {
      id: `fallback-${Date.now()}-${index}`,
      age,
      chapter: chapterForAge(age, locale),
      title: scenario.title,
      scene: scenario.scene,
      prompt: scenario.prompt,
      choices: scenario.choices.map((choice) => ({ text: choice[0], intent: choice[1], effects: safeEffects(choice[2]), fallback: choice[3] })),
      important,
      origin: "fallback" as const,
    };
  });
}

export async function POST(request: Request) {
  let body: PlanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const lastHistoryAge = Number(body.history?.at(-1)?.age || 2);
  const lastFutureAge = Number(body.existingFuture?.at(-1)?.age || lastHistoryAge);
  const startingAge = Math.max(lastHistoryAge, lastFutureAge);
  const count = Math.max(1, Math.min(3, 82 - startingAge, Number(body.count || 3)));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ events: fallbackPlan(body, count, startingAge), live: false });

  const recentHistory = (body.history || []).slice(-8).map((item) => ({ age: item.age, event: item.title, choice: item.choice, result: item.narrative }));
  const turnNumber = Number(body.turnNumber || 0);
  const existingCount = Number(body.existingFuture?.length || 0);
  const importanceSchedule = Array.from({ length: count }, (_, index) => ((turnNumber + existingCount + index + 1) % 3) === 0);
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "zh";
  const languageRule = locale === "en" ? "Write all player-facing fields in natural English." : locale === "es" ? "Escribe todos los campos visibles para el jugador en español natural." : "所有面向玩家的字段使用简体中文。";
  const input = `角色：你是 AI 人生游戏《这一生》的隐藏导演。

目标：为同一个角色生成接下来 ${count} 个不会向玩家公开的连续人生事件。玩家只能选择如何应对，不能选择下一件事发生什么。

角色状态：${JSON.stringify({ country: body.country, profile: body.profile, stats: body.stats })}
最近经历：${JSON.stringify(recentHistory)}
已经锁定、不得重复或推翻的未来事件：${JSON.stringify(body.existingFuture || [])}
新事件的重要性顺序：${JSON.stringify(importanceSchedule)}

成功标准：
- 年龄从 ${startingAge} 岁以后严格递增，通常间隔 1 至 3 年；让人生推进得细致、事件密集，最后不得超过 82 岁。
- 每个事件必须是 AI 根据角色的年龄、居住地、家庭情况、强弱属性和最近选择创造的具体生活情境，不是抽象问题，也不让玩家决定事件是否发生。
- prompt 必须写清楚“谁、在什么场合、哪件事已经发生、眼前有什么期限或现实限制”。至少包含两项可感知的生活细节，例如具体金额或时间、房租账单、通勤、排班、考试、合同、家务、照护、复查、邻里或家庭安排。
- 禁止使用“一个意外的邀请”“关系出现变化”“现实条件改变”“真正想要的生活”“弄清真正的问题”这类可套在任何人身上的空泛表述。不要讨论成功、自由、责任、稳定等抽象概念本身，要把它们落到当天必须处理的一件事上。
- 三个选项只能决定角色如何回应，且都要有现实收益与代价。
- 三个选项必须是能立即执行的具体行动，不能复用“主动面对 / 先观察 / 拒绝变化”这种通用三选一结构。
- 已提前两步规划的事件必须保持因果开放：可以锁定核心主题、地点与来临方式，但不能假定玩家尚未作出的选择结果。
- importanceSchedule 为 true 的事件是大事件，画面应突出其情绪与环境变化。
- 当前批次的事件标题、处境、人物关系和三组选项不得彼此重复，也不得与最近经历或已锁定未来事件近义重复。普通事件也要具体、有生活质感；避免连续出现相同的工作、疾病、搬家或关系主题。
- ${languageRule} Keep prompts and outcomes concise but emotionally specific.
- 避免文化刻板印象、极端灾难堆砌和医疗法律财务建议。`;

  const eventSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      age: { type: "integer", minimum: 3, maximum: 82 },
      chapter: { type: "string" },
      title: { type: "string" },
      scene: { type: "string", enum: [...scenes] },
      prompt: { type: "string" },
      choices: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false,
          properties: {
            text: { type: "string" }, intent: { type: "string" }, fallback: { type: "string" },
            effects: {
              type: "object", additionalProperties: false,
              properties: Object.fromEntries(statNames.map((key) => [key, { type: "number", minimum: -14, maximum: 14 }])),
              required: [...statNames],
            },
          },
          required: ["text", "intent", "fallback", "effects"],
        },
      },
    },
    required: ["age", "chapter", "title", "scene", "prompt", "choices"],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-sol",
        reasoning: { effort: "medium" },
        input,
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema", name: "life_event_plan", strict: true,
            schema: {
              type: "object", additionalProperties: false,
              properties: { events: { type: "array", minItems: count, maxItems: count, items: eventSchema } },
              required: ["events"],
            },
          },
        },
      }),
    });
    if (!response.ok) {
      const errorPayload = await response.text();
      console.warn("AI event planning fell back", response.status, errorPayload.slice(0, 800));
      return NextResponse.json({ events: fallbackPlan(body, count, startingAge), live: false });
    }
    const payload = await response.json();
    const generated = JSON.parse(extractOutputText(payload)) as { events?: Array<Record<string, unknown>> };
    let previousAge = startingAge;
    const events = (generated.events || []).slice(0, count).map((event, index) => {
      const age = Math.min(82, Math.max(previousAge + 1, Math.round(Number(event.age || previousAge + 3))));
      previousAge = age;
      const choices = Array.isArray(event.choices) ? event.choices.slice(0, 3).map((choice) => {
        const item = choice as Record<string, unknown>;
        return { text: String(item.text || "面对这次变化"), intent: String(item.intent || "作出回应"), fallback: String(item.fallback || "这个决定悄悄改变了接下来的人生。"), effects: safeEffects(item.effects) };
      }) : [];
      return {
        id: `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        age,
        chapter: String(event.chapter || chapterForAge(age, locale)),
        title: String(event.title || "人生的新一幕"),
        scene: scenes.includes(event.scene as typeof scenes[number]) ? event.scene : "crossroads",
        prompt: String(event.prompt || "生活带来了一件无法回避的新事情。"),
        choices,
        important: importanceSchedule[index],
        origin: "ai" as const,
      };
    });
    if (events.length !== count || events.some((event) => event.choices.length !== 3)) throw new Error("事件计划不完整");
    return NextResponse.json({ events, live: true });
  } catch (error) {
    console.warn("AI event planning failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ events: fallbackPlan(body, count, startingAge), live: false });
  } finally {
    clearTimeout(timeout);
  }
}
