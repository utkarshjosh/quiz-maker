import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/hooks/immersive/useGameStore';
import { useSound } from '@/hooks/immersive/useSound';
import { useCountdown } from '@/hooks/useCountdown';
import { MOCK_QUESTIONS } from '@/mocks/immersive-data';
import Confetti from 'react-confetti';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function QuizScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const { currentQuestionIndex, players } = gameState;
  const question = MOCK_QUESTIONS[currentQuestionIndex];

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { seconds, start, reset } = useCountdown({
    seconds: 10,
    onEnd: () => handleNextQuestion(),
  });

  useEffect(() => {
    start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowConfetti(false);

    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      setGameState(state => ({ ...state, currentQuestionIndex: state.currentQuestionIndex + 1 }));
      reset();
      start();
    } else {
      setGameState(state => ({ ...state, scene: 'leaderboard' }));
    }
  };

  const handleAnswerClick = (option: string) => {
    if (selectedAnswer) return; // Prevent changing answer

        playSound('click.mp3');
    const isCorrect = option === question.answer;
    setSelectedAnswer(option);

    if (isCorrect) {
      playSound('correct.mp3');
      setShowConfetti(true);
      // Award points based on time remaining
      setGameState(state => {
        const hostPlayer = state.players.find(p => p.id === 'host');
        if (hostPlayer) {
          hostPlayer.score += seconds * 10;
        }
        return { ...state };
      });
    } else {
      playSound('incorrect.mp3');
    }

    setTimeout(handleNextQuestion, 1500);
  };

  const progress = ((currentQuestionIndex + 1) / MOCK_QUESTIONS.length) * 100;

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between p-8">
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}

      {/* Top Bar: Timer and Progress */}
      <div className="w-full flex items-center gap-4">
        <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center text-3xl font-bold">
          {seconds}
        </div>
        <div className="flex-grow bg-black/30 rounded-full h-6 overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-lg font-semibold">
          {currentQuestionIndex + 1} / {MOCK_QUESTIONS.length}
        </div>
      </div>

      {/* Question */}
      <div className="text-center">
        <h1 className="text-4xl font-bold">{question.question}</h1>
      </div>

      {/* Answers */}
      <div className="w-full grid grid-cols-2 gap-4">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = question.answer === option;
          let buttonClass = 'btn btn-lg h-32 text-2xl ';
          if (isSelected) {
            buttonClass += isCorrect ? 'btn-success' : 'btn-error';
          } else if (selectedAnswer) {
            buttonClass += isCorrect ? 'btn-success' : 'opacity-50';
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswerClick(option)}
              className={buttonClass}
              style={{ backgroundColor: !selectedAnswer ? COLORS[index] : undefined }}
              disabled={!!selectedAnswer}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
