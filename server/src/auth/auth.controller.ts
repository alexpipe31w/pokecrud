import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthPlayer } from './auth.decorators.js';
import { CurrentPlayer, Public } from './auth.decorators.js';
import { LoginDto, RefreshTokenDto, RegisterDto } from './auth.dto.js';
import {
  AuthResult,
  AuthService,
  PublicPlayer,
  Tokens,
} from './auth.service.js';

const STRICT = { default: { limit: 5, ttl: 60_000 } }; // registro y login: 5/min por IP
const SESSION = { default: { limit: 20, ttl: 60_000 } }; // refresh y logout: 20/min por IP

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(SESSION)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<Tokens> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle(SESSION)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentPlayer() player: AuthPlayer): Promise<{ player: PublicPlayer }> {
    return this.auth.me(player.id);
  }
}
