"use client";

import React from "react";
import dynamic from "next/dynamic";

// ─────────────────────────────────────────────────────────────────
//  RoomContainer
//
//  ThreeRoom 은 WebGL(Canvas)을 포함하므로 SSR 불가.
//  next/dynamic { ssr: false } 로 클라이언트에서만 로드.
//
//  ThreeRoom 이 자급자족(gyro 상태, HUD, 입력 이벤트 모두 내부 관리)
//  이므로 props 전달 불필요.
// ─────────────────────────────────────────────────────────────────
const ThreeRoom = dynamic(() => import("./ThreeRoom"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#000000" }} />
  ),
});

export default function RoomContainer() {
  return (
    <div className="absolute inset-0">
      <ThreeRoom />
    </div>
  );
}
