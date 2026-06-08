import { Injectable, Logger } from "@nestjs/common";
import { playlist_detail, song_url_v1 } from "NeteaseCloudMusicApi";

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  // 简单内存缓存
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private ttl = 5 * 60 * 1000;

  private cacheGet(key: string) {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) return entry.data;
    this.cache.delete(key);
    return null;
  }

  private cacheSet(key: string, data: unknown) {
    this.cache.set(key, { data, expiry: Date.now() + this.ttl });
  }

  async getPlaylist(id: string) {
    const cacheKey = `playlist_${id}`;
    const cached = this.cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const res = await playlist_detail({ id });
      if (res.status !== 200 || !res.body) {
        this.logger.error(`歌单 ${id} API 返回异常: status=${res.status}`);
        throw new Error("歌单加载失败");
      }
      const data = res.body as { playlist?: { tracks?: Array<Record<string, unknown>> } };
      const tracks = data?.playlist?.tracks ?? [];
      if (tracks.length === 0) {
        this.logger.warn(`歌单 ${id} 返回空曲目列表`);
      }
      const mapped = tracks.map((t: Record<string, unknown>) => ({
        id: t.id as number,
        name: t.name as string,
        artist: (t.ar as Array<{ name: string }>)?.map((a) => a.name).join(" / ") || "未知",
        album: ((t.al as { name: string })?.name) ?? "",
        cover: (((t.al as { picUrl: string })?.picUrl) ?? "").replace("http://", "https://"),
      }));
      this.cacheSet(cacheKey, mapped);
      return mapped;
    } catch (err) {
      this.logger.error(`歌单 ${id} 获取失败: ${err instanceof Error ? err.message : String(err)}`);
      throw new Error("歌单加载失败，请稍后重试");
    }
  }

  async getSongUrl(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (song_url_v1 as any)({ id, level: "standard" });
      if (res.status !== 200 || !res.body) {
        this.logger.warn(`歌曲 ${id} URL API 异常`);
        return { url: null, id };
      }
      const data = res.body as { data?: Array<{ url: string | null }> };
      const url = (data?.data?.[0]?.url ?? "").replace("http://", "https://") || null;
      if (!url) this.logger.warn(`歌曲 ${id} 无播放 URL（可能无版权/VIP）`);
      return { url, id };
    } catch (err) {
      this.logger.warn(`歌曲 ${id} URL 获取失败`);
      return { url: null, id };
    }
  }
}
