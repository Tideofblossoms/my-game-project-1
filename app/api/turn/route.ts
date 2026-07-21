import { NextResponse } from "next/server";

type TurnRequest = {
  locale?: "zh" | "en" | "es";
  country?: string;
  profile?: { name?: string; place?: string; family?: string; trait?: string; birthYear?: number };
  stats?: Record<string, number>;
  history?: Array<{ age: number; title: string; choice: string; narrative: string }>;
  event?: { age?: number; chapter?: string; title?: string; prompt?: string; important?: boolean };
  choice?: { text?: string; intent?: string; effects?: Record<string, number>; fallback?: string };
};

const statNames = ["health", "happiness", "ability", "money", "relations", "stress"] as const;

function safeEffects(effects: Record<string, number> | undefined) {
  return Object.fromEntries(statNames.map((key) => [key, Math.max(-18, Math.min(18, Number(effects?.[key] || 0)))]));
}

function localTurn(body: TurnRequest) {
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "zh";
  return {
    title: body.event?.title || (locale === "en" ? "A turn in life" : locale === "es" ? "Un giro en la vida" : "人生的转折"),
    narrative: body.choice?.fallback || (locale === "en" ? "The decision does not change everything at once, but it quietly changes how you will see life from here." : locale === "es" ? "La decisión no lo cambia todo de inmediato, pero transforma silenciosamente tu forma de mirar la vida." : "这个决定没有立刻改变一切，却悄悄改变了你此后看待生活的方式。"),
    effects: safeEffects(body.choice?.effects),
    illustration_prompt: "",
    live: false,
  };
}

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

export async function POST(request: Request) {
  let body: TurnRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  if (!body.event?.prompt || !body.choice?.text) {
    return NextResponse.json({ error: "缺少人生事件或选择" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(localTurn(body));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  try {
    const recentHistory = (body.history || []).slice(-6).map((item) => ({ age: item.age, event: item.title, choice: item.choice }));
    const locale = body.locale === "en" || body.locale === "es" ? body.locale : "zh";
    const languageRule = locale === "en" ? "Write the title and narrative in natural English." : locale === "es" ? "Escribe el título y la narración en español natural." : "标题和叙事使用简体中文。";
    const input = `你是现实主义人生模拟游戏《这一生》的“人生导演”。你的任务不是奖励玩家，而是根据角色条件推演一个可信、克制、有情感余韵的结果。

角色：${JSON.stringify({ country: body.country, profile: body.profile, stats: body.stats, recentHistory })}
当前事件：${JSON.stringify(body.event)}
玩家选择：${JSON.stringify({ text: body.choice.text, intent: body.choice.intent })}
基础数值影响建议：${JSON.stringify(body.choice.effects)}

规则：
1. ${languageRule} Be specific, emotionally grounded, and concise without preaching.
2. 同时呈现获得与代价，不把任何道路写成唯一正确答案。
3. 尊重国家、地区、家庭和经济条件，避免文化刻板印象。
4. 数值变化必须在-18至18之间；普通事件应更温和。
5. 不提供医疗、法律或财务建议；死亡、疾病和创伤以克制方式描写。
6. 标题不超过10个汉字。插图提示词描述单一电影感场景，不包含画面文字。`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-sol",
        reasoning: { effort: "medium" },
        input,
        text: {
          format: {
            type: "json_schema",
            name: "life_turn",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                narrative: { type: "string" },
                effects: {
                  type: "object",
                  additionalProperties: false,
                  properties: Object.fromEntries(statNames.map((key) => [key, { type: "number", minimum: -18, maximum: 18 }])),
                  required: [...statNames],
                },
                illustration_prompt: { type: "string" },
                important: { type: "boolean" },
              },
              required: ["title", "narrative", "effects", "illustration_prompt", "important"],
            },
          },
        },
      }),
    });

    if (!response.ok) return NextResponse.json(localTurn(body));
    const payload = await response.json();
    const text = extractOutputText(payload);
    const generated = JSON.parse(text) as { title: string; narrative: string; effects: Record<string, number>; illustration_prompt: string };
    return NextResponse.json({ ...generated, effects: safeEffects(generated.effects), live: true });
  } catch {
    return NextResponse.json(localTurn(body));
  } finally {
    clearTimeout(timeout);
  }
}
