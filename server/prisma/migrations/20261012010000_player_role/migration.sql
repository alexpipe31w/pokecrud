-- F0-12: rol del jugador. Solo ADMIN escribe en el inventario `/pokemon`.
-- Columna con DEFAULT: aditiva, el servidor anterior (Render) sigue funcionando mientras no se despliegue F0-12.

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('PLAYER', 'ADMIN');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "role" "PlayerRole" NOT NULL DEFAULT 'PLAYER';
