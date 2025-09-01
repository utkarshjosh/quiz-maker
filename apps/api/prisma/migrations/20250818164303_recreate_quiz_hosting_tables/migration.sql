/*
  Warnings:

  - You are about to drop the `hosting_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_results` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "hosting_sessions" DROP CONSTRAINT "hosting_sessions_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "hosting_sessions" DROP CONSTRAINT "hosting_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "session_participants" DROP CONSTRAINT "session_participants_session_id_fkey";

-- DropForeignKey
ALTER TABLE "session_participants" DROP CONSTRAINT "session_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "session_results" DROP CONSTRAINT "session_results_participant_id_fkey";

-- DropForeignKey
ALTER TABLE "session_results" DROP CONSTRAINT "session_results_session_id_fkey";

-- DropTable
DROP TABLE "hosting_sessions";

-- DropTable
DROP TABLE "session_participants";

-- DropTable
DROP TABLE "session_results";

-- CreateTable
CREATE TABLE "quiz_rooms" (
    "id" UUID NOT NULL,
    "pin" CHAR(6) NOT NULL,
    "host_user_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'lobby',
    "settings_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "quiz_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_room_members" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'player',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "kicked_by" UUID,
    "kick_reason" TEXT,

    CONSTRAINT "quiz_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_index" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "answer_time_ms" BIGINT NOT NULL,
    "score_delta" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_rooms_pin_key" ON "quiz_rooms"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_room_members_room_id_user_id_key" ON "quiz_room_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "quiz_answers_room_id_question_index_idx" ON "quiz_answers"("room_id", "question_index");

-- CreateIndex
CREATE INDEX "quiz_answers_room_id_user_id_idx" ON "quiz_answers"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "quiz_rooms" ADD CONSTRAINT "quiz_rooms_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_rooms" ADD CONSTRAINT "quiz_rooms_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_room_members" ADD CONSTRAINT "quiz_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "quiz_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_room_members" ADD CONSTRAINT "quiz_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "quiz_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
