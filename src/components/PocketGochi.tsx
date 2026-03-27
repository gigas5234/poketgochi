"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PocketGochi — Ceiling View Edition
//
//  컴포넌트 계층:
//    PocketGochi
//      ├── RoomContainer   (CSS 변수 관리 + 자이로/마우스 리스너)
//      │     └── PixelRoom (깊이 레이어드 탑다운 방 렌더링)
//      └── CeilingWindow   (유리 천장 시각 효과 + HUD + 터치 이벤트)
//
//  PocketGochi 는 다음 상태만 관리한다:
//    • gyroStatus  : iOS 권한 흐름 + 자이로 사용 가능 여부
//    • touchPos    : 마지막 터치 좌표 (HUD 에 표시)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import RoomContainer from "./RoomContainer";
import CeilingWindow, { GyroStatus } from "./CeilingWindow";

export default function PocketGochi() {
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>("idle");
  const [touchPos,   setTouchPos]   = useState({ x: 0, y: 0 });

  // ── 마운트 시: 플랫폼 판별 ──
  // iOS Safari 에서는 DeviceOrientationEvent.requestPermission 이 존재.
  // Android / 데스크탑에서는 즉시 'granted' 처리.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") {
      // iOS 가 아닌 경우: 권한 없이 이벤트 바로 수신 가능
      setGyroStatus("granted");
    }
    // iOS 인 경우: 'idle' 상태 유지 → CeilingWindow 에 "ENABLE GYRO" 버튼 표시
  }, []);

  // ── iOS 자이로 권한 요청 ──
  // CeilingWindow 의 버튼을 누를 때 호출됨.
  // requestPermission 은 반드시 사용자 제스처(탭) 안에서만 호출 가능.
  const requestGyro = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (DeviceOrientationEvent as any).requestPermission();
      setGyroStatus(result === "granted" ? "granted" : "denied");
    } catch {
      // 권한 거부 or 지원 안 함
      setGyroStatus("denied");
    }
  }, []);

  // ── 터치/클릭 핸들러 ──
  // CeilingWindow 로부터 좌표를 받아 상태에 저장 + 햅틱 진동
  const handleTap = useCallback((x: number, y: number) => {
    setTouchPos({ x, y });
    // 모바일 햅틱 진동 (짧은 30ms 피드백)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  return (
    <div
      className="relative w-full h-full"
      style={{ background: "#050a05", overflow: "hidden" }}
    >
      {/* ── 방 레이어 (자이로 시차 적용) ── */}
      <RoomContainer gyroGranted={gyroStatus === "granted"} />

      {/* ── 유리 천장 레이어 (HUD + 터치 이벤트) ── */}
      <CeilingWindow
        touchPos={touchPos}
        gyroStatus={gyroStatus}
        onTap={handleTap}
        onRequestGyro={requestGyro}
      />
    </div>
  );
}
