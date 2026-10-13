/** Orígenes permitidos (HTTP y socket `/pvp`). `https://localhost` es la app dentro del APK (Capacitor). */
export function corsOrigins(): string[] {
  return (
    process.env['CORS_ORIGINS'] ??
    'http://localhost:8100,http://localhost:4200,https://localhost'
  )
    .split(',')
    .map((s) => s.trim());
}
