import { IsString, IsOptional, IsBoolean, IsInt, IsArray, MinLength } from "class-validator";

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  slug: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
