import { Controller, Post, Get, Put, Body, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  /** GitHub OAuth 登录入口 */
  @Get("github")
  githubLogin(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || "http://localhost:3000/auth/github/callback";
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
    res.redirect(url);
  }

  /** GitHub OAuth 回调 */
  @Get("github/callback")
  async githubCallback(@Query("code") code: string) {
    return this.authService.githubAuth(code);
  }

  /** 更新当前用户头像 */
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @Put("profile")
  async updateProfile(
    @CurrentUser("id") userId: number,
    @Body() body: { avatar?: string },
  ) {
    return this.authService.updateProfile(userId, { avatar: body.avatar });
  }
}
