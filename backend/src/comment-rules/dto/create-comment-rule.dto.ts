import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class CreateCommentRuleDto {
  @IsString()
  postId: string;

  @IsOptional() @IsString()
  postCaption?: string;

  @IsOptional() @IsString()
  postThumbnail?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  replyEnabled?: boolean;

  @IsOptional() @IsArray()
  replyTemplates?: string[];

  @IsOptional() @IsBoolean()
  keywordsEnabled?: boolean;

  @IsOptional() @IsArray()
  keywords?: string[];

  @IsOptional() @IsBoolean()
  dmEnabled?: boolean;

  @IsOptional() @IsArray()
  dmTemplates?: string[];
}
