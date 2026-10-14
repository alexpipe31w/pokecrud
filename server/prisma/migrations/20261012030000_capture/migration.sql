-- F2-06: captura autoritativa (ubicación del jugador, capturados, resultados de encuentro, lanzamientos).

-- CreateEnum
CREATE TYPE "PokemonGender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "EncounterOutcome" AS ENUM ('CAUGHT', 'FLED');

-- CreateEnum
CREATE TYPE "ThrowQuality" AS ENUM ('none', 'nice', 'great', 'excellent');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "lastLat" DOUBLE PRECISION,
ADD COLUMN     "lastLng" DOUBLE PRECISION,
ADD COLUMN     "lastLocatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CaughtPokemon" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL,
    "ivs" JSONB NOT NULL,
    "nature" TEXT NOT NULL,
    "gender" "PokemonGender",
    "shiny" BOOLEAN NOT NULL,
    "heightScale" DOUBLE PRECISION NOT NULL,
    "moves" INTEGER[],
    "ball" "InventoryItem" NOT NULL,
    "encounterId" TEXT NOT NULL,
    "caughtLat" DOUBLE PRECISION NOT NULL,
    "caughtLng" DOUBLE PRECISION NOT NULL,
    "caughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "favorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CaughtPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterResult" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "encounterId" TEXT NOT NULL,
    "outcome" "EncounterOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Throw" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clientThrowId" UUID NOT NULL,
    "encounterId" TEXT NOT NULL,
    "ball" "InventoryItem" NOT NULL,
    "berry" "InventoryItem",
    "throwQuality" "ThrowQuality" NOT NULL,
    "curve" BOOLEAN NOT NULL,
    "captured" BOOLEAN NOT NULL,
    "shakes" INTEGER NOT NULL,
    "fled" BOOLEAN NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "caughtPokemonId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Throw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaughtPokemon_playerId_caughtAt_idx" ON "CaughtPokemon"("playerId", "caughtAt");

-- CreateIndex
CREATE INDEX "CaughtPokemon_playerId_speciesId_idx" ON "CaughtPokemon"("playerId", "speciesId");

-- CreateIndex
CREATE INDEX "EncounterResult_createdAt_idx" ON "EncounterResult"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterResult_playerId_encounterId_key" ON "EncounterResult"("playerId", "encounterId");

-- CreateIndex
CREATE INDEX "Throw_playerId_createdAt_idx" ON "Throw"("playerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Throw_playerId_clientThrowId_key" ON "Throw"("playerId", "clientThrowId");

-- AddForeignKey
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "CaughtPokemon_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterResult" ADD CONSTRAINT "EncounterResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Throw" ADD CONSTRAINT "Throw_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reglas que Prisma no modela: la BD las hace cumplir aunque un bug se salte el código.
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "caught_level_range" CHECK ("level" BETWEEN 1 AND 100);
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "caught_height_range" CHECK ("heightScale" BETWEEN 0.5 AND 1.5);
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "caught_max_four_moves" CHECK (cardinality("moves") <= 4);
ALTER TABLE "Throw" ADD CONSTRAINT "throw_shakes_range" CHECK ("shakes" BETWEEN 0 AND 3);
ALTER TABLE "Throw" ADD CONSTRAINT "throw_xp_nonneg" CHECK ("xpGained" >= 0);
