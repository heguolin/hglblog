import { IsString, IsOptional, IsInt } from "class-validator";

export class CreatePhotoDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsInt()
  albumId: number;
}
