import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /** 公开：获取某篇文章已审核评论（含嵌套回复） */
  async findByPost(postId: number) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, status: "APPROVED" },
      include: {
        replies: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return comments.filter((c) => !c.parentId);
  }

  /** 公开：提交评论 */
  async create(dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException("回复的评论不存在");
    }
    return this.prisma.comment.create({
      data: {
        content: dto.content,
        nickname: dto.nickname,
        email: dto.email,
        website: dto.website,
        postId: dto.postId,
        parentId: dto.parentId,
        status: "APPROVED",
      },
    });
  }

  /** 管理端：全部评论 */
  async findAllAdmin() {
    return this.prisma.comment.findMany({
      include: { post: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 管理端：审核 */
  async updateStatus(id: number, status: string) {
    await this.prisma.comment.findUniqueOrThrow({ where: { id } });
    return this.prisma.comment.update({ where: { id }, data: { status } });
  }

  /** 管理端：删除 */
  async delete(id: number) {
    await this.prisma.comment.findUniqueOrThrow({ where: { id } });
    return this.prisma.comment.delete({ where: { id } });
  }
}
