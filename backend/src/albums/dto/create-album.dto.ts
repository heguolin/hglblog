import { IsString, IsOptional, MinLength } from "class-validator";

export class CreateAlbumDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
