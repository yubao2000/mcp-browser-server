# 🤖 MCP Browser Agent

**让 AI Agent（Claude/GPT）像人一样操作浏览器。**
**Let AI agents control the browser just like a human.**

[![npm version](https://img.shields.io/npm/v/mcp-browser-agent)](https://www.npmjs.com/package/mcp-browser-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## 📋 工具清单（30 个）

### 🧭 导航类
| 工具 | 说明 |
|------|------|
| `browser_screenshot` | 打开网页并截图（支持全页截图） |
| `browser_getUrl` | 获取当前页面 URL |
| `browser_getTitle` | 获取页面标题 |
| `browser_getHTML` | 获取 HTML 源码 |
| `browser_reload` | 刷新页面 |
| `browser_back` | 后退 |
| `browser_forward` | 前进 |
| `browser_pdf` | 导出当前页面为 PDF |

### 🖱️ 交互类
| 工具 | 说明 |
|------|------|
| `browser_click` | 点击元素（CSS 选择器、文本、右键） |
| `browser_fill` | 填写输入框（模拟真实输入） |
| `browser_clear` | 清空输入框 |
| `browser_select` | 下拉列表选择（value/label/index） |
| `browser_pressKey` | 键盘按键（Enter/Escape/Tab/组合键） |
| `browser_hover` | 鼠标悬停 |
| `browser_submit` | 提交表单 |
| `browser_scroll` | 滚动（上/下/到顶/到底/到元素） |
| `browser_drag` | 拖拽元素 |

### 📝 提取类
| 工具 | 说明 |
|------|------|
| `browser_extract` | 提取文字内容（支持选择器和属性） |
| `browser_evaluate` | 执行自定义 JavaScript |
| `browser_screenshotElement` | 截取指定元素的截图 |
| `browser_getCookies` | 获取 Cookie |
| `browser_deleteCookies` | 删除 Cookie |

### 📑 标签页管理
| 工具 | 说明 |
|------|------|
| `browser_newTab` | 打开新标签页 |
| `browser_switchTab` | 切换到指定标签页 |
| `browser_closeTab` | 关闭标签页 |

### ⚡ 高级功能
| 工具 | 说明 |
|------|------|
| `browser_wait` | 等待（时间或元素出现/消失） |
| `browser_iframe` | 切换 iframe 上下文 |
| `browser_console` | 获取控制台日志 |
| `browser_reset` | 重置浏览器实例 |
| `browser_close` | 关闭当前页面 |

---

## 🚀 快速开始

### 前提
- Node.js >= 18
- （推荐）Claude Desktop / Cursor / 任何支持 MCP 的客户端

### 一键安装
```bash
# 方式 1：全局安装
npm install -g mcp-browser-agent

# 方式 2：直接运行
npx mcp-browser-agent
```

### 在 Claude Desktop 中配置

编辑 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "npx",
      "args": ["-y", "mcp-browser-agent"]
    }
  }
}
```

配置完成后，直接对 Claude 说：

> **"帮我打开百度首页，截图给我看"**
>
> **"搜索 'MCP 协议'，把搜索结果提取出来"**
>
> **"帮我登录 Gmail，填上用户名和密码，点击登录"**

---

## 🛠 配置文件

项目支持 `.mcp-browser.json` 配置文件（放在项目目录或用户目录 `~/.mcp-browser.json`）：

```json
{
  "dataDir": "./.browser-data",
  "viewport": { "width": 1280, "height": 800 },
  "headless": true,
  "defaultTimeout": 30000,
  "chromePath": null
}
```

环境变量也可配置：
- `BROWSER_DATA_DIR` — 数据目录（Cookie 等）
- `MCP_BROWSER_CONFIG` — 配置文件路径
- `MCP_PRO_LICENSE` — Pro 版 License Key

### Cookie 持久化

Cookie 自动保存在 `.browser-data/cookies.json`。重启服务后，之前登录的网站自动恢复登录态。对于需要频繁登录的网站（Gmail、知乎、小红书等），只需登录一次。

---

## 📦 本地开发

```bash
git clone https://github.com/<你的GitHub用户名>/mcp-browser-server.git
cd mcp-browser-server
npm install
npm run build
npm start
```

---

## 💰 Pro 版

| 功能 | 免费版 | Pro 版 ($9.9/月) | 终身版 ($99) |
|------|:------:|:-----------------:|:------------:|
| 全部 30 个工具 | ✅ | ✅ | ✅ |
| Cookie 持久化 | ✅ | ✅ | ✅ |
| 标签页管理 | ✅ | ✅ | ✅ |
| 批量自动化（CSV 驱动） | ❌ | ✅ 100条/次 | ✅ 100条/次 |
| 多标签页并发 | 1个 | 10个 | 10个 |
| Cookie 加密备份 | ❌ | ✅ | ✅ |
| JSON/CSV 数据导出 | ❌ | ✅ | ✅ |
| 企业级技术支持 | ❌ | ✅ | ✅ |
| 永久免费升级 | ❌ | ❌ | ✅ |

Pro 版即将推出。[订阅通知](https://github.com/<你的GitHub用户名>/mcp-browser-server/issues)获取早鸟优惠！

---

## 🤝 贡献

欢迎 Star、Issue、PR！

---

## 📄 License

MIT
