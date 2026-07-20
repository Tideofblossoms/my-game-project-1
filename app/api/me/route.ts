import { headers } from "next/headers";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const localPreview = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (user) {
    return Response.json({ authenticated: true, localPreview: false, displayName: user.displayName });
  }

  return Response.json({
    authenticated: false,
    localPreview,
    displayName: localPreview ? "本地试玩玩家" : "访客",
  });
}
