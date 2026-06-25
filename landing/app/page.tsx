"use client";

import { useState } from "react";

const TOOLS = [
  { icon: "📸", name: "截图", desc: "打开网页截图，支持全页截图" },
  { icon: "🖱️", name: "点击", desc: "CSS 选择器或文本匹配点击" },
  { icon: "⌨️", name: "填表", desc: "模拟真实用户输入" },
  { icon: "📝", name: "提取", desc: "提取页面文字或属性" },
  { icon: "⬇️", name: "滚动", desc: "方向滚动、到顶到底、到元素" },
  { icon: "🔽", name: "下拉选择", desc: "从 select 中选择选项" },
  { icon: "⌨️", name: "键盘按键", desc: "Enter/Escape/Tab/组合键" },
  { icon: "🔄", name: "标签页管理", desc: "新建/切换/关闭标签页" },
  { icon: "🍪", name: "Cookie 持久化", desc: "重启后登录态自动恢复" },
  { icon: "📄", name: "PDF 导出", desc: "将网页导出为 PDF" },
  { icon: "🖼️", name: "元素截图", desc: "截取页面中指定元素的快照" },
  { icon: "🕸️", name: "Iframe 支持", desc: "切换到 iframe 内操作" },
  { icon: "📋", name: "控制台日志", desc: "获取页面 console 输出" },
  { icon: "🔧", name: "自定义 JS", desc: "在页面中执行任意 JavaScript" },
];

const PLANS = [
  {
    tier: "免费版",
    price: "$0",
    features: [
      "全部 30+ 个工具",
      "单标签页操作",
      "Cookie 持久化",
      "所有基础交互",
      "GitHub 开源",
    ],
    cta: "GitHub 下载",
    href: "https://github.com/<你的GitHub>/mcp-browser-server",
    highlight: false,
  },
  {
    tier: "Pro 版",
    price: "$9.9",
    period: "/月",
    features: [
      "全部免费版功能",
      "批量自动化（CSV 驱动 100 条/次）",
      "多标签页并发（最多 10 个）",
      "Cookie 加密备份",
      "JSON/CSV 格式导出",
      "企业级技术支持",
    ],
    cta: "购买 Pro",
    href: "#buy",
    highlight: true,
  },
  {
    tier: "终身版",
    price: "$99",
    period: "一次付费",
    features: [
      "全部 Pro 版功能",
      "永久免费升级",
      "优先技术支持",
      "私有化部署咨询",
    ],
    cta: "购买终身",
    href: "#buy",
    highlight: false,
  },
];

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* ====== Hero ====== */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "white",
          padding: "80px 20px 60px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: "0 0 12px" }}>
          🤖 MCP Browser Agent
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)", opacity: 0.9, maxWidth: 640, margin: "0 auto 32px" }}>
          让 AI Agent (Claude/GPT) 像人一样操作浏览器的 MCP 服务器。
          <br />
          截图、填表、提取数据 —— 全自动化。
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://github.com/<你的GitHub>/mcp-browser-server"
            style={{
              background: "#3b82f6",
              color: "white",
              padding: "14px 32px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            ⭐ GitHub 开源
          </a>
          <a
            href="https://www.npmjs.com/package/mcp-browser-agent"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "14px 32px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            📦 npm 安装
          </a>
        </div>
      </header>

      {/* ====== 功能列表 ====== */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 20px" }}>
        <h2 style={{ fontSize: 28, textAlign: "center", marginBottom: 40 }}>
          30+ 工具，覆盖浏览器自动化全场景
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {TOOLS.map((t) => (
            <div
              key={t.name}
              style={{
                background: "white",
                borderRadius: 12,
                padding: "20px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 定价 ====== */}
      <section style={{ background: "white", padding: "60px 20px" }} id="pricing">
        <h2 style={{ fontSize: 28, textAlign: "center", marginBottom: 40 }}>
          定价
        </h2>
        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              style={{
                background: plan.highlight ? "#f0f9ff" : "#f8fafc",
                borderRadius: 16,
                padding: 32,
                width: 260,
                border: plan.highlight
                  ? "2px solid #3b82f6"
                  : "1px solid #e2e8f0",
                boxShadow: plan.highlight
                  ? "0 4px 20px rgba(59,130,246,0.15)"
                  : "none",
                position: "relative",
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#3b82f6",
                    color: "white",
                    padding: "4px 16px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  推荐
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {plan.tier}
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700 }}>{plan.price}</span>
                {plan.period && (
                  <span style={{ color: "#64748b", fontSize: 14 }}> {plan.period}</span>
                )}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      padding: "6px 0",
                      fontSize: 14,
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    ✅ {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: plan.highlight ? "#3b82f6" : "#e2e8f0",
                  color: plan.highlight ? "white" : "#1e293b",
                  padding: "12px 0",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 如何开始 ====== */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "60px 20px" }}>
        <h2 style={{ fontSize: 28, textAlign: "center", marginBottom: 32 }}>
          一分钟上手
        </h2>
        <div style={{ background: "#1e293b", color: "#e2e8f0", borderRadius: 12, padding: 24, fontSize: 14, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 16 }}><span style={{color:"#3b82f6"}}>$</span> npm install -g mcp-browser-agent</div>
          <div style={{ marginBottom: 16 }}><span style={{color:"#3b82f6"}}>$</span> # 在 Claude Desktop 配置中添加:</div>
          <div style={{ marginBottom: 16, paddingLeft: 16, borderLeft: "2px solid #475569" }}>
            {`{
  "mcpServers": {
    "browser-agent": {
      "command": "npx",
      "args": ["-y", "mcp-browser-agent"]
    }
  }
}`}
          </div>
          <div>
            <span style={{color:"#3b82f6"}}>$</span> # 然后对 Claude 说:
            <span style={{color:"#a5d6a7"}}> "帮我打开百度首页截图"</span>
          </div>
        </div>
      </section>

      {/* ====== 邮件订阅 ====== */}
      <section
        style={{
          background: "#1e293b",
          color: "white",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>关注项目进展</h2>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>
          Pro 版即将发布，留下邮箱获取早鸟优惠
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert(`谢谢 ${email}！Pro 版发布时会通知您 🎉`);
            setEmail("");
          }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "none",
              width: 280,
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "12px 28px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            订阅早鸟通知
          </button>
        </form>
      </section>

      {/* ====== Footer ====== */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px 20px",
          fontSize: 13,
          color: "#94a3b8",
        }}
      >
        <p>
          MIT License ·{" "}
          <a href="https://github.com/<你的GitHub>/mcp-browser-server" style={{ color: "#3b82f6" }}>
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://www.npmjs.com/package/mcp-browser-agent" style={{ color: "#3b82f6" }}>
            npm
          </a>
        </p>
        <p>Made with ❤️ for the AI Agent ecosystem</p>
      </footer>
    </div>
  );
}
