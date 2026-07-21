import { NextResponse } from "next/server";

type TurnRequest = {
  locale?: "en";
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
  return {
    title: body.event?.title || "A turn in life",
    narrative: body.choice?.fallback || "The decision does not change everything at once, but it quietly changes how you will see life from here.",
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
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
  }

  if (!body.event?.prompt || !body.choice?.text) {
    return NextResponse.json({ error: "A life event and choice are required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(localTurn(body));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  try {
    const recentHistory = (body.history || []).slice(-6).map((item) => ({ age: item.age, event: item.title, choice: item.choice }));
    const input = `You are the life director of One Life, a grounded life simulation game. Do not reward the player automatically. Infer a believable, restrained, emotionally resonant outcome from the character's circumstances.

Character: ${JSON.stringify({ country: body.country, profile: body.profile, stats: body.stats, recentHistory })}
Current event: ${JSON.stringify(body.event)}
Player choice: ${JSON.stringify({ text: body.choice.text, intent: body.choice.intent })}
Suggested stat effects: ${JSON.stringify(body.choice.effects)}

Rules:
1. Write the title, narrative, and illustration prompt in natural English only. Be specific and concise without preaching.
2. Show both the benefit and the cost. Never present one path as the only correct answer.
3. Respect the character's country, family, and economic circumstances without cultural stereotypes.
4. Keep each stat change between -18 and 18; ordinary events should be gentler.
5. Do not provide medical, legal, or financial advice. Treat death, illness, and trauma with restraint.
6. Keep the title short. The illustration prompt must describe one cinematic scene with no typography, captions, logos, signs, letters, or written words.`;

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
