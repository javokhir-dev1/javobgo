import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateLogDto {
  @IsOptional() @IsString()
  telegram_id?: string;

  @IsIn(['success', 'error', 'info'])
  type: 'success' | 'error' | 'info';

  @IsString()
  action: string;

  @IsString()
  message: string;

  @IsOptional() @IsString()
  user?: string;

  @IsOptional() @IsString()
  userMessage?: string;
}
