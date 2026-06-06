import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import FormData from "form-data";

type ModerationStatus = "PASS" | "REJECT" | "NEED_REVIEW";

interface ImageHostResponse {
  code: number;
  message?: string;
  data?: {
    url: string;
    thumbUrl?: string;
    width?: number;
    height?: number;
    moderationStatus?: ModerationStatus;
  };
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly token: string;
  private readonly uploadUrl = "http://img.hgl123.icu/api/upload";

  constructor(configService: ConfigService) {
    this.token = configService.get<string>("IMG_UPLOAD_TOKEN") ?? "";
    if (!this.token) {
      this.logger.warn("IMG_UPLOAD_TOKEN not configured");
    }
  }

  async uploadToImageHost(file: Express.Multer.File) {
    if (!this.token) {
      throw new Error("图床 Token 未配置，请联系管理员");
    }

    const form = new FormData();
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    let response;
    try {
      response = await axios.post<ImageHostResponse>(this.uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          "X-Upload-Token": this.token,
        },
        timeout: 30000,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          throw new Error("图床服务不可达，请稍后重试");
        }
        if (err.response.status === 429) {
          throw new Error("上传频率过高（限流 60s/30次），请稍后重试");
        }
        if (err.response.status === 401 || err.response.status === 403) {
          throw new Error("图床鉴权失败，请联系管理员");
        }
        throw new Error(`图床请求失败: ${err.message}`);
      }
      throw err;
    }

    const body = response.data;
    if (body.code !== 0) {
      throw new Error(body.message || "图床返回异常");
    }
    if (!body.data) {
      throw new Error("图床返回数据为空");
    }

    const { moderationStatus, url, thumbUrl, width, height } = body.data;

    if (moderationStatus === "REJECT") {
      throw new Error("图片审核未通过，请更换图片");
    }

    if (moderationStatus === "NEED_REVIEW") {
      return {
        url, thumbUrl: thumbUrl ?? null,
        width: width ?? null, height: height ?? null,
        moderationStatus: "NEED_REVIEW" as const,
        message: "图片已提交，等待审核通过后展示",
      };
    }

    return {
      url, thumbUrl: thumbUrl ?? null,
      width: width ?? null, height: height ?? null,
      moderationStatus: (moderationStatus ?? "PASS") as ModerationStatus,
    };
  }
}
