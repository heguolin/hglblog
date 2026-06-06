import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { ChattersService } from "./chatters.service";
import { CreateChatterDto } from "./dto/create-chatter.dto";

@Controller("chatters")
export class ChattersController {
  constructor(private readonly chattersService: ChattersService) {}

  // ========== 公开接口 ==========
  @Get()
  findAll(@Query("tag") tag?: string) {
    return this.chattersService.findAll(tag);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.chattersService.findOne(id);
  }

  // ========== 需 ADMIN 认证 ==========
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateChatterDto, @CurrentUser("id") authorId: number) {
    return this.chattersService.create(dto, authorId);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.chattersService.delete(id);
  }
}
