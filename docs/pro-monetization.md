# MCP Browser Agent — Pro 版变现配置指南

## 支付方案

### 🇨🇳 方案 A：爱发电（国内推荐，支持支付宝/微信）
https://afdian.net

**设置步骤：**

1. 注册爱发电 → 创建创作者主页
2. 创建两个 **售卖型商品**（不是赞助/发电）：

   | 商品 | 定价 | 说明 |
   |:----|:----:|:-----|
   | MCP Browser Agent Pro（月度） | ¥69 | 月付订阅 |
   | MCP Browser Agent Pro（终身） | ¥499 | 一次付费 |

3. **关键：开启自动发货**
   - 在商品编辑页 → 勾选 **"这是一个实体/数字商品"**
   - 填写自动发货内容，例如：

   ```
   感谢购买 MCP Browser Agent Pro！
   
   配置方式：
   1. 打开 ~/.mcp-browser.json（或项目目录下的 .mcp-browser.json）
   2. 添加以下内容：
   
   {
     "licenseKey": "mcpba-xxxx-xxxx-xxxx-xxxxxxxx"
   }
   
   或者设置环境变量：
   export MCP_PRO_LICENSE=mcpba-xxxx-xxxx-xxxx-xxxxxxxx
   
   3. 重启 MCP 服务即可解锁 Pro 功能
   ```

4. 把 License Key 填入自动发货内容中

### 🌍 方案 B：Lemon Squeezy（国外用户）
https://www.lemonsqueezy.com
- 支持信用卡 + PayPal
- 自动生成 License Key
- 适合海外用户

---

## License Key 生成

```bash
# 安装依赖
npm install

# 生成一个 License Key
node tools/generate-license.mjs

# 生成 5 个
node tools/generate-license.mjs 5
```

**生产环境密钥：**
```bash
# 生成时使用跟代码里一致的环境变量
MCP_PRO_SECRET=你的密钥 node tools/generate-license.mjs 10
```

---

## 用户配置方式

用户在 `.mcp-browser.json` 中设置 License Key：
```json
{
  "licenseKey": "mcpba-xxxx-xxxx-xxxx-xxxxxxxx"
}
```

或者通过环境变量：
```bash
MCP_PRO_LICENSE=mcpba-xxxx-xxxx-xxxx-xxxxxxxx mcp-browse-agent
```
