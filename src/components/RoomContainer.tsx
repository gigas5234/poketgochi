"use client";

import React, { useRef, useEffect } from "react";
import PixelRoom from "./PixelRoom";

// ─────────────────────────────────────────────────────────────────────────────
//  RoomContainer — 자이로 데이터를 CSS 변수로 변환하는 핵심 컨테이너
//
//  ── 데이터 흐름 ──
//  DeviceOrientationEvent
//    → beta(Y) / gamma(X) 보정·클램핑
//      → rAF 루프에서 Lerp(선형 보간)
//        → --tilt-x / --tilt-y CSS 변수로 DOM 에 직접 쓰기
//          → PixelRoom 각 레이어의 CSS calc() 가
//            translate(calc(var(--tilt-x) * var(--depth)), ...) 계산
//
//  ── Y축(beta) 미작동 원인 및 해결 ──
//  문제: beta는 절대각(-180~180)이라 사람마다 폰 드는 각도가 달라
//        (beta - 90) 방식은 초기값이 -20~-10 로 편향됨.
//        그 상태에서 기울여도 클램프 범위를 벗어나 변화가 없어 보임.
//  해결: 첫 이벤트의 beta를 기준(betaCalib)으로 저장하고
//        이후 모든 delta = beta - betaCalib 로 계산.
//        이렇게 하면 어떤 각도로 들든 항상 '현재 자세 = 0' 이 된다.
//
//  ── CSS 변수 명세 ──
//  --tilt-x : 좌우 기울기 (unitless 숫자, 예: 12.5)
//  --tilt-y : 앞뒤 기울기 (unitless 숫자, 예: -7.3)
//  --depth  : 각 레이어에서 개별 설정하는 px 단위 깊이값 (예: 1.5px)
//             → calc(var(--tilt-x) * var(--depth)) = calc(12.5 * 1.5px) = 18.75px
// ─────────────────────────────────────────────────────────────────────────────

/** 좌우(gamma) 클램프 범위 ±° — gamma 는 -90~90 넓은 범위라 넉넉하게 */
const CLAMP_X = 20;

/**
 * 앞뒤(beta delta) 클램프 범위 ±°
 * 실제로 폰을 들고 앞뒤로 기울이는 범위는 ±10~15° 정도.
 * 좁게 설정해야 작은 기울기에도 민감하게 반응함.
 */
const CLAMP_Y = 12;

/** Lerp 계수: 작을수록 부드럽고 느린 추적 */
const LERP = 0.07;

interface RoomContainerProps {
  gyroGranted: boolean;
}

export default function RoomContainer({ gyroGranted }: RoomContainerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const gyroActiveRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 목표값(이벤트 raw) / 현재값(lerp 결과)
    const target  = { tx: 0, ty: 0 };
    const current = { tx: 0, ty: 0 };

    // ── Y축 보정값 ──
    // 첫 이벤트에서 beta를 저장해 이후 델타로 계산
    // null = 아직 첫 이벤트 미수신
    let betaCalib: number | null = null;

    el.style.setProperty("--tilt-x", "0");
    el.style.setProperty("--tilt-y", "0");

    // ─────────────────────────────────────
    //  rAF 루프: Lerp → CSS 변수 업데이트
    //  setState 없이 DOM 에 직접 쓰므로 React 재렌더링 없음.
    // ─────────────────────────────────────
    let animId: number;
    function loop() {
      current.tx += (target.tx - current.tx) * LERP;
      current.ty += (target.ty - current.ty) * LERP;
      el!.style.setProperty("--tilt-x", current.tx.toFixed(3));
      el!.style.setProperty("--tilt-y", current.ty.toFixed(3));
      animId = requestAnimationFrame(loop);
    }
    loop();

    // ─────────────────────────────────────
    //  DeviceOrientation 핸들러
    //
    //  gamma: 좌우 기울기 (-90° ~ +90°)
    //         폰을 수직으로 들면 0°에 가까움 → 그대로 사용
    //
    //  beta:  절대 기울기 (-180° ~ +180°)
    //         ★ 핵심 수정: 첫 수신값을 보정값으로 저장 후 델타 계산
    //         betaCalib = 사용자가 처음 폰을 든 각도 (자연스러운 자세)
    //         rawTy = beta - betaCalib
    //           → 0   = 최초 자세 (중립)
    //           → +값 = 화면 위쪽이 멀어지는 방향으로 기울임
    //           → -값 = 화면 위쪽이 가까워지는 방향으로 기울임
    // ─────────────────────────────────────
    function handleOrientation(e: DeviceOrientationEvent) {
      const beta  = e.beta  ?? 90;
      const gamma = e.gamma ?? 0;

      // 최초 수신 시 보정값 저장 (이후 변경 없음)
      if (betaCalib === null) {
        betaCalib = beta;
      }

      gyroActiveRef.current = true;

      // X축: gamma 직접 사용 (이미 0 중심)
      target.tx = Math.max(-CLAMP_X, Math.min(CLAMP_X, gamma));

      // Y축: 보정된 델타값 사용
      // CLAMP_Y 를 좁게 잡아 작은 기울기에도 민감하게 반응
      target.ty = Math.max(-CLAMP_Y, Math.min(CLAMP_Y, beta - betaCalib));
    }

    window.addEventListener("deviceorientation", handleOrientation, true);

    // ─────────────────────────────────────
    //  마우스 폴백 (데스크탑)
    //  자이로 활성화 전까지만 작동.
    //  마우스 중앙 → (0, 0), 끝 → (±CLAMP, ±CLAMP)
    // ─────────────────────────────────────
    function handleMouseMove(e: MouseEvent) {
      if (gyroActiveRef.current) return;
      const rect = el!.getBoundingClientRect();
      if (!rect.width) return;
      target.tx = ((e.clientX - rect.left) / rect.width  - 0.5) * (CLAMP_X * 2);
      target.ty = ((e.clientY - rect.top)  / rect.height - 0.5) * (CLAMP_Y * 2);
    }
    window.addEventListener("mousemove", handleMouseMove);

    // ─────────────────────────────────────
    //  터치 드래그 폴백 (gyro 없는 환경)
    // ─────────────────────────────────────
    function handleTouchMove(e: TouchEvent) {
      if (gyroActiveRef.current) return;
      const t    = e.touches[0];
      const rect = el!.getBoundingClientRect();
      if (!rect.width) return;
      target.tx = ((t.clientX - rect.left) / rect.width  - 0.5) * (CLAMP_X * 2);
      target.ty = ((t.clientY - rect.top)  / rect.height - 0.5) * (CLAMP_Y * 2);
    }
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [gyroGranted]);

  return (
    // --tilt-x / --tilt-y 를 이 노드에 설정.
    // CSS custom property 는 하위 트리에 cascade 되므로
    // PixelRoom 의 모든 레이어에서 var(--tilt-x), var(--tilt-y) 로 접근 가능.
    <div ref={containerRef} className="absolute inset-0" style={{ overflow: "hidden" }}>
      <PixelRoom />
    </div>
  );
}
