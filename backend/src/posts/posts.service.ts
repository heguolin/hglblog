import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { QueryPostDto } from "./dto/query-post.dto";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private readingTime(content: string): number {
    const wordsPerMinute = 200;
    const text = content.replace(/[#*`\[\]()>!\-_~\n\r]/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  async findAll(query: QueryPostDto) {
    const { page = 1, limit = 10, category, tag } = query;
    const where: Record<string, unknown> = { published: true };
    if (category) where.category = { slug: category };
    if (tag) where.tags = { some: { tag: { slug: tag } } };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: { category: true, tags: { include: { tag: true } }, author: { select: { id: true, username: true, avatar: true } } },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map((p) => ({
        ...p,
        tags: p.tags.map((pt) => pt.tag),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRecent(limit = 5) {
    const posts = await this.prisma.post.findMany({
      where: { published: true },
      include: { category: true, tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return posts.map((p) => ({ ...p, tags: p.tags.map((pt) => pt.tag) }));
  }

  /** 按数字 ID 查询（后台编辑用，不增加浏览计数） */
  async findById(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { category: true, tags: { include: { tag: true } }, author: { select: { id: true, username: true, avatar: true } } },
    });
    if (!post) throw new NotFoundException("文章不存在");
    return { ...post, tags: post.tags.map((pt) => pt.tag) };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { category: true, tags: { include: { tag: true } }, author: { select: { id: true, username: true, avatar: true } } },
    });
    if (!post) throw new NotFoundException("文章不存在");
    // 增加浏览量
    await this.prisma.post.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
    return { ...post, tags: post.tags.map((pt) => pt.tag), viewCount: post.viewCount + 1 };
  }

  async create(dto: CreatePostDto, authorId: number) {
    const { tagIds, ...data } = dto;
    return this.prisma.post.create({
      data: {
        ...data,
        readingTime: this.readingTime(data.content),
        authorId,
        tags: tagIds ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async update(id: number, dto: UpdatePostDto) {
    const { tagIds, ...data } = dto;
    const updateData: Record<string, unknown> = { ...data };
    if (data.content) updateData.readingTime = this.readingTime(data.content);

    // 如果传了 tagIds，先删后建
    if (tagIds !== undefined) {
      await this.prisma.postTag.deleteMany({ where: { postId: id } });
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...updateData,
        tags: tagIds !== undefined ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async delete(id: number) {
    await this.prisma.post.findUniqueOrThrow({ where: { id } });
    return this.prisma.post.delete({ where: { id } });
  }
}
