-- F1-08: inventario del jugador.

-- CreateEnum
CREATE TYPE "InventoryItem" AS ENUM ('POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL', 'RAZZ_BERRY');

-- CreateTable
CREATE TABLE "Inventory" (
    "playerId" UUID NOT NULL,
    "item" "InventoryItem" NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("playerId","item")
);

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas que Prisma no modela: la bolsa nunca baja de 0 ni pasa de 999 por objeto.
ALTER TABLE "Inventory" ADD CONSTRAINT "qty_range" CHECK ("qty" BETWEEN 0 AND 999);

-- Kit inicial para los jugadores que ya existían (mismas cantidades que STARTER_KIT en shared/engine/items.ts).
-- Idempotente: ON CONFLICT DO NOTHING.
INSERT INTO "Inventory" ("playerId", "item", "qty", "updatedAt")
SELECT p."id", k."item"::"InventoryItem", k."qty", CURRENT_TIMESTAMP
FROM "Player" p
CROSS JOIN (VALUES ('POKE_BALL', 30), ('GREAT_BALL', 5), ('ULTRA_BALL', 0), ('RAZZ_BERRY', 5)) AS k("item", "qty")
ON CONFLICT ("playerId", "item") DO NOTHING;
