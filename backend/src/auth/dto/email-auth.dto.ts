import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'invalid_email' })
  @MaxLength(190, { message: 'invalid_email' })
  email: string;

  @IsString({ message: 'weak_password' })
  @MinLength(8, { message: 'weak_password' })
  @MaxLength(128, { message: 'weak_password' })
  password: string;

  @IsString({ message: 'invalid_name' })
  @MinLength(2, { message: 'invalid_name' })
  @MaxLength(64, { message: 'invalid_name' })
  first_name: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'invalid_credentials' })
  @MaxLength(190, { message: 'invalid_credentials' })
  email: string;

  @IsString({ message: 'invalid_credentials' })
  @MinLength(1, { message: 'invalid_credentials' })
  @MaxLength(128, { message: 'invalid_credentials' })
  password: string;
}
