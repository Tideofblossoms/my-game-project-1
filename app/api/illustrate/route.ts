import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ image: null, live: false });

  const body = await request.json() as {
    country?: string;
    age?: number;
    scene?: string;
    narrative?: string;
    profile?: { name?: string; place?: string; trait?: string };
  };

  const prompt = `A cinematic editorial illustration for a realistic life simulation game. A ${body.age}-year-old person named ${body.profile?.name || "the protagonist"}, living in ${body.profile?.place || body.country}, during this life moment: ${body.narrative}. Quiet human emotion, grounded contemporary details, painterly natural light, muted earth colors with a small vermilion accent, subtle film grain, wide composition, no typography, no logo, no watermark. Keep the protagonist visually age-appropriate and avoid stereotypes.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "low",
      }),
    });
    if (!response.ok) return NextResponse.json({ image: null, live: false });
    const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = payload.data?.[0];
    const image = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url || null;
    return NextResponse.json({ image, live: Boolean(image) });
  } catch {
    return NextResponse.json({ image: null, live: false });
  } finally {
    clearTimeout(timeout);
  }
}
