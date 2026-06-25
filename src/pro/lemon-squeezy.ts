/**
 * MCP Browser Agent — 支付集成模块
 *
 * 支持双通道：
 *   1. 爱发电（国内）— 支付宝/微信支付
 *   2. Lemon Squeezy（国外）— 信用卡/ PayPal
 *
 * 使用前需要：
 *   1. 爱发电: 在 https://afdian.net 创建商品，获取商品链接
 *   2. Lemon Squeezy: 注册账号，创建产品，获取 API Key
 */

const LEMON_API_BASE = "https://api.lemonsqueezy.com/v1";

// ==================== 类型定义 ====================

export interface LSVariant {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year" | "lifetime" | null;
  description: string;
}

export interface LSCheckoutResult {
  url: string;
  id: string;
}

export interface LSLicenseResult {
  valid: boolean;
  licenseKey: string;
  activatedAt: string | null;
  expiresAt: string | null;
  meta: {
    customerEmail: string;
    customerName: string;
    variantName: string;
  };
}

export interface LSWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: Record<string, string>;
  };
  data: {
    attributes: Record<string, any>;
  };
}

// ==================== 主类 ====================

export class LemonSqueezy {
  private apiKey: string;
  private storeId: string | null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LEMON_API_KEY || "";
    this.storeId = process.env.LEMON_STORE_ID || null!;

    if (!this.apiKey) {
      console.warn("[LemonSqueezy] 未设置 LEMON_API_KEY，支付功能不可用");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${LEMON_API_BASE}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lemon Squeezy API 错误 (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  // ==================== 结账链接 ====================

  /**
   * 创建结账链接（直接跳转到 Lemon Squeezy 托管结账页）
   *
   * @param variantId - Lemon Squeezy 产品变体 ID
   * @param options - 可选参数
   * @returns 结账 URL
   *
   * ⚠️ 需要先在 Lemon Squeezy 后台设置：
   *    Settings → Checkout → URL 填写你的网站
   */
  async createCheckout(
    variantId: string,
    options?: {
      email?: string;
      name?: string;
      customPrice?: number;
      quantity?: number;
      redirectUrl?: string;
      expiresAt?: string;
    }
  ): Promise<LSCheckoutResult> {
    const body: Record<string, any> = {
      data: {
        type: "checkouts",
        attributes: {
          product_variant_id: variantId,
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: this.storeId,
            },
          },
        },
      },
    };

    if (options?.email) body.data.attributes.user_email = options.email;
    if (options?.name) body.data.attributes.user_name = options.name;
    if (options?.customPrice) body.data.attributes.custom_price = options.customPrice;
    if (options?.quantity) body.data.attributes.quantity = options.quantity;
    if (options?.redirectUrl) body.data.attributes.product_options = { redirect_url: options.redirectUrl };
    if (options?.expiresAt) body.data.attributes.expires_at = options.expiresAt;

    // 附加自定义数据，方便 webhook 识别
    body.data.attributes.custom = {
      source: "mcp-browser-agent",
    };

    const result = await this.request<any>("POST", "/checkouts", body);
    const attrs = result.data.attributes;

    return {
      url: attrs.url,
      id: result.data.id,
    };
  }

  /**
   * 创建 Pro 月付结账链接
   */
  async createMonthlyCheckout(options?: {
    email?: string;
    name?: string;
  }): Promise<LSCheckoutResult> {
    const variantId = process.env.LEMON_MONTHLY_VARIANT_ID;
    if (!variantId) throw new Error("未设置 LEMON_MONTHLY_VARIANT_ID");
    return this.createCheckout(variantId, options);
  }

  /**
   * 创建终身版结账链接
   */
  async createLifetimeCheckout(options?: {
    email?: string;
    name?: string;
  }): Promise<LSCheckoutResult> {
    const variantId = process.env.LEMON_LIFETIME_VARIANT_ID;
    if (!variantId) throw new Error("未设置 LEMON_LIFETIME_VARIANT_ID");
    return this.createCheckout(variantId, options);
  }

  // ==================== License 验证 ====================

  /**
   * 验证 License Key（通过 Lemon Squeezy API）
   * 在用户启动 MCP 服务时调用
   */
  async verifyLicense(licenseKey: string): Promise<LSLicenseResult> {
    const result = await this.request<any>("POST", "/licenses/validate", {
      license_key: licenseKey,
    });

    const attrs = result.data?.attributes || {};

    return {
      valid: attrs.valid === true,
      licenseKey: attrs.license_key?.license_key || licenseKey,
      activatedAt: attrs.license_key?.activation_usage?.[0]?.created_at || null,
      expiresAt: attrs.license_key?.expires_at || null,
      meta: {
        customerEmail: attrs.meta?.customer_email || "",
        customerName: attrs.meta?.customer_name || "",
        variantName: attrs.meta?.variant_name || "",
      },
    };
  }

  /**
   * 激活 License Key（绑定到当前机器）
   */
  async activateLicense(
    licenseKey: string,
    instanceName: string
  ): Promise<boolean> {
    const result = await this.request<any>("POST", "/licenses/activate", {
      license_key: licenseKey,
      instance_name: instanceName,
    });

    return result.activated === true;
  }

  /**
   * 释放 License Key（解绑机器）
   */
  async deactivateLicense(
    licenseKey: string,
    instanceId: number
  ): Promise<boolean> {
    const result = await this.request<any>("POST", "/licenses/deactivate", {
      license_key: licenseKey,
      instance_id: instanceId,
    });

    return result.deactivated === true;
  }

  // ==================== 产品信息 ====================

  /**
   * 获取产品的所有定价变体
   */
  async getVariants(productId: string): Promise<LSVariant[]> {
    const result = await this.request<any>(
      "GET",
      `/variants?filter[product_id]=${productId}`
    );

    return (result.data || []).map((item: any) => ({
      id: item.id,
      name: item.attributes.name,
      price: parseInt(item.attributes.price) / 100, // 分 → 元
      currency: item.attributes.currency,
      interval: item.attributes.interval,
      description: item.attributes.description,
    }));
  }
}

// ==================== 便利函数 ====================

/**
 * 快速验证 License Key（从环境变量读取 API Key）
 * 用于 MCP Server 启动时的 License 校验
 */
export async function verifyLicenseKey(
  licenseKey: string
): Promise<LSLicenseResult> {
  const ls = new LemonSqueezy();
  return ls.verifyLicense(licenseKey);
}

/**
 * 获取 Lemon Squeezy 配置状态
 */
export function getLemonConfigStatus(): {
  configured: boolean;
  missing: string[];
} {
  const required = [
    "LEMON_API_KEY",
    "LEMON_STORE_ID",
    "LEMON_MONTHLY_VARIANT_ID",
    "LEMON_LIFETIME_VARIANT_ID",
  ];
  const missing = required.filter((key) => !process.env[key]);

  return {
    configured: missing.length === 0,
    missing,
  };
}
