import { IsString, IsOptional, IsUrl, MinLength } from "class-validator";

export class CreateFriendDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
