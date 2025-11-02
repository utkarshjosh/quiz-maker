/**
 * Quiz Scene - Refactored with clean architecture
 * Unity-style: Scene component that uses centralized game state
 */

import React, { useState, useEffect } from "react";
import { useCurrentQuestion, useGameStore } from "@/game/store/gameStore";
import { useGameActions } from "@/game/hooks/useGameManager";
import { useCountdown } from "@/hooks/useCountdown";
import Confetti from "react-confetti";
import { getWebSocketService } from "@/game/services/WebSocketService";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function QuizScene() {
  const { submitAnswer, playSound } = useGameActions();

  // Game State
  const {
    question,
    index: currentQuestionIndex,
    total: totalQuestions,
  } = useCurrentQuestion();
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);

  // Local UI State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  // WebSocket connection status
  const wsService = getWebSocketService();
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onStatusChange((status) => {
      setIsConnected(status === "connected");
    });

    return unsubscribe;
  }, [wsService]);

  // Countdown timer
  const { seconds, start, reset } = useCountdown({
    seconds: question?.timeLimit || 30,
    onEnd: () => handleTimeUp(),
  });

  // Reset state when question changes
  useEffect(() => {
    if (question) {
      console.log("QuizScene: New question", currentQuestionIndex + 1);
      start();
      setAnswerSubmitted(false);
      setSelectedAnswer(null);
      setShowConfetti(false);
    }
  }, [currentQuestionIndex, question, start]);

  const handleTimeUp = () => {
    if (!answerSubmitted && question) {
      console.log("QuizScene: Time up, auto-submitting");
      handleAnswerClick(question.options[0], true);
    }
  };

  const handleAnswerClick = (option: string, isAutoSubmit = false) => {
    if (answerSubmitted || !question) return;

    if (!isAutoSubmit) {
      playSound("CLICK");
    }

    const isCorrect = option === question.answer;
    setSelectedAnswer(option);
    setAnswerSubmitted(true);

    console.log("QuizScene: Answer submitted", {
      option,
      isCorrect,
      timeRemaining: seconds,
    });

    // Submit answer via game manager
    if (isConnected) {
      submitAnswer(option);
    }

    // Play sound and show effects
    if (isCorrect) {
      if (!isAutoSubmit) {
        playSound("CORRECT");
      }
      setShowConfetti(true);

      // Award points based on time remaining (local optimistic update)
      const currentPlayer = players.find((p) => p.id === currentPlayerId);
      if (currentPlayer) {
        const points = seconds * 10;
        useGameStore.getState().updatePlayer(currentPlayer.id, {
          score: currentPlayer.score + points,
        });
      }
    } else {
      if (!isAutoSubmit) {
        playSound("INCORRECT");
      }
    }
  };

  const progress =
    totalQuestions > 0
      ? ((currentQuestionIndex + 1) / totalQuestions) * 100
      : 0;

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
          {currentQuestionIndex + 1} / {totalQuestions}
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
