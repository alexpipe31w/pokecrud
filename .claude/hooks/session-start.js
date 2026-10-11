// Hook SessionStart: inyecta el estado del proyecto al abrir Claude Code en este repo,
// para que ninguna IA del equipo empiece a trabajar sin saber dónde vamos.
const fs = require('fs');
const path = require('path');

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const estado = path.join(root, 'docs', 'plan', 'ESTADO.md');

let body;
try {
  body = fs.readFileSync(estado, 'utf8');
} catch (err) {
  body = `(No se pudo leer docs/plan/ESTADO.md: ${err.message}. ¿Estás en la rama develop actualizada?)`;
}

process.stdout.write(
  [
    'PROYECTO POKECRUD GO — trabajo por relevos entre 3 personas con cuentas de Claude distintas.',
    'Antes de tocar código cumple la REGLA 1 de CLAUDE.md (o usa /inicio). Al terminar, REGLA 2 (o /cierre).',
    '',
    '=== docs/plan/ESTADO.md ===',
    body,
  ].join('\n'),
);
