import { useState } from "react";
import { useTimer } from "../hooks/useTimer";
import { messages } from "../utils/messages";

export function SprintTimer() {
  const { remaining, isRunning, isBreak, duration, setDuration, toggle, reset } = useTimer();
  const [msgIndex, setMsgIndex] = useState(0);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const timerColor = isBreak ? "#bdffaf" : "#ffbeaf";

  function handleAnimationIteration() {
    setMsgIndex((prev) => (prev + 1) % messages.length);
  }

  return (
    <div className="sprint-timer">
      <div className="led-strip">
        <span className="marquee" onAnimationIteration={handleAnimationIteration}>
          {messages[msgIndex]}
        </span>
      </div>
      <div className="timer-right">
        <div className="timer-unit">
          <span
            className={`dur ${duration === 25 ? "on" : "off"}`}
            onClick={() => setDuration(25)}
          >
            25
          </span>
          <span className="sep">/</span>
          <span
            className={`dur ${duration === 50 ? "on" : "off"}`}
            onClick={() => setDuration(50)}
          >
            50
          </span>
        </div>
        <div className="timer-unit">
          <span className="timer-display" style={{ color: timerColor }}>
            {formatted}
          </span>
        </div>
        <div className="timer-unit">
          <span
            className={`tbtn start${isRunning ? " running" : ""}`}
            onClick={toggle}
          >
            {isRunning ? "PAUSE" : "START"}
          </span>
        </div>
        <div className="timer-unit">
          <span className="tbtn reset" onClick={reset}>
            RESET
          </span>
        </div>
      </div>
    </div>
  );
}
