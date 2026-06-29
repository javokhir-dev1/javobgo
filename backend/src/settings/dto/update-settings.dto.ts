import { IsBoolean, IsOptional, IsString, IsNumber, IsIn } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean()
  dmAutoReplyEnabled?: boolean;

  @IsOptional() @IsString() @IsIn(['template', 'ai'])
  dmMode?: string;

  @IsOptional() @IsNumber()
  dmAgentId?: number;
}
