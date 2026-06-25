import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Browser Agent — 让 AI 像人一样操作浏览器",
  description:
    "开源 MCP Server，让 Claude/GPT 等 AI Agent 直接控制浏览器：截图、填表、提取数据、自动化操作。零成本启动，支持 Freemium 变现。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
