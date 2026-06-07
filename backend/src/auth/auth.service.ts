import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import axios from "axios";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
      },
    };
  }

  /** GitHub OAuth: 用 code 换 token → 获取用户信息 → 返回 */
  async githubAuth(code: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || "http://localhost:3000/auth/github/callback";

    // 1. code 换 access_token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
      { headers: { Accept: "application/json" } },
    );
    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new UnauthorizedException("GitHub 授权失败");

    // 2. 获取用户信息
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      token: accessToken,
      nickname: userRes.data.login,
      avatar: userRes.data.avatar_url,
      githubId: userRes.data.id,
    };
  }

  async updateProfile(userId: number, data: { avatar?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, avatar: true },
    });
    return updated;
  }
}
