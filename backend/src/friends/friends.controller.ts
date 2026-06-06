import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { FriendsService } from "./friends.service";
import { CreateFriendDto } from "./dto/create-friend.dto";
import { UpdateFriendDto } from "./dto/update-friend.dto";

@Controller("friends")
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // ========== 公开接口 ==========
  @Get()
  findAll() {
    return this.friendsService.findAll();
  }

  @Post("apply")
  apply(@Body() dto: CreateFriendDto) {
    return this.friendsService.apply(dto);
  }

  // ========== 需 ADMIN 认证 ==========
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Get("admin")
  findAllAdmin() {
    return this.friendsService.findAllAdmin();
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateFriendDto) {
    return this.friendsService.update(id, dto);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.friendsService.delete(id);
  }
}
