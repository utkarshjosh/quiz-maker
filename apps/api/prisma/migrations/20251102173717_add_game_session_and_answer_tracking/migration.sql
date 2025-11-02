-- AlterTable
ALTER TABLE "quiz_answers" ADD COLUMN     "is_correct" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "quiz_game_sessions" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" BIGINT NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "total_players" INTEGER NOT NULL,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_game_sessions_room_id_key" ON "quiz_game_sessions"("room_id");

-- CreateIndex
CREATE INDEX "quiz_game_sessions_quiz_id_idx" ON "quiz_game_sessions"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_game_sessions_host_id_idx" ON "quiz_game_sessions"("host_id");
