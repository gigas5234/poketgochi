"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelFloor — Layer 3 (depth 0.3, 가장 뒤)
//
//  /asset/floor.png (2048×2048 원목 바닥) 을 배경으로 깔고
//  네온 그리드 + 비네트 + 천장 조명 글로우를 오버레이한다.
// ─────────────────────────────────────────────────────────────────────────────

export default function PixelFloor() {
  return (
    <div className="absolute inset-0" style={{ overflow: "hidden" }}>

      {/* ── 원목 바닥 텍스처 ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/asset/floor.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
          // 원래 밝은 텍스처를 어둡게 눌러 네온 분위기 연출
          filter: "brightness(0.38) saturate(0.6) sepia(0.2)",
        }}
      />

      {/* ── 다크 베이스 오버레이 (전체 톤다운) ── */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2, 8, 4, 0.45)" }}
      />

      {/* ── 천장 중앙 조명: 위에서 내려오는 원형 광원 ── */}
      <div
        className="absolute"
        style={{
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "55%",
          height: "55%",
          background:
            "radial-gradient(ellipse at center, rgba(0,255,140,0.10) 0%, rgba(0,255,100,0.04) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 네온 그리드 (바닥 타일 격자) ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,80,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,80,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "12.5% 12.5%",
          pointerEvents: "none",
        }}
      />

      {/* ── 비네트: 방 가장자리 어둡게 ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
