// Hook Stop: si hay trabajo sin guardar (cambios sin commit o commits sin push) y el último
// guardado es de hace más de GUARD_MINUTES, obliga a la IA a hacer /guardar antes de parar.
// Motivo: cuando se acaban los tokens de Claude Pro la sesión se corta de golpe y lo no
// pusheado se pierde para el siguiente compañero.
const { execSync } = require('child_process');

const GUARD_MINUTES = 20;

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let payload = {};
  try {
    payload = JSON.parse(input || '{}');
  } catch {
    /* sin payload: se evalúa igual */
  }
  // Evita bucles: si ya estamos continuando por este mismo hook, no volver a bloquear.
  if (payload.stop_hook_active) return process.exit(0);

  const branch = git('rev-parse --abbrev-ref HEAD');
  if (!branch || branch === 'HEAD') return process.exit(0);

  // Cambios rastreados sin commit (los no rastreados de docs/evidencias no cuentan).
  const dirty = (git('status --porcelain --untracked-files=no') || '').length > 0;
  const unpushed = Number(git('rev-list --count @{u}..HEAD') || (git('rev-parse --abbrev-ref @{u}') ? 0 : 1));
  if (!dirty && unpushed === 0) return process.exit(0);

  const lastCommit = Number(git('log -1 --format=%ct') || 0);
  const minutes = lastCommit ? (Date.now() / 1000 - lastCommit) / 60 : Infinity;
  if (minutes < GUARD_MINUTES) return process.exit(0);

  const what = [dirty ? 'cambios sin commit' : null, unpushed ? `${unpushed} commit(s) sin push` : null]
    .filter(Boolean)
    .join(' y ');
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `Punto de guardado obligatorio: hay ${what} en la rama ${branch} y el último commit es de hace ` +
        `${Math.round(minutes)} min. Haz ahora lo que dice .claude/commands/guardar.md (commit —WIP si no ` +
        `compila—, actualizar "En curso" de docs/plan/ESTADO.md con el paso exacto y push). Si se acaban los ` +
        `tokens, el compañero siguiente solo verá lo que esté pusheado.`,
    }),
  );
  process.exit(0);
});
