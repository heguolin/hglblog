import { Controller, Get, Query, Req, Res, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { ProxyService } from "./proxy.service";

@Controller("proxy")
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** 代理音频：流式返回，支持 Range 拖动进度 */
  @Get("audio")
  async proxyAudio(
    @Query("url") rawUrl: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = this.proxyService.validateUrl(rawUrl);
    const result = await this.proxyService.fetchStream(url, req.headers as Record<string, string>);

    if (!result.ok || !result.body) {
      return res.status(result.status || 502).json({ error: "音频加载失败" });
    }

    // 设置响应头
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Accept-Ranges", "bytes");
    if (result.contentLength) res.setHeader("Content-Length", result.contentLength);
    if (result.contentRange) res.setHeader("Content-Range", result.contentRange);
    // 禁止缓存（音频直链会过期）
    res.setHeader("Cache-Control", "no-cache");

    if (req.headers["range"]) {
      res.status(206);
    }

    // 流式写入响应
    const reader = (result.body as ReadableStream).getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    pump().catch(() => res.end());
  }

  /** 代理图片：流式返回 + 缓存 1 小时 */
  @Get("image")
  async proxyImage(
    @Query("url") rawUrl: string,
    @Res() res: Response,
  ) {
    const url = this.proxyService.validateUrl(rawUrl);
    const result = await this.proxyService.fetchStream(url, {});

    if (!result.ok || !result.body) {
      return res.status(result.status || 502).json({ error: "图片加载失败" });
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=3600"); // 缓存 1 小时
    if (result.contentLength) res.setHeader("Content-Length", result.contentLength);

    const reader = (result.body as ReadableStream).getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    pump().catch(() => res.end());
  }
}
