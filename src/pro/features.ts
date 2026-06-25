/**
 * MCP Browser Agent — Pro 版核心功能
 *
 * 这些功能需要有效 License Key 才能使用。
 * 功能清单：
 *   - batch()        → 批量自动化（从 JSON/CSV 执行操作序列）
 *   - encryptCookies → Cookie 加密存储
 *   - exportData     → 结构化数据导出（CSV/JSON）
 *   - multiTab       → 多标签页并发限制解锁
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Page } from "puppeteer";
import { getLicenseStatus, ProFeature } from "./license.js";

// ==================== 配置 ====================

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = crypto.createHash("sha256")
  .update(process.env.MCP_PRO_SECRET || "mcp-browser-agent-pro-key")
  .digest();

// ==================== 功能门禁 ====================

function requirePro(feature: ProFeature): void {
  const status = getLicenseStatus();
  if (status.tier !== "pro" || !status.features.includes(feature)) {
    throw new Error(
      `❌ 此功能需要 Pro 版 License。\n` +
      `所需功能: ${feature}\n` +
      `当前状态: ${status.tier}\n` +
      `请购买 Pro 版: https://wqt8sbwy.jsjform.com/f/wCRtYl`
    );
  }
}

// ==================== 1. 批量自动化 ====================

export interface BatchStep {
  action: "goto" | "click" | "fill" | "select" | "extract" | "screenshot" | "wait" | "scroll" | "evaluate" | "export";
  /** 给步骤命名，会在结果中标记 */
  name?: string;
  /** 等待毫秒数（action: wait 时使用） */
  ms?: number;
  /** URL（action: goto 时使用） */
  url?: string;
  /** CSS 选择器（click/fill/select/extract/screenshot 时使用） */
  selector?: string;
  /** 文本内容（click 按文本时使用） */
  text?: string;
  /** 输入值（fill 时使用） */
  value?: string;
  /** JS 代码（evaluate 时使用） */
  code?: string;
  /** 导出格式（export 时使用） */
  format?: "json" | "csv";
}

export interface BatchResult {
  step: number;
  name: string;
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 执行批量自动化操作序列。
 * Pro 版功能：需要 batch-automation 权限。
 */
export async function runBatch(
  page: Page,
  steps: BatchStep[]
): Promise<BatchResult[]> {
  requirePro("batch-automation");

  const results: BatchResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const name = step.name || `步骤 ${i + 1}`;
    const result: BatchResult = {
      step: i + 1,
      name,
      action: step.action,
      success: false,
    };

    try {
      switch (step.action) {
        case "goto": {
          await page.goto(step.url!, { waitUntil: "networkidle2", timeout: 30000 });
          result.data = page.url();
          break;
        }
        case "click": {
          if (step.text) {
            const clicked = await page.evaluate((t: string) => {
              const find = (xpath: string) =>
                document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                  .singleNodeValue as HTMLElement | null;
              const el = find(`//*[text()="${t}"]`) || find(`//*[contains(text(), "${t}")]`);
              if (el) { el.click(); return true; }
              return false;
            }, step.text);
            if (!clicked) throw new Error(`未找到文字: "${step.text}"`);
          } else if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: 10000 });
            await page.click(step.selector);
          }
          break;
        }
        case "fill": {
          if (!step.selector || step.value === undefined) throw new Error("fill 需要 selector 和 value");
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.click(step.selector, { clickCount: 3 });
          await page.keyboard.press("Backspace");
          await page.type(step.selector, step.value, { delay: 20 });
          result.data = step.value.slice(0, 50);
          break;
        }
        case "select": {
          if (!step.selector) throw new Error("select 需要 selector");
          await page.waitForSelector(step.selector, { timeout: 10000 });
          if (step.value !== undefined) {
            await page.select(step.selector, step.value);
          }
          break;
        }
        case "extract": {
          if (step.selector) {
            result.data = await page.$eval(step.selector, (el) => (el as HTMLElement).innerText);
          } else {
            result.data = await page.evaluate(() => document.body.innerText);
          }
          break;
        }
        case "screenshot": {
          const shot = await page.screenshot({ encoding: "base64", type: "png" });
          result.data = `base64:${shot.slice(0, 50)}...`;
          break;
        }
        case "wait": {
          await new Promise((r) => setTimeout(r, step.ms || 2000));
          break;
        }
        case "scroll": {
          await page.evaluate((sel?: string) => {
            if (sel) {
              document.querySelector(sel)?.scrollIntoView({ behavior: "smooth" });
            } else {
              window.scrollBy({ top: 500, behavior: "smooth" });
            }
          }, step.selector);
          break;
        }
        case "evaluate": {
          if (!step.code) throw new Error("evaluate 需要 code");
          result.data = await page.evaluate(step.code);
          break;
        }
        case "export": {
          const text = await page.evaluate(() => document.body.innerText);
          result.data = text.slice(0, 500) + "...";
          break;
        }
      }
      result.success = true;
    } catch (error: any) {
      result.success = false;
      result.error = error.message;
    }

    results.push(result);
  }

  return results;
}

// ==================== 2. Cookie 加密 ====================

/**
 * 加密 Cookie 数据并保存到文件。
 * Pro 版功能：需要 cookie-encryption 权限。
 */
export function saveEncryptedCookies(cookies: any[], filePath: string): void {
  requirePro("cookie-encryption");

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  const json = JSON.stringify(cookies);
  const encrypted = Buffer.concat([cipher.update(json, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = {
    iv: iv.toString("hex"),
    tag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

/**
 * 解密 Cookie 文件并返回。
 * Pro 版功能：需要 cookie-encryption 权限。
 */
export function loadEncryptedCookies(filePath: string): any[] {
  requirePro("cookie-encryption");

  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf-8");
  const payload = JSON.parse(raw);

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "hex")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf-8"));
}

// ==================== 3. 数据导出 ====================

/**
 * 将结构化数据导出为 CSV。
 * Pro 版功能：需要 csv-export 权限。
 */
export function exportToCSV(data: Record<string, any>[], filePath: string): void {
  requirePro("csv-export");

  if (data.length === 0) {
    fs.writeFileSync(filePath, "", "utf-8");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvLines = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      // 转义引号和逗号
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvLines.push(values.join(","));
  }

  fs.writeFileSync(filePath, "﻿" + csvLines.join("\n"), "utf-8"); // BOM for Excel
}

/**
 * 将结构化数据导出为 JSON。
 * Pro 版功能：需要 csv-export 权限。
 */
export function exportToJSON(data: any, filePath: string, pretty = true): void {
  requirePro("csv-export");
  fs.writeFileSync(filePath, JSON.stringify(data, null, pretty ? 2 : undefined), "utf-8");
}

// ==================== 4. 标签页并发限制 ====================

/**
 * 获取当前许可证允许的最大标签页数。
 * 免费版：1 个，Pro 版：10 个
 */
export function getMaxTabs(): number {
  const status = getLicenseStatus();
  return status.tier === "pro" ? 10 : 1;
}

/**
 * 检查当前标签页数是否超出许可限制。
 */
export function checkTabLimit(currentCount: number): void {
  const max = getMaxTabs();
  if (currentCount > max) {
    throw new Error(
      `❌ 标签页数量 ${currentCount} 超出许可限制 ${max}。\n` +
      `免费版仅支持 1 个标签页，Pro 版支持最多 10 个。`
    );
  }
}
