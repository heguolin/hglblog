import { Module } from "@nestjs/common";
import { SiteController } from "./site.controller";
import { SiteService } from "./site.service";
import { ImageHostService } from "./image-host.service";

@Module({
  controllers: [SiteController],
  providers: [SiteService, ImageHostService],
})
export class SiteModule {}
