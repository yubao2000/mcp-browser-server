#!/usr/bin/env node

/**
 * MCP Browser Agent — License Key 生成器
 *
 * 用法:
 *   node tools/generate-license.mjs <数量>
 *
 * 示例:
 *   node tools/generate-license.mjs         # 生成 1 个
 *   node tools/generate-license.mjs 5       # 生成 5 个
 *
 * 环境变量:
 *   MCP_PRO_SECRET     — 签名密钥（默认值仅用于开发）
 */

import { createHmac } from "crypto";

const SECRET = process.env.MCP_PRO_SECRET || "mcp-browser-agent-pro-secret-2026";
const COUNT = parseInt(process.argv[2] || "1", 10);
const KEY_PREFIX = "mcpba";

function generateKey(): string {
  // 生成随机部分: xxxx-xxxx-xxxx
  const rand = () => Math.random().toString(36).substring(2, 6);
  const payload = `${KEY_PREFIX}-${rand()}-${rand()}-${rand()}`;

  // 计算 HMAC 签名作为校验码
  const signature = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 8);

  return `${payload}-${signature}`;
}

function validateKey(key: string): boolean {
  const parts = key.split("-");
  if (parts.length !== 5 || parts[0] !== KEY_PREFIX) return false;

  const payload = parts.slice(0, 4).join("-");
  const signature = parts[4];
  const expected = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, signature.length);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

import crypto from "crypto";

console.log("=".repeat(50));
console.log("  MCP Browser Agent — License Key Generator");
console.log("=".repeat(50));
console.log(`  密钥: ${SECRET.slice(0, 8)}... (${SECRET.length} chars)`);
console.log(`  数量: ${COUNT}`);
console.log("-".repeat(50));
console.log("");

for (let i = 0; i < COUNT; i++) {
  const key = generateKey();
  console.log(`  ${i + 1}. ${key}`);
}

console.log("");
console.log("-".repeat(50));
console.log("  提示: 设置环境变量 MCP_PRO_SECRET=你的密钥 使用自定义密钥");
console.log("  注意: 生产环境请使用跟源码中 HMAC_SECRET 一致的密钥");
console.log("=".repeat(50));
