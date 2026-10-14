-- F5-04: resultado de los combates PvP (D-056, regla 10). Solo añade: tabla Battle y su enum.

-- CreateEnum
CREATE TYPE "BattleKind" AS ENUM ('PVP', 'AI', 'TOURNAMENT');

-- CreateTable
CREATE TABLE "Battle" (
    "id" UUID NOT NULL,
    "kind" "BattleKind" NOT NULL,
    "p1Id" UUID NOT NULL,
    "p2Id" UUID NOT NULL,
    "winnerId" UUID,
    "reason" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "turns" INTEGER NOT NULL,
    "log" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Battle_p1Id_endedAt_idx" ON "Battle"("p1Id", "endedAt");

-- CreateIndex
CREATE INDEX "Battle_p2Id_endedAt_idx" ON "Battle"("p2Id", "endedAt");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_p1Id_fkey" FOREIGN KEY ("p1Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_p2Id_fkey" FOREIGN KEY ("p2Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El ganador es uno de los dos jugadores (o nadie), y el motivo es de la lista cerrada del contrato.
ALTER TABLE "Battle" ADD CONSTRAINT "winner_is_player" CHECK ("winnerId" IS NULL OR "winnerId" IN ("p1Id", "p2Id"));
ALTER TABLE "Battle" ADD CONSTRAINT "battle_reason" CHECK ("reason" IN ('faint', 'forfeit', 'abandon', 'inactive'));
