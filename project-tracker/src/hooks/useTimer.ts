import { useState, useEffect, useRef } from "react";

export function useTimer() {
  const [duration, setDurationState] = useState<25 | 50>(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (!isBreak) {
              setIsBreak(true);
              setSessionCount((c) => c + 1);
              return 5 * 60;
            } else {
              setIsBreak(false);
              return duration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isBreak, duration]);

  function setDuration(min: 25 | 50) {
    if (!isRunning) {
      setDurationState(min);
      setRemaining(min * 60);
      setIsBreak(false);
    }
  }

  function toggle() {
    setIsRunning((prev) => !prev);
  }

  function reset() {
    setIsRunning(false);
    setIsBreak(false);
    setRemaining(duration * 60);
  }

  return {
    remaining,
    isRunning,
    isBreak,
    duration,
    setDuration,
    toggle,
    reset,
    sessionCount,
  };
}
