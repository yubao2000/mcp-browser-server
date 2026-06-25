/**
 * MCP Browser Agent — Pro 版 License 验证模块
 *
 * 免费版：所有基础功能可用
 * Pro 版：高级功能需有效 licenseKey
 *
 * License 格式：mcpba-xxxx-xxxx-xxxx-xxxxxxxx
 * 离线验证：HMAC-SHA256 签名校验
 * 在线验证：可选向验证服务器查询（需联网）
 */

import fs from "fs";
import path from "path";
import { createHmac, timingSafeEqual } from "crypto";

const PRO_FEATURES = [
  "batch-automation",
  "cookie-encryption",
  "multi-tab-pro",
  "csv-export",
  "screenshot-batch",
  "enterprise-support",
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

interface LicenseInfo {
  key: string;
  valid: boolean;
  expiresAt: string | null;
  features: ProFeature[];
  maxTabs: number;
  method: "offline" | "online" | "none";
}

const LICENSE_PATTERN = /^mcpba-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{8,12}$/;
const HMAC_SECRET = process.env.MCP_PRO_SECRET || "mcp-browser-agent-pro-secret-2026";

/** 离线 HMAC 验证 */
function verifyOffline(key: string): boolean {
  const parts = key.split("-");
  const payload = parts.slice(0, -1).join("-");
  const signature = parts[parts.length - 1];
  const expected = createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, signature.length);
  return signature.length === expected.length
    && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/** 在线验证（Lemon Squeezy API） */
async function verifyOnline(key: string): Promise<{
  valid: boolean;
  expiresAt: string | null;
  customerEmail: string;
  customerName: string;
  variantName: string;
}> {
  const apiKey = process.env.LEMON_API_KEY;
  if (!apiKey) {
    console.error("[license] LEMON_API_KEY 未设置，无法在线验证");
    return { valid: false, expiresAt: null, customerEmail: "", customerName: "", variantName: "" };
  }

  try {
    const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ license_key: key }),
    });

    if (!response.ok) {
      console.error(`[license] Lemon Squeezy API 错误: ${response.status}`);
      return { valid: false, expiresAt: null, customerEmail: "", customerName: "", variantName: "" };
    }

    const result: any = await response.json();
    const attrs = result.data?.attributes || {};

    return {
      valid: attrs.valid === true,
      expiresAt: attrs.license_key?.expires_at || null,
      customerEmail: attrs.meta?.customer_email || "",
      customerName: attrs.meta?.customer_name || "",
      variantName: attrs.meta?.variant_name || "",
    };
  } catch (err: any) {
    console.error(`[license] 在线验证失败: ${err.message}`);
    return { valid: false, expiresAt: null, customerEmail: "", customerName: "", variantName: "" };
  }
}

/** 从配置文件或环境变量读取 License Key */
export function getLicenseKey(): string | null {
  if (process.env.MCP_PRO_LICENSE) return process.env.MCP_PRO_LICENSE;
  const configPath = process.env.MCP_BROWSER_CONFIG
    || path.resolve(process.cwd(), ".mcp-browser.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.licenseKey) return config.licenseKey;
  } catch { /* 忽略 */ }
  return null;
}

/** 静态 License 缓存（避免每次工具调用都重新验证） */
let licenseCache: {
  info: LicenseInfo;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/** 验证 License Key（优先在线，失败后回退到离线） */
export function validateLicense(key: string | null, forceOffline = false): LicenseInfo {
  if (!key || !LICENSE_PATTERN.test(key)) {
    return { key: key || "", valid: false, expiresAt: null, features: [], maxTabs: 1, method: "none" };
  }

  // 优先离线验证（快，不需要网络）
  if (!verifyOffline(key)) {
    return { key, valid: false, expiresAt: null, features: [], maxTabs: 1, method: "offline" };
  }

  // 离线通过 → 返回 Pro
  return {
    key,
    valid: true,
    expiresAt: null,
    features: [...PRO_FEATURES],
    maxTabs: 10,
    method: "offline",
  };
}

/**
 * 异步验证 License（含在线验证）
 * 在 MCP Server 启动时调用
 */
export async function validateLicenseAsync(key: string): Promise<LicenseInfo> {
  if (!key || !LICENSE_PATTERN.test(key)) {
    return { key: key || "", valid: false, expiresAt: null, features: [], maxTabs: 1, method: "none" };
  }

  // 先过离线
  if (!verifyOffline(key)) {
    return { key, valid: false, expiresAt: null, features: [], maxTabs: 1, method: "offline" };
  }

  // 尝试在线验证（仅在有 Lemon Squeezy 配置时）
  if (process.env.LEMON_API_KEY) {
    const online = await verifyOnline(key);
    if (!online.valid) {
      console.error("[license] 在线验证失败，回退到离线模式");
      // 不回退 — 在线失败可能是因为网络问题
      // 允许离线验证通过的 Key 继续使用
    }
    console.error(`[license] 在线验证: ${online.valid ? "✅" : "❌"} 顾客: ${online.customerName} (${online.customerEmail})`);
  }

  return {
    key,
    valid: true,
    expiresAt: null,
    features: [...PRO_FEATURES],
    maxTabs: 10,
    method: process.env.LEMON_API_KEY ? "online" : "offline",
  };
}

export function canUseFeature(license: LicenseInfo, feature: ProFeature): boolean {
  return license.valid && license.features.includes(feature);
}

export function getLicenseStatus(): { tier: "free" | "pro"; features: ProFeature[]; maxTabs: number } {
  const key = getLicenseKey();
  const license = validateLicense(key);

  if (!license.valid) {
    return { tier: "free", features: [], maxTabs: 1 };
  }

  return { tier: "pro", features: license.features, maxTabs: license.maxTabs };
}
