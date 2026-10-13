-- F3-02a: colección (D-052). Solo añade: columna opcional cp, tablas Candy y PokedexEntry, índices.

-- AlterTable
ALTER TABLE "CaughtPokemon" ADD COLUMN     "cp" INTEGER;

-- CreateTable
CREATE TABLE "Candy" (
    "playerId" UUID NOT NULL,
    "familyId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candy_pkey" PRIMARY KEY ("playerId","familyId")
);

-- CreateTable
CREATE TABLE "PokedexEntry" (
    "playerId" UUID NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "caught" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstCaughtAt" TIMESTAMP(3),

    CONSTRAINT "PokedexEntry_pkey" PRIMARY KEY ("playerId","speciesId")
);

-- CreateIndex
CREATE INDEX "CaughtPokemon_playerId_cp_idx" ON "CaughtPokemon"("playerId", "cp");

-- CreateIndex
CREATE INDEX "CaughtPokemon_playerId_favorite_idx" ON "CaughtPokemon"("playerId", "favorite");

-- AddForeignKey
ALTER TABLE "Candy" ADD CONSTRAINT "Candy_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntry" ADD CONSTRAINT "PokedexEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas que Prisma no modela (como qty_range de Inventory).
ALTER TABLE "Candy" ADD CONSTRAINT "candy_qty_range" CHECK ("qty" BETWEEN 0 AND 999999);
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "cp_positive" CHECK ("cp" IS NULL OR "cp" >= 10);

-- Pokédex de lo capturado antes de esta migración (idempotente). Los caramelos y el PC necesitan el dataset
-- (familia, stats): los rellena prisma/backfill-collection.ts (npm run db:backfill-collection).
INSERT INTO "PokedexEntry" ("playerId", "speciesId", "caught", "firstSeenAt", "firstCaughtAt")
SELECT "playerId", "speciesId", true, MIN("caughtAt"), MIN("caughtAt")
FROM "CaughtPokemon"
GROUP BY "playerId", "speciesId"
ON CONFLICT ("playerId", "speciesId") DO NOTHING;
