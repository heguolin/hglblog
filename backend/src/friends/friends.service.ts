import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFriendDto } from "./dto/create-friend.dto";
import { UpdateFriendDto } from "./dto/update-friend.dto";

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  // 公开：只返回已通过的友链
  async findAll() {
    return this.prisma.friend.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // 公开：任何人可申请友链（默认未审核）
  async apply(dto: CreateFriendDto) {
    return this.prisma.friend.create({ data: { ...dto, approved: false } });
  }

  // ADMIN：查看全部友链（含待审核）
  async findAllAdmin() {
    return this.prisma.friend.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  // ADMIN：审核/更新友链
  async update(id: number, dto: UpdateFriendDto) {
    await this.prisma.friend.findUniqueOrThrow({ where: { id } });
    return this.prisma.friend.update({ where: { id }, data: dto });
  }

  // ADMIN：删除友链
  async delete(id: number) {
    await this.prisma.friend.findUniqueOrThrow({ where: { id } });
    return this.prisma.friend.delete({ where: { id } });
  }
}
