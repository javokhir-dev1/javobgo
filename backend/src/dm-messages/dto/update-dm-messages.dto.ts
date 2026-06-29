import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DmMessageItemDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  buttonText?: string;

  @IsOptional()
  @IsString()
  buttonUrl?: string;
}

export class UpdateDmMessagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmMessageItemDto)
  messages: DmMessageItemDto[];
}
