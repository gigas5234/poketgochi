"use client";

import React from "react";
import dynamic from "next/dynamic";

// ─────────────────────────────────────────────────────────────────
//  RoomContainer
//
//  ThreeRoom(R3F Canvas)을 동적으로 로드한다.
//  ssr: false — WebGL은 서버에서 실행 불가이므로 필수.
//  loading: 로딩 중 배경색만 표시 (깜빡임 방지).
// ─────────────────────────────────────────────────────────────────
const ThreeRoom = dynamic(() => import("./ThreeRoom"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#0d0d0d" }} />
  ),
});

interface RoomContainerProps {
  gyroGranted: boolean;
}

export default function RoomContainer({ gyroGranted }: RoomContainerProps) {
  return (
    <div className="absolute inset-0">
      <ThreeRoom gyroGranted={gyroGranted} />
    </div>
  );
}
