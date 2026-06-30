import { IsString, IsOptional } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsString()
  systemPrompt: string;

  @IsOptional() @IsString()
  emoji?: string;
}
