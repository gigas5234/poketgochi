"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelFurniture — Layer 1 (depth 1.5, 가장 앞)
//
//  /asset/bed.png (1137×546, 탑다운 침대+협탁) 을 메인으로 배치.
//  CSS 로 책상·화분·발광 아이템을 추가해 방을 채운다.
// ─────────────────────────────────────────────────────────────────────────────

export default function PixelFurniture() {
  return (
    <div className="absolute inset-0 pointer-events-none">

      {/* ════════════════════════════════════════
          침대 (bed.png) — 상단 중앙
          00_room.png 참조: 방 위쪽 중앙에 위치
      ════════════════════════════════════════ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/asset/bed.png"
        alt=""
        style={{
          position: "absolute",
          left: "10%",
          top: "4%",
          width: "72%",
          imageRendering: "pixelated",
          // 원본 PNG 가 밝은 베이지라 네온 분위기에 맞게 조정
          filter: "brightness(0.75) saturate(0.7)",
        }}
        draggable={false}
      />

      {/* ════════════════════════════════════════
          책상 — 우측 하단
          (CSS 픽셀 사각형 + 모니터 + 물건들)
      ════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          right: "4%",
          bottom: "10%",
          width: "26%",
          height: "22%",
        }}
      >
        {/* 책상 상판 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#1a0f06",
            border: "1px solid #3a2010",
            boxShadow: "0 0 6px rgba(0,0,0,0.8)",
            imageRendering: "pixelated",
          }}
        />
        {/* 모니터 */}
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "10%",
            width: "42%",
            height: "55%",
            background: "#050a12",
            border: "1px solid #0044aa",
            boxShadow: "0 0 8px rgba(0,80,255,0.5), inset 0 0 4px rgba(0,80,255,0.2)",
            imageRendering: "pixelated",
          }}
        >
          {/* 모니터 스크린 글로우 */}
          <div
            style={{
              position: "absolute",
              inset: "2px",
              background: "rgba(0,40,120,0.4)",
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(0,100,255,0.06) 2px,
                  rgba(0,100,255,0.06) 3px
                )
              `,
            }}
          />
        </div>
        {/* 키보드 */}
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "8%",
            width: "55%",
            height: "20%",
            background: "#0f0f14",
            border: "1px solid #1a1a2a",
            imageRendering: "pixelated",
          }}
        />
        {/* 책 / 물건 */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            right: "8%",
            width: "18%",
            height: "30%",
            background: "#001a00",
            border: "1px solid #00aa44",
            boxShadow: "0 0 4px rgba(0,255,80,0.3)",
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* ════════════════════════════════════════
          화분 — 좌측 중단
          (CSS 원형 화분 + 네온 그린 잎)
      ════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "52%",
        }}
      >
        {/* 화분 몸체 */}
        <div
          style={{
            width: "28px",
            height: "20px",
            background: "#2a0800",
            border: "1px solid #5a2010",
            borderRadius: "0 0 4px 4px",
            imageRendering: "pixelated",
          }}
        />
        {/* 잎 (탑다운 원형) */}
        <div
          style={{
            position: "absolute",
            top: "-14px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "34px",
            height: "20px",
            background: "#003300",
            border: "1px solid #00aa33",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(0,180,50,0.4)",
            imageRendering: "pixelated",
          }}
        />
        {/* 잎 하이라이트 */}
        <div
          style={{
            position: "absolute",
            top: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "10px",
            height: "6px",
            background: "#00ff44",
            borderRadius: "50%",
            opacity: 0.4,
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* ════════════════════════════════════════
          발광 아이템 — 협탁 위 작은 램프 글로우
          (침대 우측, 협탁 위에 놓인 느낌)
      ════════════════════════════════════════ */}
      <div
        className="neon-pulse"
        style={{
          position: "absolute",
          left: "72%",
          top: "12%",
          width: "10px",
          height: "10px",
          background: "#ff9900",
          borderRadius: "50%",
          boxShadow: "0 0 10px #ff9900, 0 0 20px rgba(255,150,0,0.5)",
          imageRendering: "pixelated",
        }}
      />

      {/* ════════════════════════════════════════
          작은 러그 — 방 중앙
      ════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          left: "28%",
          top: "45%",
          width: "44%",
          height: "28%",
          background: "rgba(60,0,80,0.35)",
          border: "1px solid rgba(180,0,255,0.2)",
          borderRadius: "4px",
          boxShadow: "inset 0 0 12px rgba(120,0,180,0.15)",
          imageRendering: "pixelated",
        }}
      >
        {/* 러그 내부 패턴 (간단한 중심선) */}
        <div
          style={{
            position: "absolute",
            inset: "4px",
            border: "1px solid rgba(180,0,255,0.15)",
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}
