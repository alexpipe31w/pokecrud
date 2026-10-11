import type { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';

// `iss` y `aud` fijos: un token de otro sistema firmado por casualidad con el mismo secreto no sirve aquí.
export const JWT_ISSUER = 'pokecrud-server';
export const JWT_AUDIENCE = 'pokecrud-app';

/** Algoritmo fijado al firmar y al verificar: nunca se acepta el `alg` que traiga el propio token. */
export const jwtSignOptions = (ttlSeconds: number): JwtSignOptions => ({
  algorithm: 'HS256',
  expiresIn: ttlSeconds,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
});

export const JWT_VERIFY_OPTIONS: JwtVerifyOptions = {
  algorithms: ['HS256'],
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};
