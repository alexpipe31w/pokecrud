import * as THREE from 'three';

/**
 * Orientación del móvil → cámara three.js para la AR por giroscopio (F2-01; la usarán el encuentro F2-04 y el
 * combate F4-07). Escena: Y arriba, −Z = hacia donde miraba el móvil al empezar (o el norte, con la brújula), en
 * metros, con la cámara en el origen. Solo orientación (3 grados de libertad): si el jugador camina, el Pokémon
 * no se queda en su sitio, como en el "AR clásico" de Pokémon GO.
 *
 * El marco de la cámara three.js (X derecha, Y arriba, mira a −Z) coincide con el del móvil en vertical (X derecha,
 * Y hacia la parte de arriba, Z saliendo de la pantalla): la cámara trasera mira a −Z del móvil.
 */

const DEG = Math.PI / 180;
/** Del marco este-norte-arriba de los sensores al de la escena (Y arriba, −Z norte): −90° sobre X. */
const ENU_TO_SCENE = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  -Math.PI / 2,
);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Temporales reutilizados: se llaman en cada fotograma y no deben crear basura.
const euler = new THREE.Euler();
const screenTurn = new THREE.Quaternion();
const sensor = new THREE.Quaternion();
const fwd = new THREE.Vector3();
const top = new THREE.Vector3();

/**
 * Cuaternión de la cámara a partir del evento `deviceorientation` (alpha, beta, gamma en grados, orden intrínseco
 * Z-X'-Y'' de la especificación) y del giro de la pantalla (`screen.orientation.angle`, grados).
 */
export function deviceEventQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  screenDeg: number,
  out = new THREE.Quaternion(),
): THREE.Quaternion {
  // En la escena, Z del marco de los sensores es Y y su Y (norte) es −Z: Rz(α)·Rx(β)·Ry(γ) → Ry(α)·Rx(β)·Rz(−γ).
  euler.set(beta * DEG, alpha * DEG, -gamma * DEG, 'YXZ');
  return out
    .setFromEuler(euler)
    .multiply(ENU_TO_SCENE)
    .multiply(screenTurn.setFromAxisAngle(AXIS_Z, -screenDeg * DEG));
}

/**
 * Lo mismo a partir de `RelativeOrientationSensor`/`AbsoluteOrientationSensor` (`referenceFrame: 'device'`), que dan
 * directamente el cuaternión [x, y, z, w] del móvil en el marco este-norte-arriba.
 */
export function sensorQuaternion(
  q: ArrayLike<number>,
  screenDeg: number,
  out = new THREE.Quaternion(),
): THREE.Quaternion {
  return out
    .copy(ENU_TO_SCENE)
    .multiply(sensor.set(q[0], q[1], q[2], q[3]))
    .multiply(screenTurn.setFromAxisAngle(AXIS_Z, -screenDeg * DEG));
}

/**
 * Rumbo de la cámara sobre el suelo, en radianes: 0 mirando a −Z y creciendo hacia −X (contrario a las agujas visto
 * desde arriba, como `alpha`). No depende de si el móvil apunta arriba o abajo ni de cómo se ladee en vertical; con
 * el móvil tumbado cuenta hacia dónde apunta su parte de arriba (se mezclan "adelante" y "arriba" según la
 * inclinación, sin saltos).
 */
export function cameraYaw(q: THREE.Quaternion): number {
  fwd.set(0, 0, -1).applyQuaternion(q);
  top.set(0, 1, 0).applyQuaternion(q);
  const hx = fwd.x - top.x * fwd.y;
  const hz = fwd.z - top.z * fwd.y;
  if (Math.hypot(hx, hz) < 1e-6) return Math.atan2(-fwd.x, -fwd.z);
  return Math.atan2(-hx, -hz);
}

/** Punto del suelo (`groundY` = −altura de la cámara) a `distance` metros en la dirección `yaw`. */
export function spotInFront(
  yaw: number,
  distance: number,
  groundY: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return out.set(-Math.sin(yaw) * distance, groundY, -Math.cos(yaw) * distance);
}
