@echo off
chcp 65001 >nul
title MCP Browser Agent — 一键安装
echo ===============================================
echo  🤖 MCP Browser Agent — 一键安装脚本
echo ===============================================
echo.

:: 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js！请先安装 https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js 已安装：node --version

:: 安装依赖
echo.
echo 📦 正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 安装依赖失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

:: 安装 Chromium
echo.
echo 🌐 正在安装 Chromium（用于浏览器自动化）...
call npx @puppeteer/browsers install chrome@stable --path ./chrome-bin
if %errorlevel% neq 0 (
    echo ⚠️ Chromium 安装失败，将尝试使用系统已安装的 Chrome
) else (
    echo ✅ Chromium 安装完成
)

:: 编译
echo.
echo 🔨 正在编译 TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 编译失败
    pause
    exit /b 1
)
echo ✅ 编译完成

:: 测试
echo.
echo 🔍 正在运行快速测试...
echo {"jsonrpc":"2.0","id":1,"method":"tools/list"} | node dist/index.js >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ 测试异常，但可以继续
) else (
    echo ✅ 服务测试通过
)

echo.
echo ===============================================
echo  🎉 安装完成！
echo ===============================================
echo.
echo 下一步：
echo   1. 发布到 npm：npm publish
echo   2. 在 Claude Desktop 配置中填入：
echo      {
echo        "mcpServers": {
echo          "browser-agent": {
echo            "command": "npx",
echo            "args": ["-y", "mcp-browser-agent"]
echo          }
echo        }
echo      }
echo   3. 对 Claude 说："帮我打开百度首页截图"
echo.
pause
