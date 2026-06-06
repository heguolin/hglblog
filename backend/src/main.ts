import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 关闭默认 bodyParser，下面手动配置
    bodyParser: false,
  });

  // 手动配置 JSON body parser，确保 UTF-8
  app.use(express.json({
    limit: "10mb",
    type: "application/json",
  }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 全局路径前缀 /api
  app.setGlobalPrefix("api");

  // CORS
  app.enableCors({
    origin: ["http://localhost:3000", "https://hgl123.icu"],
    credentials: true,
  });

  // 全局请求校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(4000);
  console.log("🚀 Blog backend running on http://localhost:4000");
}

bootstrap();
