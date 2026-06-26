"use client";

const TOOLS = [
  // ====== 导航 (8) ======
  { icon: "📸", name: "截图", desc: "打开网页截图，支持全页截图" },
  { icon: "🔗", name: "获取 URL", desc: "获取当前页面完整 URL" },
  { icon: "📌", name: "获取标题", desc: "获取页面标题" },
  { icon: "📄", name: "获取 HTML", desc: "获取页面或元素的 HTML 源码" },
  { icon: "🔄", name: "刷新", desc: "刷新当前页面（可强制）" },
  { icon: "⬅️", name: "后退", desc: "浏览器后退到上一页" },
  { icon: "➡️", name: "前进", desc: "浏览器前进到下一页" },
  { icon: "📑", name: "PDF 导出", desc: "将当前网页导出为 PDF" },
  // ====== 交互 (9) ======
  { icon: "🖱️", name: "点击", desc: "CSS 选择器或文本匹配点击" },
  { icon: "⌨️", name: "填表", desc: "模拟真人输入，带延迟" },
  { icon: "🗑️", name: "清空", desc: "清空输入框内容" },
  { icon: "🔽", name: "下拉选择", desc: "按 value/label/索引选择" },
  { icon: "⌨️", name: "键盘按键", desc: "Enter/Escape/Tab/组合键" },
  { icon: "🖱️", name: "悬停", desc: "鼠标悬停触发 hover 效果" },
  { icon: "📋", name: "提交表单", desc: "提交页面表单" },
  { icon: "⬇️", name: "滚动", desc: "方向/到顶到底/到元素" },
  { icon: "✋", name: "拖拽", desc: "拖拽元素到目标位置" },
  // ====== 提取 (5) ======
  { icon: "📝", name: "提取文字", desc: "提取整页或元素的可见文本" },
  { icon: "🔧", name: "执行 JS", desc: "在页面中执行自定义代码" },
  { icon: "🖼️", name: "元素截图", desc: "截取指定元素的快照" },
  { icon: "🍪", name: "获取 Cookie", desc: "获取当前页面 Cookie" },
  { icon: "🗑️", name: "删除 Cookie", desc: "清除指定或全部 Cookie" },
  // ====== 标签页 (3) ======
  { icon: "🆕", name: "新建标签页", desc: "打开新的空白标签页" },
  { icon: "🔄", name: "切换标签页", desc: "按索引切换到指定标签页" },
  { icon: "❌", name: "关闭标签页", desc: "关闭当前或指定标签页" },
  // ====== 高级 (9) ======
  { icon: "⏱️", name: "等待", desc: "等待时间或元素出现/消失" },
  { icon: "🕸️", name: "Iframe", desc: "切换到 iframe 内操作" },
  { icon: "📋", name: "控制台日志", desc: "获取页面 console 输出" },
  { icon: "🔄", name: "重置浏览器", desc: "浏览器卡死时重置实例" },
  { icon: "🎯", name: "坐标点击", desc: "在指定坐标点击（过验证码）" },
  { icon: "📐", name: "元素定位", desc: "获取元素位置和大小" },
  { icon: "👁️", name: "视口信息", desc: "获取视口大小和滚动位置" },
  { icon: "🖱️", name: "鼠标移动", desc: "分段模拟真人鼠标轨迹" },
  { icon: "🚪", name: "关闭页面", desc: "关闭当前页面" },
  // ====== Pro (2) ======
  { icon: "⭐", name: "批量自动化", desc: "PRO — 按顺序执行多步操作" },
  { icon: "⭐", name: "数据导出", desc: "PRO — 数据导出 CSV/JSON" },
];

const PLANS = [
  {
    tier: "免费版",
    price: "$0",
    features: [
      "全部 36 个工具",
      "单标签页操作",
      "Cookie 持久化",
      "所有基础交互",
      "GitHub 开源",
    ],
    cta: "GitHub 下载",
    href: "https://github.com/yubao2000/mcp-browser-server",
    highlight: false,
    badge: null,
    originalPrice: null,
  },
  {
    tier: "Pro 月度版",
    price: "限时免费",
    period: "",
    features: [
      "全部免费版功能",
      "批量自动化（CSV 驱动 100 条/次）",
      "多标签页并发（最多 10 个）",
      "Cookie 加密备份",
      "JSON/CSV 格式导出",
      "企业级技术支持",
    ],
    cta: "✨ 立即免费使用",
    href: "https://github.com/yubao2000/mcp-browser-server",
    highlight: true,
    badge: "限时免费",
    originalPrice: "¥69/月",
  },
  {
    tier: "Pro 终身版",
    price: "限时免费",
    period: "",
    features: [
      "全部 Pro 版功能",
      "永久免费升级",
      "优先技术支持",
      "私有化部署咨询",
    ],
    cta: "✨ 立即免费使用",
    href: "https://github.com/yubao2000/mcp-browser-server",
    highlight: false,
    badge: "限时免费",
    originalPrice: "¥499",
  },
];

export default function Home() {
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
            href="https://github.com/yubao2000/mcp-browser-server"
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
            href="https://www.npmjs.com/package/@yubao2000/mcp-browser-agent"
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
          36 个工具，覆盖浏览器自动化全场景
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
            justifyContent: "center",
            gap: 16,
            maxWidth: 880,
            margin: "0 auto",
            padding: "0 16px",
          }}
        >
          {PLANS.slice(0, 3).map((plan) => (
            <div
              key={plan.tier}
              style={{
                width: "33.33%",
                minWidth: 200,
                maxWidth: 280,
                boxSizing: "border-box",
                background: plan.highlight ? "#f0f9ff" : "#f8fafc",
                borderRadius: 16,
                padding: "24px 16px",
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
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: plan.highlight ? 20 : -12,
                    right: -8,
                    background: "#10b981",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    transform: "rotate(3deg)",
                  }}
                >
                  🎉 {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {plan.tier}
              </div>
              <div style={{ marginBottom: 20 }}>
                {plan.originalPrice && (
                  <div style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through", marginBottom: 2 }}>
                    {plan.originalPrice}
                  </div>
                )}
                <span style={{ fontSize: 36, fontWeight: 700, color: plan.badge ? "#10b981" : undefined }}>{plan.price}</span>
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
          <div style={{ marginBottom: 16 }}><span style={{color:"#3b82f6"}}>$</span> npm install -g @yubao2000/mcp-browser-agent</div>
          <div style={{ marginBottom: 16 }}><span style={{color:"#3b82f6"}}>$</span> # 在 Claude Desktop 配置中添加:</div>
          <div style={{ marginBottom: 16, paddingLeft: 16, borderLeft: "2px solid #475569" }}>
            {`{
  "mcpServers": {
    "browser-agent": {
      "command": "mcp-browse-agent",
      "args": []
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
          Pro 版即将发布，留下信息获取早鸟优惠
        </p>
        <a
          href="https://wqt8sbwy.jsjform.com/f/wCRtYl"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#3b82f6",
            color: "white",
            padding: "14px 40px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          填写早鸟登记 📝
        </a>
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
          <a href="https://github.com/yubao2000/mcp-browser-server" style={{ color: "#3b82f6" }}>
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://www.npmjs.com/package/@yubao2000/mcp-browser-agent" style={{ color: "#3b82f6" }}>
            npm
          </a>
        </p>
        <p>Made with ❤️ for the AI Agent ecosystem</p>
      </footer>
    </div>
  );
}
