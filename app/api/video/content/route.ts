export async function GET(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const id = new URL(request.url).searchParams.get("id");
  if (!apiKey) return Response.json({ error: "尚未配置 OPENAI_API_KEY" }, { status: 503 });
  if (!id || !/^video_[a-zA-Z0-9_-]+$/.test(id)) return Response.json({ error: "无效的视频任务" }, { status: 400 });

  const response = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok || !response.body) return Response.json({ error: "视频尚未生成完成" }, { status: response.status });

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "video/mp4",
      "Cache-Control": "private, max-age=300",
    },
  });
}
