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

function fallbackPlan(body: PlanRequest, count: number, startingAge: number) {
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "zh";
  const themes = locale === "en" ? [
    ["An unexpected invitation", "On an otherwise ordinary afternoon, someone offers you something that deserves serious thought. It may not change your life today, but it could change how you see yourself for years.", "city"],
    ["A new distance", "A meaningful relationship shifts in a subtle way. Nobody has clearly done wrong, yet silence and reaching out will leave very different traces.", "home"],
    ["Life rearranged", "Reality suddenly changes and the old plan cannot continue intact. You must redistribute your time between safety, responsibility, and the life you truly want.", "crossroads"],
  ] as const : locale === "es" ? [
    ["Una invitación inesperada", "En una tarde aparentemente normal, alguien te propone algo que merece pensarse en serio. Quizá no cambie tu vida hoy, pero sí cómo te verás durante años.", "city"],
    ["Una nueva distancia", "Una relación importante cambia de forma sutil. Nadie ha hecho claramente nada malo, pero callar y acercarte dejarán huellas muy distintas.", "home"],
    ["Reordenar la vida", "La realidad cambia de repente y el plan anterior ya no puede seguir intacto. Debes repartir tu tiempo entre seguridad, responsabilidad y la vida que deseas.", "crossroads"],
  ] as const : [
    ["一个意外的邀请", "一个原本普通的下午，有人向你提出了一件需要认真考虑的事。它不会立刻改变人生，却可能改变你接下来几年看待自己的方式。", "city"],
    ["关系里的新距离", "一段重要关系出现了细微变化。没有人明确做错什么，但你意识到继续沉默和主动靠近都会留下不同后果。", "home"],
    ["必须重新安排的生活", "现实条件突然改变，原来的计划无法完整继续。你需要在安全、责任和真正想要的生活之间重新分配时间。", "crossroads"],
  ] as const;
  const choiceCopy = locale === "en" ? [
    ["Face it and understand the real problem", "Choose action and honest conversation", "You do not find a perfect answer, but the problem becomes clear enough to handle. Action brings pressure—and room to move."],
    ["Watch for a while before deciding", "Keep time for judgment", "You do not push events forward yet. Waiting reveals details, while some opportunities quietly change shape."],
    ["Protect the life you have and decline", "Prioritize stability and boundaries", "You preserve a familiar order. Life continues, but another possible road moves a little farther away."],
  ] : locale === "es" ? [
    ["Afrontarlo y entender el problema real", "Elegir la acción y el diálogo", "No encuentras una respuesta perfecta, pero el problema se vuelve manejable. La acción trae presión y también espacio."],
    ["Observar un tiempo antes de decidir", "Reservar tiempo para juzgar", "Todavía no empujas los acontecimientos. La espera aclara detalles mientras algunas oportunidades cambian de forma."],
    ["Proteger tu vida actual y rechazarlo", "Priorizar estabilidad y límites", "Conservas un orden conocido. La vida continúa, pero otro camino posible queda un poco más lejos."],
  ] : [
    ["主动面对，弄清真正的问题", "选择行动与沟通", "你没有立刻得到完美答案，却让事情从模糊变得可以处理。行动带来新的压力，也带来新的空间。"],
    ["先观察一段时间再决定", "为判断保留时间", "你暂时没有推动事情向前。等待让一些细节变得清楚，也让某些机会悄悄改变了形状。"],
    ["保护现有生活，拒绝这次变化", "优先稳定与边界", "你守住了熟悉的秩序。生活没有因此停下，只是另一条可能的道路从此离你更远了一点。"],
  ];
  return Array.from({ length: count }, (_, index) => {
    const age = Math.min(82, startingAge + 2 + index * 3);
    const theme = themes[index % themes.length];
    const important = ((Number(body.turnNumber || 0) + Number(body.existingFuture?.length || 0) + index + 1) % 3) === 0;
    return {
      id: `fallback-${Date.now()}-${index}`,
      age,
      chapter: chapterForAge(age, locale),
      title: theme[0],
      scene: theme[2],
      prompt: theme[1],
      choices: choiceCopy.map((choice, choiceIndex) => ({ text: choice[0], intent: choice[1], effects: choiceIndex === 0 ? { ability: 4, relations: 3, stress: 3 } : choiceIndex === 1 ? { stress: -2, ability: 2 } : { happiness: 2, stress: -3, relations: -2 }, fallback: choice[2] })),
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
- 每个事件必须是 AI 根据角色条件创造的具体生活情境，不是抽象问题，也不让玩家决定事件是否发生。
- 三个选项只能决定角色如何回应，且都要有现实收益与代价。
- 已提前两步规划的事件必须保持因果开放：可以锁定核心主题、地点与来临方式，但不能假定玩家尚未作出的选择结果。
- importanceSchedule 为 true 的事件是大事件，画面应突出其情绪与环境变化。
- 普通事件也要具体、有生活质感；避免连续出现相同的工作、疾病、搬家或关系主题。
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
