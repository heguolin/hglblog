import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, HttpException, HttpStatus, Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UploadService } from "./upload.service";

@Controller("upload")
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } })) // 10MB
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException("未选择文件", HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`收到上传: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

    try {
      const result = await this.uploadService.uploadToImageHost(file);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      this.logger.error(`上传失败: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }
}
