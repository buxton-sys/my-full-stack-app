import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function ProgressCircle({ value, goal }) {
  const percentage = Math.round((value / goal) * 100);

  return (
    <div className="w-24 h-24 mx-auto">
      <CircularProgressbar
        value={percentage}
        text={`${percentage}%`}
        styles={buildStyles({
          textColor: "#111",
          pathColor: "#3b82f6", // blue
          trailColor: "#d1d5db", // gray
          textSize: "16px",
        })}
      />
    </div>
  );
}
