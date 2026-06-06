import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAlbumDto } from "./dto/create-album.dto";
import { UpdateAlbumDto } from "./dto/update-album.dto";

@Injectable()
export class AlbumsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const albums = await this.prisma.album.findMany({
      include: { _count: { select: { photos: true } } },
      orderBy: { date: "desc" },
    });
    return albums.map((a) => ({
      ...a,
      photoCount: a._count.photos,
      _count: undefined,
    }));
  }

  async findOne(id: number) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: { photos: { orderBy: { createdAt: "desc" } } },
    });
    if (!album) throw new NotFoundException("相册不存在");
    return album;
  }

  async create(dto: CreateAlbumDto) {
    return this.prisma.album.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
  }

  async update(id: number, dto: UpdateAlbumDto) {
    await this.prisma.album.findUniqueOrThrow({ where: { id } });
    return this.prisma.album.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.prisma.album.findUniqueOrThrow({ where: { id } });
    return this.prisma.album.delete({ where: { id } });
  }
}
