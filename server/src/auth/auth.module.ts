import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { jwtSignOptions } from './jwt.config.js';
import { LoginAttemptsService } from './login-attempts.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: jwtSignOptions(Number(config.getOrThrow('JWT_TTL'))),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginAttemptsService,
    // Guard global: toda ruta exige access token salvo las marcadas con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
