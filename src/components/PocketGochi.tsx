"use client";

// ─────────────────────────────────────────────────────────────────
//  PocketGochi
//
//  컴포넌트 계층 (단순화):
//    PocketGochi
//      └── RoomContainer
//            └── ThreeRoom (dynamic, ssr:false)
//                  ├── WebGL Canvas + 시차 셰이더
//                  ├── 네온 레트로 HUD 오버레이
//                  └── 자이로/마우스 이벤트, iOS 권한 흐름
//
//  모든 로직이 ThreeRoom 으로 이동했으므로
//  PocketGochi 는 RoomContainer 만 렌더링한다.
// ─────────────────────────────────────────────────────────────────

import React from "react";
import RoomContainer from "./RoomContainer";

export default function PocketGochi() {
  return (
    <div
      className="relative w-full h-full"
      style={{ background: "#000000", overflow: "hidden" }}
    >
      <RoomContainer />
    </div>
  );
}
