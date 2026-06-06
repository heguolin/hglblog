import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePhotoDto } from "./dto/create-photo.dto";

@Injectable()
export class PhotosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePhotoDto) {
    // 验证相册存在
    await this.prisma.album.findUniqueOrThrow({ where: { id: dto.albumId } });
    return this.prisma.photo.create({ data: dto });
  }

  async delete(id: number) {
    await this.prisma.photo.findUniqueOrThrow({ where: { id } });
    return this.prisma.photo.delete({ where: { id } });
  }
}
