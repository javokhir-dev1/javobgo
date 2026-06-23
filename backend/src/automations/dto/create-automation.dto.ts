import { IsString, IsBoolean, IsArray, IsIn, IsOptional, IsNumber } from 'class-validator';

export class CreateAutomationDto {
  @IsString()
  name: string;

  @IsIn(['any', 'keyword'])
  triggerType: 'any' | 'keyword';

  @IsArray()
  keywords: string[];

  @IsBoolean()
  replyEnabled: boolean;

  @IsArray()
  replyTemplates: string[];

  @IsBoolean()
  dmEnabled: boolean;

  @IsArray()
  dmTemplates: string[];

  @IsIn(['all', 'specific'])
  postScope: 'all' | 'specific';

  @IsArray()
  postIds: string[];

  @IsArray()
  postData: { id: string; caption?: string; thumbnail?: string }[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsNumber()
  replyAgentId?: number | null;

  @IsOptional() @IsNumber()
  dmAgentId?: number | null;
}
