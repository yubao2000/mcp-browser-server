#!/usr/bin/env node

/**
 * MCP Browser Agent Server v0.3.0
 * ================================
 * 让 AI Agent（Claude/GPT）像人一样操作浏览器。
 *
 * 工具完整清单 (34个):
 *   导航: screenshot, getUrl, getTitle, getHTML, reload, back, forward, pdf
 *   交互: click, fill, clear, select, pressKey, hover, submit, scroll, drag
 *   提取: extract, evaluate, screenshotElement, getCookies, getBounds, getViewport
 *   标签页: newTab, switchTab, closeTab
 *   Cookie: 自动持久化, deleteCookies
 *   高级: wait, iframe, console, reset, clickAt, mouseMove, close
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ==================== 配置 ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf-8")
);

// 配置优先级: CLI args > 环境变量 > config 文件 > 默认值
const CONFIG_PATHS = [
  process.env.MCP_BROWSER_CONFIG,
  path.resolve(__dirname, "..", ".mcp-browser.json"),
  path.resolve(process.env.HOME || process.env.USERPROFILE || "~", ".mcp-browser.json"),
];

interface Config {
  dataDir: string;
  viewport: { width: number; height: number };
  userAgent: string;
  defaultTimeout: number;
  headless: boolean;
  chromePath?: string;
  cookieFile: string;
  showBrowser?: boolean;
}

function loadConfig(): Config {
  let userConfig: Partial<Config> = {};
  for (const p of CONFIG_PATHS) {
    if (p && fs.existsSync(p)) {
      try {
        userConfig = { ...userConfig, ...JSON.parse(fs.readFileSync(p, "utf-8")) };
        console.error(`[config] 已加载配置: ${p}`);
      } catch { /* 忽略 */ }
    }
  }

  // SHOW_BROWSER=true 可以让浏览器窗口可见，方便调试和人工过验证码
  const showBrowser = process.env.SHOW_BROWSER === "true" || userConfig.showBrowser === true;

  const dataDir = path.resolve(
    userConfig.dataDir || process.env.BROWSER_DATA_DIR || path.resolve(__dirname, "..", ".browser-data")
  );

  return {
    dataDir,
    cookieFile: path.join(dataDir, "cookies.json"),
    viewport: userConfig.viewport || { width: 1280, height: 800 },
    userAgent:
      userConfig.userAgent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    defaultTimeout: userConfig.defaultTimeout || 30000,
    headless: userConfig.headless !== false && !showBrowser,
    chromePath: userConfig.chromePath,
  };
}

const CONFIG = loadConfig();

// 确保数据目录存在
if (!fs.existsSync(CONFIG.dataDir)) {
  fs.mkdirSync(CONFIG.dataDir, { recursive: true });
}

// ==================== Chrome 查找 ====================

