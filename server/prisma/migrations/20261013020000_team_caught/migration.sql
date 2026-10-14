-- F3-06b: equipos con Pokémon capturados (D-054). Solo añade: `pokemonIds` (contrato del curso) no cambia.

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "caughtIds" UUID[] DEFAULT ARRAY[]::UUID[];

-- Como `pokemonIds` (max_six): un equipo tiene como mucho 6 Pokémon capturados.
ALTER TABLE "Team" ADD CONSTRAINT "max_six_caught" CHECK (cardinality("caughtIds") <= 6);
