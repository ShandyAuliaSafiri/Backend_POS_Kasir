import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

class CreateAuthDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}

class LoginAuthDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export { CreateAuthDto, LoginAuthDto };
