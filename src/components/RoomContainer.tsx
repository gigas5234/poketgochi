"use client";

import React, { useRef, useEffect } from "react";
import PixelRoom from "./PixelRoom";

// ─────────────────────────────────────────────────────────────────────────────
//  RoomContainer
//  자이로스코프 데이터를 수신해 CSS 변수(--gx, --gy)로 변환하고,
//  하위 PixelRoom 의 시차 레이어들이 이를 읽어 transform 을 적용한다.
//
//  ── 데이터 흐름 ──
//  DeviceOrientation Event
//    → target.gx / target.gy (raw 값, 클램핑 처리)
//      → requestAnimationFrame 루프에서 lerp(선형 보간)
//        → el.style.setProperty('--gx', ...) / ('--gy', ...)
//          → 자식 PixelRoom 의 CSS calc() 가 이 값을 곱해 transform 계산
//
//  ── React 상태를 쓰지 않는 이유 ──
//  setState 는 React 재렌더링을 트리거한다. 자이로 이벤트는 60fps 이상으로
//  발생하므로 상태로 관리하면 매 프레임 컴포넌트 트리 전체가 재렌더링된다.
//  CSS 변수를 직접 DOM 에 쓰면 React 사이클을 거치지 않고 GPU 에서
//  transform 만 업데이트되므로 훨씬 효율적이다.
//
//  ── 마우스 폴백 ──
//  데스크탑에서 자이로 없이도 마우스 이동으로 시차 효과를 테스트할 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

/** 자이로 입력 클램프 범위 (±degree) — 이 범위 밖은 자르고 보간 */
const GYRO_CLAMP = 22;

/** Lerp 계수: 0.08 = 부드럽고 느린 추적, 0.15 = 빠른 반응 */
const LERP_FACTOR = 0.08;

interface RoomContainerProps {
  /** PocketGochi 에서 iOS 권한을 받은 후 true 로 전달 */
  gyroGranted: boolean;
}

export default function RoomContainer({ gyroGranted }: RoomContainerProps) {
  // CSS 변수를 설정할 루트 DOM 엘리먼트
  const containerRef = useRef<HTMLDivElement>(null);

  // 자이로가 한 번이라도 활성화됐는지 추적 (마우스 폴백 비활성화에 사용)
  const gyroActiveRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── 목표값(raw input)과 현재값(smoothed) 분리 ──
    // target: 이벤트에서 바로 덮어씀 (불연속 점프 가능)
    // current: rAF 루프에서 target 으로 lerp (부드러운 이동)
    const target  = { gx: 0, gy: 0 };
    const current = { gx: 0, gy: 0 };

    // CSS 변수 초기화 (var(--gx, 0) fallback 이 있지만 명시적으로 설정)
    el.style.setProperty("--gx", "0");
    el.style.setProperty("--gy", "0");

    // ─────────────────────────────────────
    //  rAF 루프: Lerp → CSS 변수 업데이트
    //  매 프레임마다 현재값을 목표값 방향으로 조금씩 이동시켜
    //  자이로/마우스 입력이 갑자기 변해도 카메라가 부드럽게 따라간다.
    // ─────────────────────────────────────
    let animId: number;

    function loop() {
      // 선형 보간: current += (target - current) * LERP_FACTOR
      current.gx += (target.gx - current.gx) * LERP_FACTOR;
      current.gy += (target.gy - current.gy) * LERP_FACTOR;

      // 소수점 3자리까지만 전달 (불필요한 정밀도 제거)
      el!.style.setProperty("--gx", current.gx.toFixed(3));
      el!.style.setProperty("--gy", current.gy.toFixed(3));

      animId = requestAnimationFrame(loop);
    }
    loop();

    // ─────────────────────────────────────
    //  DeviceOrientation 핸들러
    //
    //  gamma : 좌우 기울기, -90° ~ +90°
    //          0° = 화면이 정면 / 양수 = 오른쪽으로 기울임
    //
    //  beta  : 앞뒤 기울기, -180° ~ +180°
    //          폰을 수직으로 세우면 beta ≈ 90°
    //          따라서 (beta - 90) 을 정규화하면:
    //            0  = 수직으로 세운 "평형" 상태
    //           +값 = 앞쪽(화면이 위)으로 기울임
    //           -값 = 뒤쪽(화면이 아래)으로 기울임
    // ─────────────────────────────────────
    function handleOrientation(e: DeviceOrientationEvent) {
      gyroActiveRef.current = true;

      const rawGx =  (e.gamma ?? 0);
      const rawGy =  (e.beta  ?? 90) - 90; // 수직 들기를 기준으로 정규화

      // 클램핑: 과도한 기울기는 잘라서 시차가 너무 커지지 않게 방지
      target.gx = Math.max(-GYRO_CLAMP, Math.min(GYRO_CLAMP, rawGx));
      target.gy = Math.max(-GYRO_CLAMP, Math.min(GYRO_CLAMP, rawGy));
    }

    // iOS 에서는 권한을 받은 후에도 동일한 이벤트 이름 사용
    window.addEventListener("deviceorientation", handleOrientation, true);

    // ─────────────────────────────────────
    //  마우스 이동 폴백 (데스크탑 테스트용)
    //  자이로가 한 번도 수신되지 않았을 때만 작동.
    //  마우스가 컨테이너 중앙 → gx=0, gy=0
    //  마우스가 우측 끝 → gx=+20, 하단 → gy=+20
    // ─────────────────────────────────────
    function handleMouseMove(e: MouseEvent) {
      if (gyroActiveRef.current) return; // 자이로 활성화 시 무시
      const rect = el!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // 0~1 정규화 후 ±20 범위로 스케일
      const nx = (e.clientX - rect.left)  / rect.width;
      const ny = (e.clientY - rect.top)   / rect.height;
      target.gx = (nx - 0.5) * 40;
      target.gy = (ny - 0.5) * 40;
    }
    // window 에 등록: CeilingWindow 오버레이가 pointer-events 를 가로채도 작동
    window.addEventListener("mousemove", handleMouseMove);

    // ─────────────────────────────────────
    //  터치 이동 폴백 (gyro 없는 환경의 모바일)
    // ─────────────────────────────────────
    function handleTouchMove(e: TouchEvent) {
      if (gyroActiveRef.current) return;
      const touch = e.touches[0];
      const rect = el!.getBoundingClientRect();
      if (rect.width === 0) return;
      target.gx = ((touch.clientX - rect.left)  / rect.width  - 0.5) * 36;
      target.gy = ((touch.clientY - rect.top)   / rect.height - 0.5) * 36;
    }
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // ── 클린업 ──
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [gyroGranted]); // gyroGranted 변경(iOS 권한) 시 재등록

  return (
    // ref 를 통해 CSS 변수를 이 DOM 노드에 직접 설정.
    // PixelRoom 이 이 노드의 하위이므로 CSS cascade 로 변수를 상속받는다.
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ overflow: "hidden" }}
    >
      <PixelRoom />
    </div>
  );
}
