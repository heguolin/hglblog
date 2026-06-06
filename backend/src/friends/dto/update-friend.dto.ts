import { IsBoolean, IsOptional } from "class-validator";

export class UpdateFriendDto {
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}
