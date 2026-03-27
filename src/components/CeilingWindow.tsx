"use client";

import React, { useState } from "react";

// ─────────────────────────────────────────────────────────────────
//  CeilingWindow — HUD 오버레이 레이어
//
//  3D 캔버스 위에 absolute 로 겹쳐서:
//    1. 상단 HUD 바 (타이틀 / 자이로 상태)
//    2. 하단 HUD 바 (터치 좌표 / 조작 힌트 or iOS 권한 버튼)
//    3. 터치 리플 이펙트
//  만 담당한다. 유리 격자·초록 오버레이는 제거됨.
// ─────────────────────────────────────────────────────────────────

export type GyroStatus = "idle" | "granted" | "denied";

interface TouchPos { x: number; y: number; }
interface Ripple   { id: number; x: number; y: number; }
interface CeilingWindowProps {
  touchPos:      TouchPos;
  gyroStatus:    GyroStatus;
  onTap:         (x: number, y: number) => void;
  onRequestGyro: () => void;
}

let rippleSeq = 0;

export default function CeilingWindow({
  touchPos,
  gyroStatus,
  onTap,
  onRequestGyro,
}: CeilingWindowProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = Math.round(e.clientX - rect.left);
    const y    = Math.round(e.clientY - rect.top);
    onTap(x, y);

    const id = ++rippleSeq;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
  }

  const gyroLabel =
    gyroStatus === "granted" ? "GYRO ●" :
    gyroStatus === "denied"  ? "MOUSE ○" : "GYRO ○";

  // HUD 공통 텍스트 스타일
  const mono: React.CSSProperties = {
    fontFamily:   "monospace",
    imageRendering: "pixelated",
  };

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 10, cursor: "crosshair", touchAction: "none" }}
      onPointerDown={handlePointerDown}
    >
      {/* ══ 상단 HUD ══════════════════════════════════════════════ */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, transparent 100%)",
          padding: "6px 10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 20,
        }}
      >
        {/* 타이틀 */}
        <span style={{ ...mono, fontSize: "9px", color: "#cccccc", letterSpacing: "0.18em" }}>
          POCKET GOCHI
        </span>

        {/* 자이로 상태 */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "5px", height: "5px",
              background: gyroStatus === "granted" ? "#88ff88" : "#333333",
              boxShadow: gyroStatus === "granted" ? "0 0 4px #88ff88" : "none",
            }}
          />
          <span style={{ ...mono, fontSize: "8px", color: gyroStatus === "granted" ? "#aaaaaa" : "#444444", letterSpacing: "0.08em" }}>
            {gyroLabel}
          </span>
        </div>
      </div>

      {/* ══ 하단 HUD ══════════════════════════════════════════════ */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 100%)",
          padding: "14px 10px 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          zIndex: 20,
        }}
      >
        {/* 터치 좌표 */}
        <div style={{ ...mono, fontSize: "9px", lineHeight: 1.8, color: "#666666", pointerEvents: "none" }}>
          <div>X <span style={{ color: "#999999", fontSize: "10px" }}>{String(touchPos.x).padStart(3, "0")}</span></div>
          <div>Y <span style={{ color: "#999999", fontSize: "10px" }}>{String(touchPos.y).padStart(3, "0")}</span></div>
        </div>

        {/* iOS 권한 버튼 or 조작 힌트 */}
        {gyroStatus === "idle" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestGyro(); }}
            style={{
              ...mono,
              fontSize: "8px",
              color: "#cccccc",
              letterSpacing: "0.10em",
              background: "rgba(0,0,0,0.80)",
              border: "1px solid #555555",
              padding: "3px 8px",
              cursor: "pointer",
              animation: "neon-pulse 2s ease-in-out infinite",
            }}
          >
            ▶ ENABLE GYRO
          </button>
        ) : (
          <div style={{ ...mono, fontSize: "8px", color: "#444444", letterSpacing: "0.08em", textAlign: "right", lineHeight: 1.7, pointerEvents: "none" }}>
            {gyroStatus === "granted" ? <>TILT TO<br />EXPLORE</> : <>MOVE<br />MOUSE</>}
          </div>
        )}
      </div>

      {/* ══ 터치 리플 ═════════════════════════════════════════════ */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute pointer-events-none"
          style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)", zIndex: 30 }}
        >
          <div style={{
            position: "absolute", inset: "-14px",
            border: "1px solid rgba(255,255,255,0.4)",
            animation: "ripple-expand 0.65s ease-out forwards",
          }} />
          <div style={{
            position: "absolute", inset: "-7px",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: "ripple-expand 0.65s 0.08s ease-out forwards",
          }} />
          <div style={{
            position: "absolute", width: "3px", height: "3px",
            top: "-1.5px", left: "-1.5px",
            background: "rgba(255,255,255,0.7)",
          }} />
        </div>
      ))}
    </div>
  );
}
