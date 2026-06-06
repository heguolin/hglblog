import client from "./client";

export interface UploadResult {
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  moderationStatus: "PASS" | "NEED_REVIEW" | "REJECT";
  message?: string;
}

// 错误消息提取
export function getUploadErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response?: { data?: { message?: string }; status?: number } }).response;
    if (resp?.data?.message) return resp.data.message;
    if (resp?.status === 401) return "登录已过期，请重新登录";
    if (resp?.status === 413) return "文件过大";
    if (resp?.status === 502 || resp?.status === 504) return "图床服务暂不可用，请稍后重试";
  }
  if (err instanceof Error) return err.message;
  return "上传失败，请稍后重试";
}

/**
 * 本地上传图片（通过后端 /api/upload 中转到图床）
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  // 不手动设 Content-Type，让浏览器自动带 boundary
  const { data } = await client.post<UploadResult>("/upload", form, {
    timeout: 60000,
  });

  return data;
}

/**
 * 校验是否为合法图片 URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) return false;
    const ext = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
    const validExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico"];
    // 也允许无扩展名的图床直链（如 img.hgl123.icu/i/xxx）
    return validExts.includes(ext) || parsed.hostname.includes("img.hgl123.icu") || parsed.hostname.includes("picsum.photos");
  } catch {
    return false;
  }
}
