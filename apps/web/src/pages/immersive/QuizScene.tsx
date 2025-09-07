import React, { useState, useEffect } from "react";
import { useGameStore } from "@/hooks/immersive/useGameStore";
import { useSound } from "@/hooks/immersive/useSound";
import { useCountdown } from "@/hooks/useCountdown";
import { useWebSocketService } from "@/services/websocket";
import { MOCK_QUESTIONS } from "@/mocks/immersive-data";
import Confetti from "react-confetti";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function QuizScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const { submitAnswer, isConnected } = useWebSocketService();
  const { currentQuestionIndex, players } = gameState;
  const question = MOCK_QUESTIONS[currentQuestionIndex];

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  const { seconds, start, reset } = useCountdown({
    seconds: 30, // Increased from 10 to 30 seconds
    onEnd: () => handleTimeUp(),
  });

  useEffect(() => {
    if (question) {
      start();
      setAnswerSubmitted(false);
      setSelectedAnswer(null);
    }
  }, [currentQuestionIndex, question, start]);

  const handleTimeUp = () => {
    if (!answerSubmitted) {
      // Auto-submit if no answer was given
      handleAnswerClick(question.options[0], true);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowConfetti(false);
    setAnswerSubmitted(false);

    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      setGameState((state) => ({
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      }));
      reset();
      start();
    } else {
      // Quiz finished - WebSocket will handle scene change
      console.log("Quiz finished");
    }
  };

  const handleAnswerClick = (option: string, isAutoSubmit = false) => {
    if (answerSubmitted) return; // Prevent changing answer

    if (!isAutoSubmit) {
      playSound("click.mp3");
    }

    const isCorrect = option === question.answer;
    setSelectedAnswer(option);
    setAnswerSubmitted(true);

    // Submit answer via WebSocket
    if (isConnected) {
      const answerIndex = question.options.indexOf(option);
      submitAnswer({
        questionIndex: currentQuestionIndex,
        answerIndex,
        answerText: option,
      });
    }

    if (isCorrect) {
      if (!isAutoSubmit) {
        playSound("correct.mp3");
      }
      setShowConfetti(true);

      // Award points based on time remaining
      setGameState((state) => {
        const currentPlayer = state.players.find(
          (p) => p.id === "current-user"
        );
        if (currentPlayer) {
          currentPlayer.score += seconds * 10;
        }
        return { ...state };
      });
    } else {
      if (!isAutoSubmit) {
        playSound("incorrect.mp3");
      }
    }

    // Wait for WebSocket confirmation before moving to next question
    // For now, use a timeout as fallback
    setTimeout(() => {
      if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
        handleNextQuestion();
      }
    }, 2000);
  };

  const progress = ((currentQuestionIndex + 1) / MOCK_QUESTIONS.length) * 100;

  // Show loading if no question
  if (!question) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between p-8">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {/* Top Bar: Timer and Progress */}
      <div className="w-full flex items-center gap-4">
        <div
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-bold ${
            seconds <= 5
              ? "border-red-500 text-red-500 animate-pulse"
              : "border-white"
          }`}>
          {seconds}
        </div>
        <div className="flex-grow bg-black/30 rounded-full h-6 overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-lg font-semibold">
          {currentQuestionIndex + 1} / {MOCK_QUESTIONS.length}
        </div>
      </div>

      {/* Question */}
      <div className="text-center max-w-4xl">
        <h1 className="text-4xl font-bold leading-tight">
          {question.question}
        </h1>
      </div>

      {/* Answers */}
      <div className="w-full grid grid-cols-2 gap-4 max-w-4xl">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = question.answer === option;
          let buttonClass =
            "btn btn-lg h-32 text-2xl transition-all duration-300 ";

          if (isSelected) {
            buttonClass += isCorrect
              ? "btn-success scale-105"
              : "btn-error scale-105";
          } else if (answerSubmitted) {
            buttonClass += isCorrect ? "btn-success opacity-100" : "opacity-50";
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswerClick(option)}
              className={buttonClass}
              style={{
                backgroundColor: !answerSubmitted ? COLORS[index] : undefined,
                border: isSelected ? "4px solid white" : undefined,
              }}
              disabled={answerSubmitted}>
              {option}
            </button>
          );
        })}
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute bottom-4 left-4 bg-red-500/80 text-white px-3 py-1 rounded-full text-sm">
          Disconnected
        </div>
      )}

      {/* Answer Status */}
      {answerSubmitted && (
        <div className="absolute bottom-4 right-4 bg-blue-500/80 text-white px-3 py-1 rounded-full text-sm">
          Answer submitted
        </div>
      )}
    </div>
  );
}
