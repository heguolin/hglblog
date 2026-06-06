import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [posts, chatters, photos, friends, categories, tags, totalViews] = await Promise.all([
      this.prisma.post.count({ where: { published: true } }),
      this.prisma.chatter.count(),
      this.prisma.photo.count(),
      this.prisma.friend.count({ where: { approved: true } }),
      this.prisma.category.count(),
      this.prisma.tag.count(),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
    ]);

    return {
      posts,
      chatters,
      photos,
      friends,
      categories,
      tags,
      totalViews: totalViews._sum.viewCount ?? 0,
    };
  }

  async getConfig(key: string) {
    const config = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`配置项 ${key} 不存在`);
    return config;
  }

  async updateConfig(key: string, value: string) {
    return this.prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
