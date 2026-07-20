import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "尚未连接 OpenAI API", image: null, live: false }, { status: 503 });

  const body = await request.json() as {
    country?: string;
    age?: number;
    scene?: string;
    narrative?: string;
    profile?: { name?: string; place?: string; trait?: string };
  };

  const prompt = `A premium whimsical storybook game illustration. A fictional ${body.age}-year-old protagonist named ${body.profile?.name || "the protagonist"}, living in ${body.profile?.place || body.country}, during this life moment: ${body.narrative}. Rounded playful shapes, layered paper-cut depth, lavender, peach, butter yellow, mint and sky blue palette, emotionally specific environment, cinematic light, wide composition. The character is stylized and non-identifiable, with no recognizable real person's face. Family-friendly, no typography, no logo, no watermark, no copyrighted characters, avoid cultural stereotypes.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: "1280x720",
        quality: "low",
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
