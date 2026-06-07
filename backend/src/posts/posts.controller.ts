import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { QueryPostDto } from "./dto/query-post.dto";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ========== 公开接口 ==========
  @Get()
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query);
  }

  @Get("recent")
  findRecent(@Query("limit") limit?: string) {
    return this.postsService.findRecent(limit ? parseInt(limit, 10) : 5);
  }

  /** 按数字 ID 查询单篇（后台编辑用） */
  @Get("id/:id")
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.postsService.findById(id);
  }

  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.postsService.findBySlug(slug);
  }

  // ========== 需 ADMIN 认证 ==========
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreatePostDto, @CurrentUser("id") authorId: number) {
    return this.postsService.create(dto, authorId);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.postsService.delete(id);
  }
}
