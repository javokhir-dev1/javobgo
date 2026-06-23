import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean()
  dmAutoReplyEnabled?: boolean;
}
