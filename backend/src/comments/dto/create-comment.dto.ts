import { IsString, IsOptional, IsEmail, MaxLength, MinLength, IsInt } from "class-validator";

export class CreateCommentDto {
  @IsInt()
  postId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
