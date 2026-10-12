// Genera el APK de depuración (F0-09, ARQUITECTURA §11).
//
//   npm run apk                      → APK de producción (habla con Render)
//   npm run apk -- device            → APK de desarrollo contra el servidor Nest de ESTE PC (http://<IP-LAN>:3000)
//   npm run apk -- <config> --install → además lo instala con adb en el móvil conectado
//
// `device`: la IP se detecta sola (o DEVICE_SERVER_URL=http://192.168.1.50:3000 para forzarla) y se escribe en
// src/environments/environment.device.ts (gitignored). El móvil y el PC tienen que estar en la misma red.
//
// JDK: Gradle 8.14 (el de Capacitor 8) corre con Java 17-24. Se usa JAVA_HOME si es compatible; si no, el primer
// JDK 21 instalado, y si no el `jbr` de Android Studio (ojo: en versiones recientes trae Java 25, que NO sirve).

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const install = args.includes('--install');
const config = args.find((a) => !a.startsWith('--')) ?? 'production';
const isWindows = process.platform === 'win32';
const APK = 'android/app/build/outputs/apk/debug/app-debug.apk';

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\n▶ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: isWindows, ...opts });
  if (r.status !== 0) {
    console.error(`✖ Falló: ${cmd} ${cmdArgs.join(' ')} (código ${r.status ?? r.error?.message})`);
    process.exit(r.status || 1);
  }
}

/** Versión mayor de un JDK leyendo su archivo `release` (JAVA_VERSION="21.0.12"). */
function jdkMajor(home) {
  try {
    const m = /JAVA_VERSION="(\d+)/.exec(readFileSync(join(home, 'release'), 'utf8'));
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
const compatible = (home) => {
  const v = jdkMajor(home);
  return v !== null && v >= 17 && v <= 24;
};

function findJdk() {
  if (process.env.JAVA_HOME && compatible(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const roots = isWindows
    ? [
        'C:/Program Files/Microsoft',
        'C:/Program Files/Eclipse Adoptium',
        'C:/Program Files/Java',
        'C:/Program Files/Zulu',
      ]
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];
  const candidates = roots
    .filter(existsSync)
    .flatMap((root) => readdirSync(root).map((d) => join(root, d)))
    .flatMap((d) => [d, join(d, 'Contents/Home')]) // macOS
    .filter(compatible)
    .sort((a, b) => (jdkMajor(a) === 21 ? -1 : 0) - (jdkMajor(b) === 21 ? -1 : 0));
  const jbr = isWindows
    ? 'C:/Program Files/Android/Android Studio/jbr'
    : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  if (compatible(jbr)) candidates.push(jbr);
  if (!candidates.length) {
    console.error(
      `✖ No hay un JDK 17-24 (Gradle 8.14 no corre con Java 25+). JAVA_HOME=${process.env.JAVA_HOME ?? '—'}, ` +
        `jbr de Android Studio = Java ${jdkMajor(jbr) ?? '?'}.\n  Instala uno: winget install Microsoft.OpenJDK.21`,
    );
    process.exit(1);
  }
  return candidates[0];
}

function androidSdk() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  const sdk = isWindows
    ? join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk')
    : join(process.env.HOME ?? '', 'Library/Android/sdk');
  return existsSync(sdk) ? sdk : undefined;
}

/** IPv4 de la red local (Wi-Fi/Ethernet), descartando adaptadores virtuales típicos. */
function lanIp() {
  const virtual = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|docker|Bluetooth/i;
  const ips = Object.entries(networkInterfaces())
    .filter(([name]) => !virtual.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  return (
    ips.find((ip) => ip.startsWith('192.168.')) ??
    ips.find((ip) => /^(10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) ??
    ips[0]
  );
}

const env = { ...process.env };
if (config === 'device') {
  const url = process.env.DEVICE_SERVER_URL ?? (lanIp() && `http://${lanIp()}:3000`);
  if (!url) {
    console.error(
      '✖ No encuentro la IP de la red local. Pásala: DEVICE_SERVER_URL=http://<IP>:3000 npm run apk -- device',
    );
    process.exit(1);
  }
  writeFileSync(
    'src/environments/environment.device.ts',
    `// GENERADO por scripts/apk.mjs (npm run apk -- device). No se sube: cada PC tiene su IP.\n\n` +
      `export const environment = {\n  production: false,\n  pokeApiUrl: 'https://pokeapi.co/api/v2',\n` +
      `  /** Servidor Nest de este PC visto desde el móvil (misma red Wi-Fi). */\n  serverUrl: '${url}',\n};\n`,
  );
  env.CAP_DEV = '1'; // capacitor.config.ts: HTTP plano + contenido mixto, solo en este APK
  console.log(`APK de desarrollo → ${url} (arranca el servidor: cd server && npm run start:dev)`);
}

const javaHome = findJdk();
const sdk = androidSdk();
env.JAVA_HOME = javaHome;
if (sdk) env.ANDROID_HOME = sdk;
console.log(`JDK ${jdkMajor(javaHome)}: ${javaHome}${sdk ? `\nSDK: ${sdk}` : ''}`);

run('node', ['scripts/ensure-local-env.mjs'], { env });
run('node', ['scripts/clean-shared-artifacts.mjs'], { env });
run('npx', ['ng', 'build', '--configuration', config], { env });
run('npx', ['cap', 'sync', 'android'], { env });
// Ruta explícita: el cmd que abre Node no busca .bat en la carpeta actual.
run(isWindows ? '.\\gradlew.bat' : './gradlew', ['assembleDebug', '--console=plain'], {
  env,
  cwd: 'android',
});

const mb = (statSync(APK).size / 1024 / 1024).toFixed(2);
console.log(`\n✔ APK (${config}): ${APK} · ${mb} MB`);

if (install) {
  const adb = sdk ? join(sdk, 'platform-tools', isWindows ? 'adb.exe' : 'adb') : 'adb';
  run(adb, ['install', '-r', APK], { shell: false });
  console.log('✔ Instalado. Depurar el WebView: chrome://inspect en el PC.');
}
