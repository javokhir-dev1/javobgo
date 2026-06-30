import { IsBoolean, IsOptional, IsString, IsNumber, IsIn, IsArray } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean()
  dmAutoReplyEnabled?: boolean;

  @IsOptional() @IsString() @IsIn(['template', 'ai'])
  dmMode?: string;

  @IsOptional() @IsNumber()
  dmAgentId?: number;

  @IsOptional() @IsArray()
  dmButtons?: { title: string; url: string }[];
}
