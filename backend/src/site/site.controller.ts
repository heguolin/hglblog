import { Controller, Get, Put, Body, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SiteService } from "./site.service";
import { ImageHostService } from "./image-host.service";

@Controller("site")
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly imageHostService: ImageHostService,
  ) {}

  // ========== 公开接口 ==========
  @Get("stats")
  getStats() {
    return this.siteService.getStats();
  }

  @Get("config/:key")
  getConfig(@Param("key") key: string) {
    return this.siteService.getConfig(key);
  }

  /** 背景图片列表 —— 公开，供前端轮播 */
  @Get("background-images")
  async getBackgroundImages() {
    const urls = await this.imageHostService.getBackgroundImages();
    return { images: urls };
  }

  // ========== 需 ADMIN 认证 ==========
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Put("config/:key")
  updateConfig(@Param("key") key: string, @Body("value") value: string) {
    return this.siteService.updateConfig(key, value);
  }
}