function findChromePath(): string | undefined {
  if (CONFIG.chromePath) return CONFIG.chromePath;
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const chromeBin = path.resolve(__dirname, "..", "chrome-bin");
  try {
    const entries = fs.readdirSync(chromeBin);
    const chromeDir = entries.filter((d) => d.startsWith("win")).sort().reverse()[0];
    if (chromeDir) {
      const exe = path.join(chromeBin, chromeDir, "chrome-win64", "chrome.exe");
      if (fs.existsSync(exe)) return exe;
    }
  } catch { /* 忽略 */ }

  const local = process.env.LOCALAPPDATA || "";
  const user = process.env.USERNAME || "";
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    `${local}\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Users\\${user}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

// ==================== Cookie 持久化 ====================

async function saveCookies(p: Page): Promise<void> {
  try {
    const cookies = await p.cookies();
    fs.writeFileSync(CONFIG.cookieFile, JSON.stringify(cookies, null, 2), "utf-8");
  } catch { /* 保存失败不影响主流程 */ }
}

async function loadCookies(p: Page): Promise<void> {
  try {
    if (fs.existsSync(CONFIG.cookieFile)) {
      const raw = fs.readFileSync(CONFIG.cookieFile, "utf-8");
      const cookies = JSON.parse(raw);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await p.setCookie(...cookies);
      }
    }
  } catch { /* 加载失败不影响主流程 */ }
}

// ==================== 全局状态 ====================

let browser: Browser | null = null;
let page: Page | null = null;
let lastResult = "";
/** 用于在 iframe 中操作时记录上下文 */
let currentFrame: Page | ElementHandle<Element> | null = null;
let consoleLogs: string[] = [];

async function getPage(): Promise<Page> {
  if (!browser) {
    const executablePath = findChromePath();
    console.error(`[browser] 启动 Chrome...`);
    browser = await puppeteer.launch({
      headless: CONFIG.headless as any,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
      ],
    });

    // 监听控制台日志
    browser.on("targetcreated", async (target) => {
      const tPage = await target.page();
      if (tPage) {
        tPage.on("console", (msg) => {
          const text = `${msg.type()}: ${msg.text()}`;
          consoleLogs.push(text);
          if (consoleLogs.length > 200) consoleLogs.shift();
        });
      }
    });
  }

  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.setViewport(CONFIG.viewport);
    await page.setUserAgent(CONFIG.userAgent);
    currentFrame = null;
    try { await loadCookies(page); } catch { /* 忽略 */ }
  }

  return page;
}

/** 获取当前有效的 frame（可能是 iframe 或主页面） */
async function getCurrentContext(): Promise<Page> {
  // 如果当前在 iframe 中，获取 iframe 所在的 page 上下文
  const p = await getPage();
  return p;
}

/** 在页面或 iframe 上下文中执行 evaluate */
async function contextEvaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
  const p = await getPage();
  if (currentFrame) {
    const frame = await (currentFrame as any).contentFrame();
    if (frame) return frame.evaluate(fn, ...args);
  }
  return p.evaluate(fn, ...args);
}

/** 在页面或 iframe 上下文中查找元素 */
async function contextWaitAndGet(selector: string, timeout = 10000): Promise<any> {
  const p = await getPage();
  if (currentFrame) {
    const frame = await (currentFrame as any).contentFrame();
    if (frame) {
      await frame.waitForSelector(selector, { timeout });
      return frame.$(selector);
    }
  }
  await p.waitForSelector(selector, { timeout });
  return p.$(selector);
}

async function ensureBrowserClosed(): Promise<void> {
  if (page && !page.isClosed()) {
    try { await saveCookies(page); } catch { /* 忽略 */ }
  }
  if (browser) {
    try { await browser.close(); } catch { /* 忽略 */ }
    browser = null;
    page = null;
    currentFrame = null;
  }
}

// ==================== MCP Server ====================

const server = new Server(
  { name: "mcp-browser-agent", version: PKG.version },
  { capabilities: { tools: {} } }
);

// ====== 工具列表 ======
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ========== 导航类 ==========
    {
      name: "browser_screenshot",
      description: "打开一个网页并截图。如果已打开页面，直接截图当前页。返回 PNG 图片。",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "要访问的 URL（可选，留空则截图当前页）" },
          fullPage: { type: "boolean", description: "截取整个页面（含滚动部分）", default: false },
          waitMs: { type: "number", description: "等待毫秒数，默认 1000", default: 1000 },
        },
      },
    },
    {
      name: "browser_getUrl",
      description: "获取当前页面的完整 URL。",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "browser_getTitle",
      description: "获取当前页面的标题。",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "browser_getHTML",
      description: "获取当前页面的 HTML 源码（或指定元素的 HTML）。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器，留空则获取整个页面的 outerHTML" },
          outer: { type: "boolean", description: "是否包含元素本身的标签，默认 true", default: true },
        },
      },
    },
    {
      name: "browser_reload",
      description: "刷新当前页面。",
      inputSchema: {
        type: "object",
        properties: {
          ignoreCache: { type: "boolean", description: "是否强制刷新（忽略缓存），默认 false", default: false },
        },
      },
    },
    {
      name: "browser_back",
      description: "浏览器后退到上一页。",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "browser_forward",
      description: "浏览器前进到下一页。",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "browser_pdf",
      description: "将当前页面导出为 PDF（返回 Base64 编码的 PDF）。",
      inputSchema: {
        type: "object",
        properties: {
          scale: { type: "number", description: "缩放比例，默认 1", default: 1 },
          landscape: { type: "boolean", description: "横向打印，默认 false", default: false },
          format: { type: "string", description: "纸张大小，默认 'A4'", default: "A4" },
        },
      },
    },

    // ========== 交互类 ==========
    {
      name: "browser_click",
      description: "点击页面上的元素（支持 CSS 选择器或文本匹配）。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器，如 '#btn', '.class'" },
          text: { type: "string", description: "按文本内容点击，如 '登录'。优先于 selector" },
          rightClick: { type: "boolean", description: "是否右键点击", default: false },
        },
      },
    },
    {
      name: "browser_fill",
      description: "填写输入框。模拟真实用户输入，带延迟。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "输入框的 CSS 选择器" },
          value: { type: "string", description: "要输入的内容" },
          clear: { type: "boolean", description: "输入前是否清空，默认 true", default: true },
          delayMs: { type: "number", description: "输入延迟毫秒数，默认 30", default: 30 },
        },
        required: ["selector", "value"],
      },
    },
    {
      name: "browser_clear",
      description: "清空输入框的内容。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "输入框的 CSS 选择器" },
        },
        required: ["selector"],
      },
    },
    {
      name: "browser_select",
      description: "从下拉列表 (<select>) 中选择选项。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "select 元素的 CSS 选择器" },
          value: { type: "string", description: "要选中的 option 的 value（优先级高）" },
          label: { type: "string", description: "要选中的 option 的显示文本" },
          index: { type: "number", description: "要选中的 option 的索引（从 0 开始）" },
        },
        required: ["selector"],
      },
    },
    {
      name: "browser_pressKey",
      description: "在页面上按下键盘按键。支持 Enter, Escape, Tab, Backspace, ArrowUp/Down/Left/Right, Delete, 以及组合键如 Control+A, Control+C。",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "按键名，如 'Enter', 'Escape', 'Tab', 'ArrowDown', 'Control+A', 'Delete'" },
        },
        required: ["key"],
      },
    },
    {
      name: "browser_hover",
      description: "将鼠标悬停在元素上（触发 hover CSS 效果）。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器" },
          text: { type: "string", description: "按文本内容悬停（优先于 selector）" },
        },
      },
    },
    {
      name: "browser_submit",
      description: "提交表单。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "表单的 CSS 选择器，默认 'form'", default: "form" },
        },
      },
    },
    {
      name: "browser_scroll",
      description: "滚动页面。支持方向滚动或滚动到指定元素。",
      inputSchema: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down", "top", "bottom"], description: "滚动方向" },
          amount: { type: "number", description: "滚动像素数（up/down），默认 500", default: 500 },
          selector: { type: "string", description: "滚动到元素位置（优先级高于 direction）" },
        },
        required: ["direction"],
      },
    },
    {
      name: "browser_drag",
      description: "拖拽元素到目标位置。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "要拖拽的元素的 CSS 选择器" },
          targetSelector: { type: "string", description: "目标放置位置的 CSS 选择器" },
          xOffset: { type: "number", description: "水平偏移像素（与 targetSelector 二选一）" },
          yOffset: { type: "number", description: "垂直偏移像素（与 targetSelector 二选一）" },
        },
        required: ["selector"],
      },
    },

    // ========== 提取类 ==========
    {
      name: "browser_extract",
      description: "提取页面文字内容。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器，留空则提取整页可见文本" },
          attribute: { type: "string", description: "提取属性值（如 'href'），配合 selector 使用" },
        },
      },
    },
    {
      name: "browser_evaluate",
      description: "在页面中执行自定义 JavaScript 代码，返回结果。",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "要执行的 JS 代码" },
        },
        required: ["code"],
      },
    },
    {
      name: "browser_screenshotElement",
      description: "截取页面中某个元素的截图（如某个按钮、图片、区域）。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "元素的 CSS 选择器" },
          scrollIntoView: { type: "boolean", description: "是否先滚动到元素位置", default: true },
        },
        required: ["selector"],
      },
    },
    {
      name: "browser_getCookies",
      description: "获取当前页面的所有 Cookie。",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "按域名筛选（可选）" },
        },
      },
    },
    {
      name: "browser_deleteCookies",
      description: "删除 Cookie。不传参数则删除所有 Cookie。",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "要删除的 Cookie 名称（可选，不传则清空所有）" },
          domain: { type: "string", description: "Cookie 域名（可选）" },
        },
      },
    },

    // ========== 标签页管理 ==========
    {
      name: "browser_newTab",
      description: "打开一个新的空白标签页。",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "在新标签页中打开的 URL（可选）" },
        },
      },
    },
    {
      name: "browser_switchTab",
      description: "切换到指定索引的标签页（从 0 开始）。",
      inputSchema: {
        type: "object",
        properties: {
          index: { type: "number", description: "标签页索引（从 0 开始）" },
        },
        required: ["index"],
      },
    },
    {
      name: "browser_closeTab",
      description: "关闭当前标签页，自动切换到上一个标签页。",
      inputSchema: {
        type: "object",
        properties: {
          index: { type: "number", description: "要关闭的标签页索引（可选，默认关闭当前页）" },
        },
      },
    },

    // ========== 高级功能 ==========
    {
      name: "browser_wait",
      description: "等待一段时间，或等待某个元素出现。",
      inputSchema: {
        type: "object",
        properties: {
          ms: { type: "number", description: "等待的毫秒数，默认 2000", default: 2000 },
          selector: { type: "string", description: "等待元素出现（优先级高于 ms）" },
          timeout: { type: "number", description: "超时毫秒，默认 30000", default: 30000 },
          disappear: { type: "boolean", description: "等待元素消失而不是出现", default: false },
        },
      },
    },
    {
      name: "browser_iframe",
      description: "切换到 iframe 上下文（之后的操作在 iframe 内执行），或切回主页面。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "iframe 的 CSS 选择器，传 'main' 切回主页面" },
        },
        required: ["selector"],
      },
    },
    {
      name: "browser_console",
      description: "获取页面控制台日志（console.log/error/warn 的输出）。",
      inputSchema: {
        type: "object",
        properties: {
          clear: { type: "boolean", description: "获取后是否清空日志缓冲区", default: false },
        },
      },
    },
    {
      name: "browser_reset",
      description: "重置浏览器实例。关闭所有页面和浏览器进程，重新启动。用于浏览器卡死或状态异常时。",
      inputSchema: { type: "object", properties: {} },
    },
    // ========== 验证码辅助 ==========
    {
      name: "browser_clickAt",
      description: "在页面的指定坐标位置点击（如无法用 CSS 选择器定位的元素）。用于滑动验证码、弹窗、canvas 等场景。",
      inputSchema: {
        type: "object",
        properties: {
          x: { type: "number", description: "X 坐标（相对于视口左上角）" },
          y: { type: "number", description: "Y 坐标（相对于视口左上角）" },
          button: { type: "string", enum: ["left", "right", "middle"], description: "鼠标按键", default: "left" },
          clickCount: { type: "number", description: "点击次数", default: 1 },
        },
        required: ["x", "y"],
      },
    },
    {
      name: "browser_getBounds",
      description: "获取页面上元素的位置和大小信息。用于计算点击坐标、滑动距离等。",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器" },
        },
        required: ["selector"],
      },
    },
    {
      name: "browser_getViewport",
      description: "获取当前页面的视口大小和滚动位置。",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "browser_mouseMove",
      description: "模拟鼠标移动到指定坐标。支持分段移动（模拟真人轨迹）。",
      inputSchema: {
        type: "object",
        properties: {
          x: { type: "number", description: "目标 X 坐标" },
          y: { type: "number", description: "目标 Y 坐标" },
          steps: { type: "number", description: "移动步数（越多越平滑，默认 10）", default: 10 },
        },
        required: ["x", "y"],
      },
    },
    {
      name: "browser_close",
      description: "关闭当前页面（不清除浏览器实例，下次操作自动新建页面）。",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// ==================== 工具调用处理 ====================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const errMsg = (error: any) =>
    `❌ 执行出错: ${error.message || String(error)}`;

  try {
    switch (name) {
      // ======================== 导航类 ========================

      case "browser_screenshot": {
        const p = await getPage();
        const url = args?.url as string | undefined;
        const fullPage = (args?.fullPage as boolean) ?? false;
        const waitMs = (args?.waitMs as number) ?? 1000;

        if (url) {
          await p.goto(url, { waitUntil: "networkidle2", timeout: CONFIG.defaultTimeout });
          try { await loadCookies(p); } catch { /* 忽略 */ }
        }
        await new Promise((r) => setTimeout(r, waitMs));

        const screenshot = await p.screenshot({ encoding: "base64", fullPage, type: "png" });
        return {
          content: [
            { type: "image", data: screenshot, mimeType: "image/png" },
            { type: "text", text: `✅ 截图完成${url ? `：${url}` : ""}` },
          ],
        };
      }

      case "browser_getUrl": {
        const p = await getPage();
        return { content: [{ type: "text", text: `当前 URL: ${p.url()}` }] };
      }

      case "browser_getTitle": {
        const p = await getPage();
        const title = await p.title();
        return { content: [{ type: "text", text: `当前标题: ${title}` }] };
      }

      case "browser_getHTML": {
        const p = await getPage();
        const sel = args?.selector as string | undefined;
        const outer = (args?.outer as boolean) ?? true;

        let html: string;
        if (sel) {
          html = await p.$$eval(sel, (els, o) =>
            els.map((el) => o ? el.outerHTML : el.innerHTML).join("\n---\n"),
            outer
          );
          if (!html) html = `⚠️ 未找到元素: ${sel}`;
        } else {
          html = await p.evaluate((o) => o ? document.documentElement.outerHTML : document.body.innerHTML, outer);
        }
        const maxLen = 20000;
        if (html.length > maxLen) html = html.slice(0, maxLen) + `\n\n...（截断，共 ${html.length} 字符）`;
        return { content: [{ type: "text", text: html }] };
      }

      case "browser_reload": {
        const p = await getPage();
        const ignoreCache = (args?.ignoreCache as boolean) ?? false;
        await p.reload({ waitUntil: "networkidle2", timeout: CONFIG.defaultTimeout });
        return { content: [{ type: "text", text: `✅ 页面已刷新${ignoreCache ? "（强制）" : ""}` }] };
      }

      case "browser_back": {
        const p = await getPage();
        await p.goBack();
        await p.waitForNavigation({ waitUntil: "networkidle2", timeout: CONFIG.defaultTimeout }).catch(() => {});
        return { content: [{ type: "text", text: `✅ 后退到: ${p.url()}` }] };
      }

      case "browser_forward": {
        const p = await getPage();
        await p.goForward();
        await p.waitForNavigation({ waitUntil: "networkidle2", timeout: CONFIG.defaultTimeout }).catch(() => {});
        return { content: [{ type: "text", text: `✅ 前进到: ${p.url()}` }] };
      }

      case "browser_pdf": {
        const p = await getPage();
        const pdf = await p.pdf({
          scale: (args?.scale as number) ?? 1,
          landscape: (args?.landscape as boolean) ?? false,
          format: ((args?.format as string) ?? "A4") as any,
          printBackground: true,
        });
        const base64 = Buffer.from(pdf).toString("base64");
        return {
          content: [
            { type: "resource", blob: base64, mimeType: "application/pdf" },
            { type: "text", text: `✅ PDF 已生成 (${(pdf.length / 1024).toFixed(0)} KB)` },
          ],
        };
      }

      // ======================== 交互类 ========================

      case "browser_click": {
        const p = await getPage();
        const text = args?.text as string | undefined;
        const selector = args?.selector as string | undefined;
        const rightClick = (args?.rightClick as boolean) ?? false;

        if (text) {
          const clicked = await p.evaluate((t: string) => {
            const find = (xpath: string) =>
              document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                .singleNodeValue as HTMLElement | null;
            const el = find(`//*[text()="${t}"]`) || find(`//*[contains(text(), "${t}")]`);
            if (el) { el.click(); return true; }
            // 尝试 button/input 的 value
            const byValue = document.querySelector(`input[value="${t}"], button:has-text("${t}")`) as HTMLElement | null;
            if (byValue) { byValue.click(); return true; }
            return false;
          }, text);
          if (!clicked) throw new Error(`未找到包含文字 "${text}" 的元素`);
          lastResult = `✅ 已点击：${text}`;
        } else if (selector) {
          await p.waitForSelector(selector, { timeout: 10000 });
          if (rightClick) {
            const el = await p.$(selector);
            if (el) await el.click({ button: "right" });
          } else {
            await p.click(selector);
          }
          lastResult = `✅ 已点击：${selector}`;
        } else {
          throw new Error("请提供 selector 或 text 参数");
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_fill": {
        const p = await getPage();
        const selector = args?.selector as string;
        const value = args?.value as string;
        const clear = (args?.clear as boolean) ?? true;
        const delayMs = (args?.delayMs as number) ?? 30;

        await p.waitForSelector(selector, { timeout: 10000 });
        if (clear) {
          await p.click(selector, { clickCount: 3 });
          await p.keyboard.press("Backspace");
        }
        await p.type(selector, value, { delay: delayMs });
        return { content: [{ type: "text", text: `✅ 已填写 ${selector} = "${value}"` }] };
      }

      case "browser_clear": {
        const p = await getPage();
        const selector = args?.selector as string;
        await p.waitForSelector(selector, { timeout: 10000 });
        await p.click(selector, { clickCount: 3 });
        await p.keyboard.press("Backspace");
        return { content: [{ type: "text", text: `✅ 已清空: ${selector}` }] };
      }

      case "browser_select": {
        const p = await getPage();
        const sel = args?.selector as string;
        await p.waitForSelector(sel, { timeout: 10000 });
        if (args?.value !== undefined) {
          await p.select(sel, args.value as string);
          lastResult = `✅ 已选择 value=${args.value}`;
        } else if (args?.label !== undefined) {
          await p.evaluate(
            (s: string, label: string) => {
              const select = document.querySelector(s) as HTMLSelectElement;
              if (!select) throw new Error(`未找到 select: ${s}`);
              for (const opt of select.options) {
                if (opt.text === label) { select.value = opt.value; select.dispatchEvent(new Event("change")); return; }
              }
              throw new Error(`未找到 label 为 "${label}" 的 option`);
            },
            sel, args.label as string
          );
          lastResult = `✅ 已选择 label=${args.label}`;
        } else if (args?.index !== undefined) {
          await p.evaluate(
            (s: string, idx: number) => {
              const select = document.querySelector(s) as HTMLSelectElement;
              if (!select) throw new Error(`未找到 select: ${s}`);
              if (idx >= select.options.length) throw new Error(`索引 ${idx} 超出范围 (共 ${select.options.length} 个选项)`);
              select.selectedIndex = idx;
              select.dispatchEvent(new Event("change"));
            },
            sel, args.index as number
          );
          lastResult = `✅ 已选择 index=${args.index}`;
        } else {
          throw new Error("请提供 value、label 或 index 参数");
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_pressKey": {
        const p = await getPage();
        const key = args?.key as string;
        const parts = key.split("+");
        if (parts.length > 1) {
          const mod = parts[0].toLowerCase();
          const modKey = mod === "control" ? "Control" : mod === "shift" ? "Shift" : mod === "alt" ? "Alt" : mod === "meta" ? "Meta" : parts[0];
          const k = parts.slice(1).join("+");
          await p.keyboard.down(modKey as any);
          await p.keyboard.press(k as any);
          await p.keyboard.up(modKey as any);
        } else {
          await p.keyboard.press(key as any);
        }
        return { content: [{ type: "text", text: `✅ 已按键: ${key}` }] };
      }

      case "browser_hover": {
        const p = await getPage();
        const text = args?.text as string | undefined;
        const selector = args?.selector as string | undefined;

        if (text) {
          const found = await p.evaluate((t: string) => {
            const find = (xpath: string) =>
              document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                .singleNodeValue as HTMLElement | null;
            const el = find(`//*[text()="${t}"]`) || find(`//*[contains(text(), "${t}")]`);
            if (el) { el.dispatchEvent(new MouseEvent("mouseenter")); return true; }
            return false;
          }, text);
          if (!found) throw new Error(`未找到包含文字 "${text}" 的元素`);
          lastResult = `✅ 已悬停：${text}`;
        } else if (selector) {
          await p.waitForSelector(selector, { timeout: 10000 });
          await p.hover(selector);
          lastResult = `✅ 已悬停：${selector}`;
        } else {
          throw new Error("请提供 selector 或 text 参数");
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_submit": {
        const p = await getPage();
        const sel = (args?.selector as string) || "form";
        await p.evaluate((s: string) => {
          const form = document.querySelector(s) as HTMLFormElement;
          if (form) form.submit();
          else throw new Error(`未找到表单: ${s}`);
        }, sel);
        await p.waitForNavigation({ timeout: 15000 }).catch(() => {});
        return { content: [{ type: "text", text: `✅ 已提交表单: ${sel}` }] };
      }

      case "browser_scroll": {
        const p = await getPage();
        const direction = args?.direction as string;
        const amount = (args?.amount as number) ?? 500;
        const selector = args?.selector as string | undefined;

        if (selector) {
          await p.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            else throw new Error(`未找到元素: ${sel}`);
          }, selector);
          lastResult = `✅ 已滚动到元素: ${selector}`;
        } else {
          await p.evaluate((dir: string, amt: number) => {
            switch (dir) {
              case "top": window.scrollTo({ top: 0, behavior: "smooth" }); break;
              case "bottom": window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); break;
              case "up": window.scrollBy({ top: -amt, behavior: "smooth" }); break;
              case "down": window.scrollBy({ top: amt, behavior: "smooth" }); break;
            }
          }, direction, amount);
          lastResult = `✅ 已滚动${direction === "top" || direction === "bottom" ? `到${direction}` : `${direction} ${amount}px`}`;
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_drag": {
        const p = await getPage();
        const sel = args?.selector as string;
        const targetSel = args?.targetSelector as string | undefined;
        const xOff = args?.xOffset as number | undefined;
        const yOff = args?.yOffset as number | undefined;

        await p.waitForSelector(sel, { timeout: 10000 });
        const el = await p.$(sel);
        if (!el) throw new Error(`未找到元素: ${sel}`);

        if (targetSel) {
          await p.waitForSelector(targetSel, { timeout: 10000 });
          const target = await p.$(targetSel);
          if (!target) throw new Error(`未找到目标元素: ${targetSel}`);
          const tBox = await target.boundingBox();
          if (!tBox) throw new Error(`目标元素不可见`);
          await el.drag({ x: tBox.x + tBox.width / 2, y: tBox.y + tBox.height / 2 });
          lastResult = `✅ 已拖拽 ${sel} 到 ${targetSel}`;
        } else if (xOff !== undefined && yOff !== undefined) {
          const box = await el.boundingBox();
          if (!box) throw new Error(`元素不可见`);
          await el.drag({ x: box.x + xOff, y: box.y + yOff });
          lastResult = `✅ 已拖拽 ${sel} 偏移 (${xOff}, ${yOff})`;
        } else {
          throw new Error("请提供 targetSelector 或 xOffset/yOffset");
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      // ======================== 提取类 ========================

      case "browser_extract": {
        const p = await getPage();
        const sel = args?.selector as string | undefined;
        const attr = args?.attribute as string | undefined;
        let text: string;

        if (sel) {
          if (attr) {
            text = await p.$$eval(sel, (els, a) =>
              els.map((el) => (el as HTMLElement).getAttribute(a as string))
                .filter(Boolean).join("\n"),
              attr
            );
          } else {
            text = await p.$$eval(sel, (els) =>
              els.length > 0
                ? els.map((el) => (el as HTMLElement).innerText).join("\n---\n")
                : `⚠️ 未找到元素: ${sel}`
            );
          }
        } else {
          text = await p.evaluate(() => document.body.innerText);
        }

        const maxLen = 50000;
        if (text && text.length > maxLen) {
          text = text.slice(0, maxLen) + `\n\n...（截断，共 ${text.length} 字符）`;
        }
        return { content: [{ type: "text", text }] };
      }

      case "browser_evaluate": {
        const p = await getPage();
        const code = args?.code as string;
        const result = await p.evaluate(code);
        const text = typeof result === "object"
          ? JSON.stringify(result, null, 2)
          : String(result);
        return { content: [{ type: "text", text }] };
      }

      case "browser_screenshotElement": {
        const p = await getPage();
        const sel = args?.selector as string;
        const scroll = (args?.scrollIntoView as boolean) ?? true;

        await p.waitForSelector(sel, { timeout: 10000 });
        if (scroll) {
          await p.evaluate((s: string) => {
            document.querySelector(s)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, sel);
          await new Promise((r) => setTimeout(r, 500));
        }

        const el = await p.$(sel);
        if (!el) throw new Error(`未找到元素: ${sel}`);
        const shot = await el.screenshot({ encoding: "base64" });
        if (!shot) throw new Error(`元素截图失败`);
        const imgData = typeof shot === "string" ? shot : Buffer.from(shot).toString("base64");
        return {
          content: [
            { type: "image", data: imgData, mimeType: "image/png" },
            { type: "text", text: `✅ 元素截图完成: ${sel}` },
          ],
        };
      }

      case "browser_getCookies": {
        const p = await getPage();
        const cookies = await p.cookies();
        const domain = args?.domain as string | undefined;
        const filtered = domain
          ? cookies.filter((c) => c.domain.includes(domain))
          : cookies;
        return {
          content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
        };
      }

      case "browser_deleteCookies": {
        const p = await getPage();
        const name = args?.name as string | undefined;
        const domain = args?.domain as string | undefined;

        if (name) {
          const cookies = await p.cookies();
          const toDelete = cookies.filter((c) => c.name === name && (!domain || c.domain.includes(domain)));
          for (const c of toDelete) {
            await p.deleteCookie(c);
          }
          lastResult = `✅ 已删除 ${toDelete.length} 个名为 "${name}" 的 Cookie`;
        } else {
          // 清除所有 Cookie
          const all = await p.cookies();
          await p.deleteCookie(...all);
          lastResult = `✅ 已清除全部 ${all.length} 个 Cookie`;
        }
        // 同步到文件
        await saveCookies(p);
        return { content: [{ type: "text", text: lastResult }] };
      }

      // ======================== 标签页管理 ========================

      case "browser_newTab": {
        const b = await (async () => { await getPage(); return browser!; })();
        const newPage = await b.newPage();
        await newPage.setViewport(CONFIG.viewport);
        await newPage.setUserAgent(CONFIG.userAgent);
        const url = args?.url as string | undefined;
        if (url) {
          await newPage.goto(url, { waitUntil: "networkidle2", timeout: CONFIG.defaultTimeout });
        }
        // 切换到新标签页
        page = newPage;
        currentFrame = null;
        return { content: [{ type: "text", text: `✅ 已打开新标签页${url ? `: ${url}` : ""}` }] };
      }

      case "browser_switchTab": {
        const b = await (async () => { await getPage(); return browser!; })();
        const pages = await b.pages();
        const index = args?.index as number;
        if (index < 0 || index >= pages.length) {
          throw new Error(`索引 ${index} 超出范围，当前共 ${pages.length} 个标签页`);
        }
        page = pages[index];
        currentFrame = null;
        await page.bringToFront();
        return { content: [{ type: "text", text: `✅ 已切换到标签页 ${index}: ${page.url()}` }] };
      }

      case "browser_closeTab": {
        const b = await (async () => { await getPage(); return browser!; })();
        const pages = await b.pages();
        const index = args?.index as number;

        let targetPage: Page;
        if (index !== undefined) {
          if (index < 0 || index >= pages.length) throw new Error(`索引 ${index} 超出范围`);
          targetPage = pages[index];
        } else {
          targetPage = page || pages[pages.length - 1];
        }

        await targetPage.close();
        if (targetPage === page) {
          // 切到另一个标签页
          const remaining = await b.pages();
          page = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          currentFrame = null;
        }
        return { content: [{ type: "text", text: `✅ 标签页已关闭，剩余 ${(await b.pages()).length} 个` }] };
      }

      // ======================== 高级功能 ========================

      case "browser_wait": {
        const p = await getPage();
        const selector = args?.selector as string | undefined;
        const ms = (args?.ms as number) ?? 2000;
        const timeout = (args?.timeout as number) ?? CONFIG.defaultTimeout;
        const disappear = (args?.disappear as boolean) ?? false;

        if (selector) {
          if (disappear) {
            await p.waitForSelector(selector, { timeout, hidden: true });
            lastResult = `✅ 元素已消失: ${selector}`;
          } else {
            await p.waitForSelector(selector, { timeout });
            lastResult = `✅ 元素已出现: ${selector}`;
          }
        } else {
          await new Promise((r) => setTimeout(r, ms));
          lastResult = `✅ 已等待 ${ms}ms`;
        }
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_iframe": {
        const p = await getPage();
        const selector = args?.selector as string;

        if (selector === "main" || selector === "parent") {
          currentFrame = null;
          return { content: [{ type: "text", text: "✅ 已切回主页面上下文" }] };
        }

        await p.waitForSelector(selector, { timeout: 10000 });
        const el = await p.$(selector);
        if (!el) throw new Error(`未找到 iframe: ${selector}`);
        const frame = await el.contentFrame();
        if (!frame) throw new Error(`iframe 没有内容框架: ${selector}`);
        currentFrame = frame as unknown as ElementHandle<Element>;
        return { content: [{ type: "text", text: `✅ 已切换到 iframe: ${selector}` }] };
      }

      case "browser_console": {
        const clear = (args?.clear as boolean) ?? false;
        const logs = consoleLogs.join("\n");
        if (clear) consoleLogs = [];
        return { content: [{ type: "text", text: logs || "（暂无控制台日志）" }] };
      }

      case "browser_reset": {
        await ensureBrowserClosed();
        consoleLogs = [];
        return { content: [{ type: "text", text: "✅ 浏览器已重置，下次操作自动重新启动" }] };
      }

      case "browser_close": {
        if (page && !page.isClosed()) {
          const p = page;
          page = null;
          currentFrame = null;
          await p.close();
        }
        return { content: [{ type: "text", text: "当前页面已关闭" }] };
      }

      // ======================== 验证码辅助 ========================

      case "browser_clickAt": {
        const p = await getPage();
        const x = args?.x as number;
        const y = args?.y as number;
        const button = (args?.button as string) || "left";
        const clickCount = (args?.clickCount as number) ?? 1;
        await p.mouse.click(x, y, { button: button as any, clickCount });
        lastResult = `✅ 已点击坐标 (${x}, ${y})`;
        return { content: [{ type: "text", text: lastResult }] };
      }

      case "browser_getBounds": {
        const p = await getPage();
        const sel = args?.selector as string;
        await p.waitForSelector(sel, { timeout: 10000 });
        const bounds = await p.evaluate((s: string) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            centerX: rect.x + rect.width / 2,
            centerY: rect.y + rect.height / 2,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            tagName: el.tagName,
            visible: rect.width > 0 && rect.height > 0,
          };
        }, sel);
        if (!bounds) throw new Error(`未找到元素: ${sel}`);
        return { content: [{ type: "text", text: JSON.stringify(bounds, null, 2) }] };
      }

      case "browser_getViewport": {
        const p = await getPage();
        const vp = await p.evaluate(() => ({
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          scrollWidth: document.body.scrollWidth,
          scrollHeight: document.body.scrollHeight,
        }));
        return { content: [{ type: "text", text: JSON.stringify(vp, null, 2) }] };
      }

      case "browser_mouseMove": {
        const p = await getPage();
        const x = args?.x as number;
        const y = args?.y as number;
        const steps = (args?.steps as number) ?? 10;

        // 分段移动模拟真人鼠标轨迹
        const start = await p.evaluate(() => ({ x: 0, y: 0 }));
        // 获取当前鼠标位置
        const currentPos = await p.evaluate(() => ({ x: 0, y: 0 }));
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          // 加一点随机偏移模拟真人
          const jitter = () => (Math.random() - 0.5) * 0.5;
          const cx = x * progress + jitter();
          const cy = y * progress + jitter();
          await p.mouse.move(cx, cy);
        }
        // 确保最终位置准确
        await p.mouse.move(x, y);
        lastResult = `✅ 鼠标已移动到 (${x}, ${y})`;
        return { content: [{ type: "text", text: lastResult }] };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${name}`);
    }
  } catch (error: any) {
    if (
      error.message?.includes("Target closed") ||
      error.message?.includes("Protocol error") ||
      error.message?.includes("detached from")
    ) {
      console.error("[browser] 浏览器连接异常，即将自动重置");
      await ensureBrowserClosed();
    }
    return {
      content: [{ type: "text", text: errMsg(error) }],
      isError: true,
    };
  }
});

// ==================== 优雅退出 ====================

async function shutdown() {
  console.error("\n[mcp-browser-agent] 正在关闭，保存 Cookie...");
  await ensureBrowserClosed();
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ==================== 启动 ====================

console.error(`[mcp-browser-agent] v${PKG.version} 已启动`);
console.error(`[mcp-browser-agent] 数据目录: ${CONFIG.dataDir}`);
console.error(`[mcp-browser-agent] Cookies: ${fs.existsSync(CONFIG.cookieFile) ? `已加载 ${JSON.parse(fs.readFileSync(CONFIG.cookieFile,"utf-8")).length} 个` : "尚无"}`);
console.error(`[mcp-browser-agent] 工具数量: 34`);
console.error(`[mcp-browser-agent] 输入 valid JSON-RPC 到 stdin，输出到 stdout`);
console.error(`[mcp-browser-agent] SHOW_BROWSER=true 可显示浏览器窗口（调试/过验证码）`);

const transport = new StdioServerTransport();
await server.connect(transport);
