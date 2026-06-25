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
  /** License Key 原文 */
  key: string;
  /** 是否已验证通过 */
  valid: boolean;
  /** 过期时间（ISO 日期字符串） */
  expiresAt: string | null;
  /** 授权的功能列表 */
  features: ProFeature[];
  /** 授权最大并行 tabs */
  maxTabs: number;
  /** 验证方式: offline / online */
  method: "offline" | "online" | "none";
}

const LICENSE_PATTERN = /^mcpba-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{8,12}$/;

// 默认密钥 — 发布时替换成你自己的
const HMAC_SECRET = process.env.MCP_PRO_SECRET || "mcp-browser-agent-pro-secret-2026";

// ==================== 公共 API ====================

/** 从配置文件或环境变量读取 License Key */
export function getLicenseKey(): string | null {
  // 1. 环境变量
  if (process.env.MCP_PRO_LICENSE) return process.env.MCP_PRO_LICENSE;
  // 2. 配置文件
  const configPath = process.env.MCP_BROWSER_CONFIG
    || path.resolve(process.cwd(), ".mcp-browser.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.licenseKey) return config.licenseKey;
  } catch { /* 忽略 */ }
  return null;
}

/** 验证 License Key，返回 LicenseInfo */
export function validateLicense(key: string | null): LicenseInfo {
  if (!key || !LICENSE_PATTERN.test(key)) {
    return {
      key: key || "",
      valid: false,
      expiresAt: null,
      features: [],
      maxTabs: 1,
      method: "none",
    };
  }

  // 离线验证 — HMAC 签名
  const parts = key.split("-");
  const payload = parts.slice(0, -1).join("-"); // mcpba-xxxx-xxxx-xxxx
  const signature = parts[parts.length - 1];

  const expected = createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, signature.length);

  const valid = signature.length === expected.length
    && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    return {
      key,
      valid: false,
      expiresAt: null,
      features: [],
      maxTabs: 1,
      method: "offline",
    };
  }

  // 离线校验通过 — 全部功能开放
  return {
    key,
    valid: true,
    expiresAt: null, // 离线模式不校验过期
    features: [...PRO_FEATURES],
    maxTabs: 10,
    method: "offline",
  };
}

/** 检查某个 Pro 功能是否可用 */
export function canUseFeature(
  license: LicenseInfo,
  feature: ProFeature
): boolean {
  return license.valid && license.features.includes(feature);
}

/** 获取当前 License 状态摘要 */
export function getLicenseStatus(): {
  tier: "free" | "pro";
  features: ProFeature[];
  maxTabs: number;
} {
  const key = getLicenseKey();
  const license = validateLicense(key);

  if (!license.valid) {
    return {
      tier: "free",
      features: [],
      maxTabs: 1,
    };
  }

  return {
    tier: "pro",
    features: license.features,
    maxTabs: license.maxTabs,
  };
}
