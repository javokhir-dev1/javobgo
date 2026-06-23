import { IsArray, IsString } from 'class-validator';

export class UpdateDmMessagesDto {
  @IsArray()
  @IsString({ each: true })
  messages: string[];
}
