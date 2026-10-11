-- CreateTable
CREATE TABLE "InventoryPokemon" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT[],
    "abilities" TEXT[],
    "imageUrl" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "baseExperience" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "playerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "pokemonIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" SERIAL NOT NULL,
    "playerId" UUID NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "pokemonName" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPokemon" (
    "id" SERIAL NOT NULL,
    "playerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT[],
    "stats" JSONB NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryPokemon_name_idx" ON "InventoryPokemon"("name");

-- CreateIndex
CREATE INDEX "Team_playerId_id_idx" ON "Team"("playerId", "id");

-- CreateIndex
CREATE INDEX "Favorite_playerId_id_idx" ON "Favorite"("playerId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_playerId_pokemonId_key" ON "Favorite"("playerId", "pokemonId");

-- CreateIndex
CREATE INDEX "CustomPokemon_playerId_id_idx" ON "CustomPokemon"("playerId", "id");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPokemon" ADD CONSTRAINT "CustomPokemon_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reglas que Prisma no modela (F0-08). La base las hace cumplir aunque un bug se salte los DTOs.
ALTER TABLE "InventoryPokemon" ADD CONSTRAINT "stock_nonneg" CHECK ("stock" >= 0);
ALTER TABLE "InventoryPokemon" ADD CONSTRAINT "price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "Favorite" ADD CONSTRAINT "rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Team" ADD CONSTRAINT "max_six" CHECK (cardinality("pokemonIds") <= 6);
