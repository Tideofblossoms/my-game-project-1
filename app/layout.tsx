import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = `${protocol}://${host}`;
  const title = "这一生 · AI 人生模拟器";
  const description = "出生无法选择，但每一次决定都会留下痕迹。一个由 AI 推演结果的现实主义人生模拟器。";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: `${base}/og-storybook.png`, width: 1536, height: 1024, alt: "《这一生》卡通人生旅程封面" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${base}/og-storybook.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
