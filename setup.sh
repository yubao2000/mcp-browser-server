#!/usr/bin/env bash
set -e

echo "==============================================="
echo "  🤖 MCP Browser Agent — 一键安装脚本"
echo "==============================================="

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "❌ 未检测到 Node.js！请先安装 https://nodejs.org"
    exit 1
fi
echo "✅ Node.js 已安装: $(node --version)"

# Install dependencies
echo ""
echo "📦 正在安装依赖..."
npm install
echo "✅ 依赖安装完成"

# Install Chromium
echo ""
echo "🌐 正在安装 Chromium..."
npx @puppeteer/browsers install chrome@stable --path ./chrome-bin
echo "✅ Chromium 安装完成"

# Build
echo ""
echo "🔨 正在编译 TypeScript..."
npm run build
echo "✅ 编译完成"

# Quick test
echo ""
echo "🔍 正在运行快速测试..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5 node dist/index.js 2>/dev/null | grep -q "tools" && echo "✅ 服务测试通过" || echo "⚠️ 测试异常"

echo ""
echo "==============================================="
echo "  🎉 安装完成！"
echo "==============================================="
echo ""
echo "下一步:"
echo "  1. 发布到 npm: npm publish"
echo "  2. 在 Claude Desktop 配置中填入:"
echo '     { "mcpServers": { "browser-agent": { "command": "npx", "args": ["-y", "mcp-browser-agent"] } } }'
echo "  3. 对 Claude 说: '帮我打开百度首页截图'"
echo ""
