import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

interface ImageItem {
  url: string;
  thumbUrl?: string;
  moderationStatus?: string;
}

interface ListResponse {
  code: number;
  data?: ImageItem[]; // /api/list 返回 data 直接是数组
}

@Injectable()
export class ImageHostService {
  private readonly logger = new Logger(ImageHostService.name);
  private readonly baseUrl = "https://img.hgl123.icu";
  private readonly uploadToken: string;
  private readonly username: string;
  private readonly password: string;

  // JWT 缓存
  private cachedJwt: string | null = null;
  private jwtExpiry = 0;

  // 图片列表缓存
  private cachedImageUrls: string[] | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 分钟

  constructor(configService: ConfigService) {
    this.uploadToken = configService.get<string>("IMG_UPLOAD_TOKEN") ?? "";
    this.username = configService.get<string>("IMG_USERNAME") ?? "";
    this.password = configService.get<string>("IMG_PASSWORD") ?? "";
  }

  /** ========== 获取背景图片列表（公开接口调用） ========== */
  async getBackgroundImages(): Promise<string[]> {
    // 命中缓存
    if (this.cachedImageUrls && Date.now() < this.cacheExpiry) {
      this.logger.log(`缓存命中: ${this.cachedImageUrls.length} 张`);
      return this.cachedImageUrls;
    }

    try {
      const urls = await this.fetchImageList();
      this.cachedImageUrls = urls;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      this.logger.log(`缓存更新: ${urls.length} 张, 过期于 ${new Date(this.cacheExpiry).toISOString()}`);
      return urls;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`获取背景图片失败: ${msg}`);
      // 如果有旧缓存，过期后仍可短暂兜底
      if (this.cachedImageUrls) {
        this.logger.log("使用过期缓存兜底");
        return this.cachedImageUrls;
      }
      return [];
    }
  }

  /** ========== 调图床 API 列表 ========== */
  private async fetchImageList(): Promise<string[]> {
    // 方案 A：X-Upload-Token（与上传接口一致）
    let urls = await this.tryListWithHeader({ "X-Upload-Token": this.uploadToken });
    if (urls !== null) return urls;

    // 方案 B：JWT（verifyJWT 鉴权）
    this.logger.log("X-Upload-Token 无效，尝试 JWT 鉴权");
    urls = await this.tryListWithJwt();
    if (urls !== null) return urls;

    throw new Error("图床图片列表获取失败（所有鉴权方式均无效）");
  }

  /** 尝试用自定义 header 鉴权 */
  private async tryListWithHeader(headers: Record<string, string>): Promise<string[] | null> {
    try {
      const res = await axios.get<ListResponse>(`${this.baseUrl}/api/list`, {
        headers,
        timeout: 15000,
        params: { page: 1, limit: 50 },
      });
      return this.parseImageList(res.data);
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        return null; // 鉴权失败，返回 null 让调用方尝试下一种
      }
      this.logger.warn(`X-Upload-Token 请求失败: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  /** 尝试用 JWT 鉴权 */
  private async tryListWithJwt(): Promise<string[] | null> {
    try {
      const jwt = await this.getJwt();
      if (!jwt) {
        this.logger.warn("无法获取图床 JWT（IMG_USERNAME/IMG_PASSWORD 未配置？）");
        return null;
      }
      const res = await axios.get<ListResponse>(`${this.baseUrl}/api/list`, {
        headers: { Authorization: `Bearer ${jwt}` },
        timeout: 15000,
        params: { page: 1, limit: 50 },
      });
      return this.parseImageList(res.data);
    } catch (err) {
      this.logger.warn(`JWT 请求失败: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  /** 获取 JWT（缓存复用） */
  private async getJwt(): Promise<string | null> {
    if (this.cachedJwt && Date.now() < this.jwtExpiry) {
      return this.cachedJwt;
    }
    if (!this.username || !this.password || this.password === "your-image-host-password") {
      this.logger.warn("IMG_USERNAME/IMG_PASSWORD 未配置，跳过 JWT 登录");
      return null;
    }
    try {
      const res = await axios.post<{ code: number; data?: { jwt?: string; token?: string } }>(
        `${this.baseUrl}/api/auth/login`,
        { username: this.username, password: this.password },
        { timeout: 10000 },
      );
      // 图床返回格式: { code:0, data:{ jwt:"...", ... } }
      const token = res.data.data?.jwt || res.data.data?.token || "";
      if (token) {
        this.cachedJwt = token;
        this.jwtExpiry = Date.now() + 55 * 60 * 1000; // 55分钟后过期
        this.logger.log("图床 JWT 已获取并缓存");
      }
      return token || null;
    } catch (err) {
      this.logger.error(`图床登录失败: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  /** 解析图片列表响应 */
  private parseImageList(data: ListResponse): string[] | null {
    if (data.code !== 0) return null;
    // /api/list 返回 data 直接是数组 [{url, thumbUrl, moderationStatus, ...}]
    const items = Array.isArray(data.data) ? data.data : [];
    if (items.length === 0) return null;
    return items
      .filter((img) => !img.moderationStatus || img.moderationStatus === "PASS")
      .map((img) => img.url)  // 原图
      .filter(Boolean);
  }
}
