import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RagService } from "../rag/rag.service";
import { CreateChatterDto } from "./dto/create-chatter.dto";

@Injectable()
export class ChattersService {
  constructor(
    private prisma: PrismaService,
    private rag: RagService,
  ) {}

  async findAll(tag?: string) {
    const where: Record<string, unknown> = {};
    if (tag && tag !== "全部") {
      where.tags = { has: tag };
    }

    const [chatters, total] = await Promise.all([
      this.prisma.chatter.findMany({
        where,
        include: { author: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.chatter.count({ where }),
    ]);

    // 收集所有标签
    const allChatters = await this.prisma.chatter.findMany({ select: { tags: true } });
    const allTags = [...new Set(allChatters.flatMap((c) => c.tags))];

    return { chatters, total, allTags };
  }

  async findOne(id: number) {
    const chatter = await this.prisma.chatter.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true, avatar: true } } },
    });
    if (!chatter) throw new NotFoundException("杂谈不存在");
    return chatter;
  }

  async create(dto: CreateChatterDto, authorId: number) {
    const chatter = await this.prisma.chatter.create({
      data: { ...dto, authorId },
      include: { author: { select: { id: true, username: true, avatar: true } } },
    });
    this.rag.reindex("chatter", chatter.id);
    return chatter;
  }

  async delete(id: number) {
    await this.prisma.chatter.findUniqueOrThrow({ where: { id } });
    const chatter = await this.prisma.chatter.delete({ where: { id } });
    this.rag.reindex("chatter", id);
    return chatter;
  }
}
