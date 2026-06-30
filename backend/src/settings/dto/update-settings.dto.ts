import { IsBoolean, IsOptional, IsString, IsNumber, IsIn, IsArray, ValidateIf } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean()
  dmAutoReplyEnabled?: boolean;

  @IsOptional() @IsString() @IsIn(['template', 'ai'])
  dmMode?: string;

  @IsOptional()
  @ValidateIf(o => o.dmAgentId !== null)
  @IsNumber()
  dmAgentId?: number | null;

  @IsOptional() @IsArray()
  dmButtons?: { title: string; url: string }[];
}
