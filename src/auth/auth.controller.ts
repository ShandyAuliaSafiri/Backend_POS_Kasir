import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, LoginAuthDto } from './dto/create-auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() createAuthDto: CreateAuthDto) {
    try {
      const user = await this.authService.signup(createAuthDto);
      return { message: 'User berhasil dibuat', user };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @Post('login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    try {
      const result = await this.authService.login(loginAuthDto);
      return result;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
