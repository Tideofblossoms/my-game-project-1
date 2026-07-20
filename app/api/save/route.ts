import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { getChatGPTUser } from "../../chatgpt-auth";

const LOCAL_PLAYER_EMAIL = "local-player@one-life.preview";
const MAX_SAVE_BYTES = 240_000;

async function saveIdentity() {
  const user = await getChatGPTUser();
  if (user) return { email: user.email, displayName: user.displayName };

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const localPreview = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return localPreview ? { email: LOCAL_PLAYER_EMAIL, displayName: "本地试玩玩家" } : null;
}

async function ensureSaveTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS life_saves (
    user_email TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    save_data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function GET() {
  const identity = await saveIdentity();
  if (!identity) return Response.json({ error: "请先登录后读取云存档" }, { status: 401 });
  if (!env.DB) return Response.json({ error: "存档数据库暂不可用" }, { status: 503 });

  await ensureSaveTable();
  const row = await env.DB.prepare("SELECT save_data, updated_at FROM life_saves WHERE user_email = ?")
    .bind(identity.email)
    .first<{ save_data: string; updated_at: string }>();
  if (!row) return Response.json({ save: null });

  try {
    return Response.json({ save: JSON.parse(row.save_data), updatedAt: row.updated_at });
  } catch {
    return Response.json({ save: null });
  }
}

export async function PUT(request: Request) {
  const identity = await saveIdentity();
  if (!identity) return Response.json({ error: "请先登录后保存进度" }, { status: 401 });
  if (!env.DB) return Response.json({ error: "存档数据库暂不可用" }, { status: 503 });

  const save = await request.json();
  const serialized = JSON.stringify(save);
  if (!save || save.version !== 1 || serialized.length > MAX_SAVE_BYTES) {
    return Response.json({ error: "存档格式不正确或体积过大" }, { status: 400 });
  }

  await ensureSaveTable();
  await env.DB.prepare(`INSERT INTO life_saves (user_email, display_name, save_data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_email) DO UPDATE SET
      display_name = excluded.display_name,
      save_data = excluded.save_data,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(identity.email, identity.displayName, serialized)
    .run();

  return Response.json({ saved: true });
}
