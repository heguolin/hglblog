import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AlbumsService } from "./albums.service";
import { CreateAlbumDto } from "./dto/create-album.dto";
import { UpdateAlbumDto } from "./dto/update-album.dto";

@Controller("albums")
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  // ========== 公开接口 ==========
  @Get()
  findAll() {
    return this.albumsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.albumsService.findOne(id);
  }

  // ========== 需 ADMIN 认证 ==========
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateAlbumDto) {
    return this.albumsService.create(dto);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAlbumDto) {
    return this.albumsService.update(id, dto);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.albumsService.delete(id);
  }
}
