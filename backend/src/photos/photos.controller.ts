import { Controller, Post, Delete, Body, Param, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { PhotosService } from "./photos.service";
import { CreatePhotoDto } from "./dto/create-photo.dto";

@Controller("photos")
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreatePhotoDto) {
    return this.photosService.create(dto);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.photosService.delete(id);
  }
}
