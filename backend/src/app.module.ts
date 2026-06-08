import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PostsModule } from "./posts/posts.module";
import { ChattersModule } from "./chatters/chatters.module";
import { AlbumsModule } from "./albums/albums.module";
import { PhotosModule } from "./photos/photos.module";
import { FriendsModule } from "./friends/friends.module";
import { SiteModule } from "./site/site.module";
import { CategoriesModule } from "./categories/categories.module";
import { TagsModule } from "./tags/tags.module";
import { UploadModule } from "./upload/upload.module";
import { CommentsModule } from "./comments/comments.module";
import { MusicModule } from "./music/music.module";
import { SystemModule } from "./system/system.module";
import { ProxyModule } from "./proxy/proxy.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PostsModule,
    ChattersModule,
    AlbumsModule,
    PhotosModule,
    FriendsModule,
    SiteModule,
    CategoriesModule,
    TagsModule,
    UploadModule,
    CommentsModule,
    MusicModule,
    SystemModule,
    ProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
