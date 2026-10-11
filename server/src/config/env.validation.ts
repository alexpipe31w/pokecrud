/**
 * Valida las variables de entorno al arrancar. Si falta algo crítico el servidor no arranca: es mejor
 * un despliegue fallido que un servidor corriendo con un secreto vacío o débil.
 */
export function validateEnv(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];

  if (!raw['DATABASE_URL']) errors.push('DATABASE_URL es obligatoria');

  const secret = typeof raw['JWT_SECRET'] === 'string' ? raw['JWT_SECRET'] : '';
  if (secret.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres aleatorios');
  }

  const jwtTtl = Number(raw['JWT_TTL'] ?? 900);
  if (!Number.isInteger(jwtTtl) || jwtTtl < 60 || jwtTtl > 3600) {
    errors.push('JWT_TTL debe ser un entero de 60 a 3600 segundos');
  }

  const refreshDays = Number(raw['REFRESH_TTL_DAYS'] ?? 30);
  if (!Number.isInteger(refreshDays) || refreshDays < 1 || refreshDays > 90) {
    errors.push('REFRESH_TTL_DAYS debe ser un entero de 1 a 90');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida (ver server/.env.example): ${errors.join('; ')}`,
    );
  }
  return { ...raw, JWT_TTL: jwtTtl, REFRESH_TTL_DAYS: refreshDays };
}
