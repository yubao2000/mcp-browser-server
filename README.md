# 🤖 MCP Browser Agent

**让 AI Agent（Claude/GPT）像人一样操作浏览器。**
**Let AI agents control the browser just like a human.**

[![npm version](https://img.shields.io/npm/v/@yubao2000/mcp-browser-agent)](https://www.npmjs.com/package/@yubao2000/mcp-browser-agent)
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

### 快速使用

```bash
# 全局安装（推荐）
npm install -g @yubao2000/mcp-browser-agent

# 启动服务
mcp-browse-agent
```

### 在 Claude Desktop 中配置

找到配置文件 `claude_desktop_config.json`：

| 平台 | 路径 |
|:----:|------|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

> 💡 **找不到文件？** 打开 Claude Desktop → 点 **Developer**（开发者）→ **Edit MCP Config**（编辑 MCP 配置），会自动打开或创建这个文件。

将以下内容填入：

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "mcp-browse-agent",
      "args": []
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

### 在 Cursor 中配置

打开 Cursor → 设置 → **Features** → **MCP Servers** → **Add New MCP Server**：

| 字段 | 填什么 |
|:----|:--------|
| **Name** | `browser-agent` |
| **Type** | `command` |
| **Command** | `mcp-browse-agent` |
| **Arguments** | 留空 |

或者直接在项目下创建 `.cursor/mcp.json` 文件：

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "mcp-browse-agent",
      "args": []
    }
  }
}
```

配置后在 Cursor 中使用 ⌘ . 或 Ctrl . 打开 MCP 面板，选择 browser-agent 即可：

> **"帮我打开百度首页，截图给我看"**
>
> **"提取当前页面的所有链接"**

### 在 OpenAI Codex 中配置

编辑 `~/.codex/config.toml`：

```toml
[mcp_servers.browser-agent]
command = "mcp-browse-agent"
args = []
```

配置后在 Codex 会话中使用 `/mcp` 确认服务已加载：
> *"帮我打开百度首页，截图给我看"*
>
> *"帮我提取当前页面的文字内容"*

> 💡 **提示：** 在 Codex 中使用 `/mcp` 列出所有配置的 MCP 服务，`/mcp verbose` 查看详细状态。

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

### 👁️ 显示浏览器窗口（调试/过验证码）

默认浏览器在后台运行（不可见）。如果需要看到浏览器窗口：

```bash
# 方式 1：环境变量
SHOW_BROWSER=true mcp-browse-agent

# 方式 2：配置文件 .mcp-browser.json
{
  "showBrowser": true
}
```

浏览器窗口会弹出，你可以看到 AI 的每一步操作。适用于：
- 调试（看 AI 点了哪里、填了什么）
- 遇到滑动验证码时手动操作
- 演示/录屏

### 🍪 Cookie 持久化

Cookie 自动保存在 `.browser-data/cookies.json`。重启服务后，之前登录的网站自动恢复登录态。对于需要频繁登录的网站（Gmail、知乎、小红书等），只需登录一次。

---

## 📦 本地开发

```bash
git clone https://github.com/yubao2000/mcp-browser-server.git
cd mcp-browser-server
npm install
npm run build
npm start
```

---

## 💰 Pro 版

| 功能 | 免费版 | Pro 版 ($9.9/月) | 终身版 ($99) |
|------|:------:|:-----------------:|:------------:|
| 全部 34 个工具 | ✅ | ✅ | ✅ |
| Cookie 持久化 | ✅ | ✅ | ✅ |
| 标签页管理 | ✅ | ✅ | ✅ |
| 批量自动化（CSV 驱动） | ❌ | ✅ 100条/次 | ✅ 100条/次 |
| 多标签页并发 | 1个 | 10个 | 10个 |
| Cookie 加密备份 | ❌ | ✅ | ✅ |
| JSON/CSV 数据导出 | ❌ | ✅ | ✅ |
| 企业级技术支持 | ❌ | ✅ | ✅ |
| 永久免费升级 | ❌ | ❌ | ✅ |

Pro 版即将推出。[订阅通知](https://github.com/yubao2000/mcp-browser-server/issues)获取早鸟优惠！

---

## 🤝 贡献

欢迎 Star、Issue、PR！

---

## 📄 License

MIT
