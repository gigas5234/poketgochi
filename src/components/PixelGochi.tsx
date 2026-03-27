"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelGochi — 탑다운 시점 픽셀 캐릭터
//
//  네온 그린 빛을 발산하는 작은 원형 생명체.
//  CSS만으로 머리·몸·눈·발 표현.
//  pixel-hover 애니메이션으로 둥둥 떠있는 느낌.
// ─────────────────────────────────────────────────────────────────────────────

export default function PixelGochi() {
  return (
    <div
      className="absolute"
      style={{
        // 방 중앙 약간 위 (침대 아래쪽)
        left: "44%",
        top: "48%",
        transform: "translate(-50%, -50%)",
        animation: "pixel-hover 2.4s ease-in-out infinite",
        zIndex: 2,
      }}
    >
      {/* ── 몸통 (탑다운 원형) ── */}
      <div
        style={{
          position: "relative",
          width: "28px",
          height: "28px",
          background: "#050a05",
          border: "2px solid #00ff66",
          borderRadius: "50%",
          boxShadow:
            "0 0 8px #00ff66, 0 0 18px rgba(0,255,100,0.4), inset 0 0 6px rgba(0,255,100,0.15)",
          imageRendering: "pixelated",
        }}
      >
        {/* 왼쪽 눈 */}
        <div
          style={{
            position: "absolute",
            width: "4px",
            height: "4px",
            background: "#00ff66",
            top: "7px",
            left: "6px",
            boxShadow: "0 0 4px #00ff66",
            imageRendering: "pixelated",
          }}
        />
        {/* 오른쪽 눈 */}
        <div
          style={{
            position: "absolute",
            width: "4px",
            height: "4px",
            background: "#00ff66",
            top: "7px",
            right: "6px",
            boxShadow: "0 0 4px #00ff66",
            imageRendering: "pixelated",
          }}
        />
        {/* 입 (작은 가로선) */}
        <div
          style={{
            position: "absolute",
            width: "8px",
            height: "2px",
            background: "#00cc44",
            bottom: "7px",
            left: "50%",
            transform: "translateX(-50%)",
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* ── 발 (탑다운에서 보이는 작은 원형 2개) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "10px",
        }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              background: "#003a14",
              border: "1px solid #00aa44",
              borderRadius: "50%",
              imageRendering: "pixelated",
            }}
          />
        ))}
      </div>

      {/* ── 글로우 후광 ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "-12px",
          background:
            "radial-gradient(circle, rgba(0,255,100,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
