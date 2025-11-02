-- DropForeignKey
ALTER TABLE "public"."quiz_rooms" DROP CONSTRAINT "quiz_rooms_quiz_id_fkey";

-- AddForeignKey
ALTER TABLE "quiz_rooms" ADD CONSTRAINT "quiz_rooms_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
