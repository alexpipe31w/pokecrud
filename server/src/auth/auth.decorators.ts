import {
  ExecutionContext,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta (o un controlador entero) como accesible sin access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Jugador autenticado de la petición (lo pone JwtAuthGuard a partir del `sub` del token). */
export interface AuthPlayer {
  id: string;
}

export const CurrentPlayer = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthPlayer =>
    ctx.switchToHttp().getRequest<{ player: AuthPlayer }>().player,
);
