import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "尚未连接 OpenAI API", image: null, live: false }, { status: 503 });

  const body = await request.json() as {
    country?: string;
    age?: number;
    scene?: string;
    choice?: string;
    narrative?: string;
    illustrationPrompt?: string;
    locale?: "zh" | "en" | "es";
    profile?: { name?: string; place?: string; trait?: string };
  };

  const prompt = `A finished, gallery-quality storybook game illustration for one exact choice outcome. A fictional ${body.age}-year-old protagonist named ${body.profile?.name || "the protagonist"}, living in ${body.profile?.place || body.country}. The player chose: ${body.choice || "an uncertain path"}. The consequence now visible on screen: ${body.narrative}. Director's visual note: ${body.illustrationPrompt || "Show the decisive emotional beat and the surrounding place with specific lived-in details."} Make the chosen action visibly different from the unchosen alternatives through body language, location, weather, props, who is present, and what the protagonist is doing. Show believable anatomy, expressive hands and posture, layered clothing with folds, meaningful everyday objects, and an environment rich with small narrative details. Premium hand-painted editorial gouache with colored-pencil grain and painterly edges, not flat vector art. Vertical cinematic composition with clear foreground, midground and deep background; atmospheric depth; nuanced natural light; sophisticated lavender, rain blue, warm amber, muted coral and natural green palette. The protagonist is stylized and non-identifiable, with no recognizable real person's face. Family-friendly. No typography, caption, logo, watermark, stick figures, simplistic geometric people, empty gradient landscape, generic city overview, plastic 3D look, or copyrighted characters. Avoid cultural stereotypes.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 42000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: "1024x1536",
        quality: "medium",
      }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      return NextResponse.json({ error: failure?.error?.message || "AI 画面生成失败", image: null, live: false }, { status: response.status });
    }
    const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = payload.data?.[0];
    const image = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url || null;
    return NextResponse.json({ image, live: Boolean(image) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.name === "AbortError" ? "AI 画面生成超时" : "AI 画面服务暂不可用", image: null, live: false }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
