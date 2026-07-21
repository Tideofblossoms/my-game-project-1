export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  return Response.json({ image: configured });
}
