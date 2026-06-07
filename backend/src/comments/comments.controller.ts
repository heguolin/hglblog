import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** 公开：获取某篇文章已审核评论 */
  @Get()
  findByPost(@Query("postId", ParseIntPipe) postId: number) {
    return this.commentsService.findByPost(postId);
  }

  /** 公开：提交评论 */
  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.commentsService.create(dto);
  }

  /** 管理端：全部评论列表 */
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Get("admin")
  findAllAdmin() {
    return this.commentsService.findAllAdmin();
  }

  /** 管理端：审核通过/拒绝 */
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Patch("admin/:id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body("status") status: string) {
    return this.commentsService.updateStatus(id, status);
  }

  /** 管理端：删除 */
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Delete("admin/:id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.commentsService.delete(id);
  }
}
