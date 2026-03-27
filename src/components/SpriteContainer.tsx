"use client";

import React from "react";

// ─────────────────────────────────────────────
//  SpriteContainer
//  캐릭터 스프라이트를 감싸는 래퍼 컴포넌트.
//  현재는 CSS 도형으로 구현하지만, 나중에 <img> 또는
//  스프라이트시트 애니메이션으로 교체하기 쉽도록 분리함.
// ─────────────────────────────────────────────

export type CharacterState = "IDLE" | "SURPRISED" | "MOVING";

interface SpriteContainerProps {
  state: CharacterState;
  /** 이동 방향 (-1 = 왼쪽, 1 = 오른쪽) */
  direction?: -1 | 1;
}

export default function SpriteContainer({
  state,
  direction = 1,
}: SpriteContainerProps) {
  // 상태별 CSS 클래스 매핑
  const bodyColor =
    state === "SURPRISED"
      ? "bg-yellow-300"
      : state === "MOVING"
      ? "bg-cyan-400"
      : "bg-green-400";

  const eyeExpression = state === "SURPRISED" ? "😲" : "👀";

  return (
    // image-rendering: pixelated 를 인라인으로 강제하여
    // 나중에 스프라이트 이미지를 사용해도 픽셀이 흐려지지 않음
    <div
      className="relative flex flex-col items-center"
      style={{ imageRendering: "pixelated" }}
    >
      {/* ── 머리 ── */}
      <div
        className={`
          w-8 h-8 ${bodyColor} border-2 border-black
          flex items-center justify-center
          transition-colors duration-150
          ${state === "SURPRISED" ? "animate-bounce" : ""}
        `}
        style={{ imageRendering: "pixelated" }}
      >
        <span className="text-xs leading-none select-none">
          {eyeExpression}
        </span>
      </div>

      {/* ── 몸통 ── */}
      <div
        className={`
          w-6 h-5 ${bodyColor} border-2 border-t-0 border-black
          transition-colors duration-150
        `}
        style={{
          imageRendering: "pixelated",
          transform: `scaleX(${direction})`,
        }}
      />

      {/* ── 다리 ── */}
      <div
        className="flex gap-1 mt-0.5"
        style={{
          transform: `scaleX(${direction})`,
        }}
      >
        <div
          className={`w-2 h-3 ${bodyColor} border-2 border-black ${
            state === "MOVING" ? "animate-bounce" : ""
          }`}
          style={{ imageRendering: "pixelated", animationDelay: "0ms" }}
        />
        <div
          className={`w-2 h-3 ${bodyColor} border-2 border-black ${
            state === "MOVING" ? "animate-bounce" : ""
          }`}
          style={{ imageRendering: "pixelated", animationDelay: "150ms" }}
        />
      </div>

      {/* ── SURPRISED 상태: 느낌표 말풍선 ── */}
      {state === "SURPRISED" && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2
                     bg-yellow-200 border-2 border-black
                     px-1 text-xs font-bold text-black
                     animate-ping"
          style={{ imageRendering: "pixelated", animationDuration: "0.6s" }}
        >
          !
        </div>
      )}
    </div>
  );
}
