const OPENAI_API_URL = "https://api.openai.com/v1/videos";

function safePrompt(body: Record<string, unknown>) {
  const profile = (body.profile || {}) as Record<string, unknown>;
  const eventPrompt = body.videoPrompt || body.narrative || body.scene || "a meaningful turning point";
  return [
    "Whimsical animated storybook game CG, no real person and no recognizable human face.",
    `A fictional character named ${String(profile.name || "the protagonist")}, age ${String(body.age || "unknown")}, in ${String(body.country || "an imagined place")}.`,
    `Life event opening: ${String(eventPrompt)}.`,
    body.preloaded ? "Show only the event arriving; keep the character's response and the outcome unresolved." : "Show the emotional consequence of the event without explanatory text.",
    "Wide cinematic shot, expressive environment, gentle camera movement, layered lighting, emotionally specific, family-friendly, no text, no copyrighted characters or music.",
  ].join(" ");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "尚未配置 OPENAI_API_KEY" }, { status: 503 });

  const body = await request.json() as Record<string, unknown>;
  const form = new FormData();
  form.set("model", process.env.OPENAI_VIDEO_MODEL || "sora-2");
  form.set("prompt", safePrompt(body));
  form.set("size", "1280x720");
  form.set("seconds", "8");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) return Response.json({ error: data?.error?.message || "视频任务创建失败" }, { status: response.status });
  return Response.json({ id: data.id, status: data.status, progress: data.progress || 0 });
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const id = new URL(request.url).searchParams.get("id");
  if (!apiKey) return Response.json({ error: "尚未配置 OPENAI_API_KEY" }, { status: 503 });
  if (!id || !/^video_[a-zA-Z0-9_-]+$/.test(id)) return Response.json({ error: "无效的视频任务" }, { status: 400 });

  const response = await fetch(`${OPENAI_API_URL}/${id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await response.json();
  if (!response.ok) return Response.json({ error: data?.error?.message || "无法读取视频进度" }, { status: response.status });
  return Response.json({ id: data.id, status: data.status, progress: data.progress || 0 });
}
