import { useState, useEffect, useRef, useCallback } from 'react';

interface CountdownOptions {
  seconds: number;
  onEnd?: () => void;
}

export const useCountdown = ({ seconds: secondsProp, onEnd }: CountdownOptions) => {
  const [seconds, setSeconds] = useState(secondsProp);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onEndRef = useRef(onEnd);

  // Keep the onEnd callback ref up to date
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (running) return;

    setRunning(true);
    setSeconds(secondsProp); // Reset to initial time on start
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          pause();
          onEndRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [running, pause, secondsProp]);

  const reset = useCallback(
    (nextTotal: number = secondsProp) => {
      pause();
      setSeconds(nextTotal);
    },
    [pause, secondsProp]
  );

  useEffect(() => {
    // Cleanup on unmount
    return () => pause();
  }, [pause]);

  return { seconds, running, start, pause, reset };
};
