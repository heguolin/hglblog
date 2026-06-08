import { Injectable, BadRequestException, Logger } from "@nestjs/common";

// 域名白名单：只允许代理网易云 CDN 资源，防止 SSRF
const ALLOWED_HOSTS = [
  "music.126.net",
  "music.163.com",
  ".music.126.net",
  ".music.163.com",
];

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  validateUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException("无效的 URL");
    }
    const host = url.hostname;
    const allowed = ALLOWED_HOSTS.some(
      (h) => host === h || (h.startsWith(".") && host.endsWith(h)),
    );
    if (!allowed) {
      this.logger.warn(`拒绝代理非白名单域名: ${host}`);
      throw new BadRequestException("不允许代理该域名");
    }
    return url;
  }

  async fetchStream(url: URL, reqHeaders: Record<string, string>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时

    try {
      const headers: Record<string, string> = {
        Referer: "https://music.163.com/",
      };
      // 透传 Range 头以支持音频拖动
      if (reqHeaders["range"]) {
        headers["Range"] = reqHeaders["range"];
      }

      const res = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
        redirect: "follow",
      });

      return {
        ok: res.ok,
        status: res.status,
        headers: res.headers,
        body: res.body,
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
        contentLength: res.headers.get("content-length"),
        contentRange: res.headers.get("content-range"),
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new BadRequestException("上游请求超时");
      }
      throw new BadRequestException("代理请求失败");
    } finally {
      clearTimeout(timeout);
    }
  }
}
