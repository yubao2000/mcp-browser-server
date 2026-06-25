#!/usr/bin/env node

/**
 * MCP Browser Agent — Lemon Squeezy Webhook 处理器
 *
 * 用于接收 Lemon Squeezy 的支付通知。
 * 建议部署到独立的服务器（如 Railway、Render 的免费计划）。
 *
 * 启动:
 *   node src/pro/webhook.mjs
 *
 * 在 Lemon Squeezy 后台配置 Webhook URL:
 *   Settings → Webhooks → 指向 http://你的服务器:3456/webhook
 */

import http from "http";

const PORT = parseInt(process.env.WEBHOOK_PORT || "3456", 10);

// ==================== Webhook 处理 ====================

/**
 * 处理 Lemon Squeezy 的 Webhook 事件
 *
 * 重要事件:
 *   order_created         → 用户完成支付
 *   subscription_created  → 用户订阅成功
 *   subscription_updated  → 订阅变更
 *   license_key_created   → License Key 自动生成
 */
async function handleWebhook(event: string, data: any): Promise<void> {
  const attrs = data.attributes || {};
  const customerEmail = attrs.user_email || attrs.customer_email || "未知";
  const customerName = attrs.user_name || attrs.customer_name || "未知";
  const variantName = attrs.variant_name || attrs.product_name || "未知";
  const licenseKey = attrs.license_key?.key || "无";

  // 记录到日志
  const log = {
    timestamp: new Date().toISOString(),
    event,
    customer: { name: customerName, email: customerEmail },
    product: variantName,
    licenseKey,
  };

  console.log("[webhook]", JSON.stringify(log, null, 2));

  switch (event) {
    case "order_created":
      // 新订单 — 用户已付款
      console.log(`💰 新订单: ${customerName} (${customerEmail}) 购买了 ${variantName}`);
      break;

    case "subscription_created":
      console.log(`📅 新订阅: ${customerName} (${customerEmail}) 订阅了 ${variantName}`);
      break;

    case "subscription_updated":
      console.log(`🔄 订阅更新: ${customerName} - ${variantName}`);
      break;

    case "license_key_created":
      console.log(`🔑 License Key 已生成: ${licenseKey}`);
      break;

    default:
      console.log(`ℹ️ 未处理事件: ${event}`);
  }
}

// ==================== HTTP 服务器 ====================

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  // Webhook 接收
  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const event = payload.meta?.event_name;
        const data = payload.data;

        if (!event || !data) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "无效的 payload" }));
          return;
        }

        await handleWebhook(event, data);
        res.writeHead(200);
        res.end(JSON.stringify({ received: true }));
      } catch (err: any) {
        console.error("[webhook] 解析失败:", err.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Webhook 测试页面
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px">
      <h1>🤖 MCP Browser Agent — Webhook 服务器</h1>
      <p>状态: 🟢 运行中</p>
      <p>端口: ${PORT}</p>
      <p>Lemon Squeezy Webhook URL: <code>http://你的IP:${PORT}/webhook</code></p>
      <hr/>
      <h3>配置方法:</h3>
      <ol>
        <li>在 <b>Lemon Squeezy → Settings → Webhooks</b> 添加 URL</li>
        <li>URL 填: <code>http://你的服务器IP:${PORT}/webhook</code></li>
        <li>勾选事件: <code>order_created</code>, <code>subscription_created</code>, <code>license_key_created</code></li>
      </ol>
      <hr/>
      <h3>环境变量:</h3>
      <pre>WEBHOOK_PORT=3456</pre>
      <p><a href="/health">健康检查</a></p>
      </body></html>
    `);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║  MCP Browser Agent — Webhook Server      ║
  ║  端口: ${PORT}                              ║
  ║  URL:  http://0.0.0.0:${PORT}/webhook       ║
  ╚═══════════════════════════════════════════╝
  `);
});
