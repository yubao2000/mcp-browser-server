# MCP Browser Agent — Pro 版变现配置指南

## 支付方案选择

### 方案 A：Lemon Squeezy（推荐，全球可用）
https://www.lemonsqueezy.com
- 支持 Stripe（信用卡）+ Alipay（支付宝）
- 自动生成和验证 License Key
- 托管结账页面，不需要自己写支付页面
- 费率：5% + $0.50/笔

### 方案 B：手动收款（零成本启动）
- 用户通过 Jinshuju 表单登记
- 你手动发 License Key
- 等有一定用户量再上自动化支付

**目前先用方案 B，等有第一批用户后切换方案 A。**

---

## Lemon Squeezy 接入步骤（以后做）

### 1. 注册账号
https://www.lemonsqueezy.com/register

### 2. 创建产品
- Products → Create Product
- Name: `MCP Browser Agent Pro`
- Price: Monthly $9.9 / Lifetime $99
- 勾选 "License key" 选项（让 Lemon Squeezy 自动生成 Key）

### 3. 获取 API 密钥
- Settings → API → Generate API Key

### 4. 对接验证
将 Lemon Squeezy 的 License Key 验证 API 集成到 `src/pro/license.ts` 中：

```typescript
// 在线验证示例
async function verifyOnline(licenseKey: string): Promise<boolean> {
  const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.LEMON_API_KEY}`
    },
    body: JSON.stringify({
      license_key: licenseKey,
    }),
  });
  const data = await response.json();
  return data.valid;
}
```

---

## License Key 生成（当前可用）

```bash
# 生成一个 License Key（开发环境）
node tools/generate-license.mjs

# 生成 5 个 Key
node tools/generate-license.mjs 5
```

### 用户使用
用户在 `.mcp-browser.json` 配置文件中设置 License Key：
```json
{
  "licenseKey": "mcpba-xxxx-xxxx-xxxx-xxxxxxxx"
}
```
或者通过环境变量：
```bash
MCP_PRO_LICENSE=xxx mcp-browse-agent
```

### 生产环境密钥
生成密钥时设置 `MCP_PRO_SECRET` 环境变量（必须跟代码里的一致）：
```bash
MCP_PRO_SECRET=你的密钥 node tools/generate-license.mjs 10
```
同时在 `.env` 或部署环境中设置相同的密钥。
