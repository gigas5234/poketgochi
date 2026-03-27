"use client";

import React from "react";
import PixelFloor     from "./PixelFloor";
import DropShadows    from "./DropShadows";
import PixelFurniture from "./PixelFurniture";
import PixelGochi     from "./PixelGochi";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelRoom — 깊이 레이어드 탑다운 방
//
//  레이어 구성 (뒤→앞, 페인터 알고리즘):
//
//  Layer 3  PixelFloor     depth: 0.3px  — floor.png + 네온 그리드 + 비네트
//  Layer 2  DropShadows    depth: 1.0px  — CSS 블러 그림자
//  Layer 1  PixelFurniture depth: 1.5px  — bed.png + CSS 가구
//  Layer 1  PixelGochi     depth: 1.5px  — 네온 픽셀 캐릭터
//  Layer 0  CeilingWindow  depth: 0      — HUD / 유리 오버레이 (별도 컴포넌트)
//
//  --tilt-x / --tilt-y (unitless) 는 RoomContainer 가 부모 DOM 에 설정.
//  각 ParallaxLayer 는 자신의 --depth (px 단위) 를 선언하고
//  CSS calc(unitless × px = px) 로 translate 값을 계산.
//
//  translate3d(..., 0) : GPU 합성 레이어 강제 → 60fps 보장
// ─────────────────────────────────────────────────────────────────────────────

interface ParallaxLayerProps {
  /** CSS px 깊이값 (예: "1.5px"). 값이 클수록 더 많이 움직인다 */
  depth: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function ParallaxLayer({ depth, children, style }: ParallaxLayerProps) {
  return (
    <div
      className="absolute inset-0"
      style={{
        ["--depth" as string]: depth,
        transform:
          "translate3d(calc(var(--tilt-x, 0) * var(--depth, 0px)), calc(var(--tilt-y, 0) * var(--depth, 0px)), 0)",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function PixelRoom() {
  return (
    <div className="absolute inset-0" style={{ overflow: "hidden" }}>

      {/* ── Layer 3: 바닥 (가장 뒤, 가장 적게 움직임) ── */}
      <ParallaxLayer depth="0.3px">
        <PixelFloor />
      </ParallaxLayer>

      {/* ── Layer 2: 그림자 (중간 깊이) ── */}
      <ParallaxLayer depth="1.0px">
        <DropShadows />
      </ParallaxLayer>

      {/* ── Layer 1: 가구 + 캐릭터 (가장 앞, 가장 많이 움직임) ── */}
      <ParallaxLayer depth="1.5px">
        <PixelFurniture />
        <PixelGochi />
      </ParallaxLayer>

    </div>
  );
}
