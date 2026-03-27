"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  DropShadows — Layer 2 (depth 1.0)
//
//  침대·캐릭터·데스크 아래 투명한 블러 그림자를 그린다.
//  실제 오브젝트(Layer 1)보다 미세하게 덜 움직여(depth 1.0 < 1.5)
//  그림자가 오브젝트와 살짝 어긋나면서 입체감이 생긴다.
// ─────────────────────────────────────────────────────────────────────────────

interface ShadowProps {
  /** 중심 X (% 단위) */
  cx: number;
  /** 중심 Y (% 단위) */
  cy: number;
  /** 가로 크기 (% 단위) */
  w: number;
  /** 세로 크기 (% 단위) */
  h: number;
  opacity?: number;
}

function Shadow({ cx, cy, w, h, opacity = 0.55 }: ShadowProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${cx - w / 2}%`,
        top:  `${cy - h / 2}%`,
        width: `${w}%`,
        height: `${h}%`,
        background: `radial-gradient(ellipse at center, rgba(0,0,0,${opacity}) 0%, transparent 70%)`,
        filter: "blur(6px)",
      }}
    />
  );
}

export default function DropShadows() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 침대 그림자 — 침대 이미지 위치에 맞춤 (left:15% top:8% w:67%) */}
      <Shadow cx={48} cy={30} w={64} h={22} opacity={0.6} />

      {/* 캐릭터 그림자 — 방 중앙 약간 아래 */}
      <Shadow cx={52} cy={55} w={18} h={8} opacity={0.5} />

      {/* 책상 그림자 — 우측 하단 */}
      <Shadow cx={78} cy={72} w={30} h={14} opacity={0.5} />

      {/* 화분 그림자 — 좌측 중단 */}
      <Shadow cx={18} cy={60} w={14} h={8} opacity={0.4} />
    </div>
  );
}
