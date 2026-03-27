"use client";

import React, { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  CeilingWindow (유리 천장 레이어)
//
//  폰 화면을 "방을 내려다보는 투명한 유리창"으로 표현한다.
//  이 컴포넌트는 RoomContainer 위에 absolute 로 겹쳐서:
//    1. 유리 창문 격자 / 반사광 효과 (CSS 배경 + 그라디언트)
//    2. HUD 오버레이 (상단 타이틀·자이로 상태 / 하단 좌표·힌트)
//    3. 터치·클릭 이벤트 캐치 → 좌표 표시 + 햅틱 진동
//    4. 터치 리플 이펙트 (pixel 스타일 파문)
//    5. iOS 자이로 권한 버튼 (필요 시)
//  를 담당한다.
// ─────────────────────────────────────────────────────────────────────────────

export type GyroStatus = "idle" | "granted" | "denied";

interface TouchPos {
  x: number;
  y: number;
}

interface CeilingWindowProps {
  touchPos:       TouchPos;
  gyroStatus:     GyroStatus;
  onTap:          (x: number, y: number) => void;
  onRequestGyro:  () => void;
}

interface Ripple {
  id:   number;
  x:    number;
  y:    number;
}

let rippleSeq = 0; // 리플 고유 ID 시퀀스

export default function CeilingWindow({
  touchPos,
  gyroStatus,
  onTap,
  onRequestGyro,
}: CeilingWindowProps) {
  // 화면에 동시에 여러 리플이 생길 수 있으므로 배열로 관리
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // ─────────────────────────────────
  //  포인터(터치/마우스) 눌림 핸들러
  // ─────────────────────────────────
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = Math.round(e.clientX - rect.left);
    const y    = Math.round(e.clientY - rect.top);

    // 좌표 + 햅틱 진동 콜백 호출
    onTap(x, y);

    // 리플 추가
    const id = ++rippleSeq;
    setRipples((prev) => [...prev, { id, x, y }]);

    // 애니메이션(600ms) 후 리플 제거
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
  }

  // ── 자이로 상태 표시 문자 ──
  const gyroLabel =
    gyroStatus === "granted" ? "GYRO ●" :
    gyroStatus === "denied"  ? "MOUSE ○" :
                               "GYRO ○";

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 10, cursor: "crosshair", touchAction: "none" }}
      onPointerDown={handlePointerDown}
    >

      {/* ═══════════════════════════════════════════════════
          유리 창문 격자선
          4×4 격자 (배경 크기 25%×25%) 로 창틀을 표현.
          매우 낮은 불투명도로 방 아래가 선명하게 보이도록.
      ═══════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,100,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,100,0.045) 1px, transparent 1px)
          `,
          backgroundSize: "25% 25%",
        }}
      />

      {/* ═══════════════════════════════════════════════════
          유리 상단 반사광 (빛이 위에서 들어오는 느낌)
      ═══════════════════════════════════════════════════ */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0, left: 0, right: 0,
          height: "30%",
          background: "linear-gradient(to bottom, rgba(0,255,200,0.055) 0%, transparent 100%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════
          모서리 반사 스팟 (유리 코너 하이라이트)
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: "absolute", top: 0, left: 0, width: "22%", height: "22%",
          background: "radial-gradient(circle at 0% 0%, rgba(0,255,200,0.12) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, width: "22%", height: "22%",
          background: "radial-gradient(circle at 100% 0%, rgba(0,255,200,0.09) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "50%", height: "15%",
          background: "radial-gradient(ellipse, rgba(0,255,100,0.04) 0%, transparent 70%)",
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════
          테두리 네온 프레임
      ═══════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: "1px solid rgba(0,255,100,0.18)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.15)",
        }}
      />

      {/* ═══════════════════════════════════════════════════
          HUD — 상단 바
          [POCKET GOCHI] ←──────→ [GYRO 상태]
      ═══════════════════════════════════════════════════ */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
          padding: "6px 8px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "9px",
            color: "#00ff66",
            letterSpacing: "0.15em",
            imageRendering: "pixelated",
          }}
        >
          POCKET GOCHI
        </span>

        {/* 자이로 상태 표시 */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* 상태 LED */}
          <div
            style={{
              width: "5px", height: "5px",
              background: gyroStatus === "granted" ? "#00ff66" : "#1a3a1a",
              boxShadow: gyroStatus === "granted" ? "0 0 5px #00ff66" : "none",
              imageRendering: "pixelated",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "8px",
              color: gyroStatus === "granted" ? "#00cc44" : "#2a5a2a",
              letterSpacing: "0.08em",
            }}
          >
            {gyroLabel}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          HUD — 하단 바
          [X: 000  Y: 000] ←───→ [힌트 or iOS 버튼]
      ═══════════════════════════════════════════════════ */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 100%)",
          padding: "10px 8px 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          zIndex: 20,
        }}
      >
        {/* 좌표 디스플레이 — 터치할 때마다 업데이트 */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "9px",
            lineHeight: 1.8,
            color: "#00aa44",
            imageRendering: "pixelated",
            pointerEvents: "none",
          }}
        >
          <div>
            X{" "}
            <span style={{ color: "#00ff88", fontSize: "10px" }}>
              {String(touchPos.x).padStart(3, "0")}
            </span>
          </div>
          <div>
            Y{" "}
            <span style={{ color: "#00ff88", fontSize: "10px" }}>
              {String(touchPos.y).padStart(3, "0")}
            </span>
          </div>
        </div>

        {/* iOS 자이로 권한 버튼 or 조작 힌트 */}
        {gyroStatus === "idle" ? (
          // iOS: 사용자 제스처로만 requestPermission() 호출 가능
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestGyro();
            }}
            style={{
              fontFamily: "monospace",
              fontSize: "8px",
              color: "#00ff66",
              letterSpacing: "0.10em",
              background: "rgba(0,0,0,0.75)",
              border: "1px solid #00ff66",
              padding: "3px 7px",
              cursor: "pointer",
              imageRendering: "pixelated",
              animation: "neon-pulse 2s ease-in-out infinite",
            }}
          >
            ▶ ENABLE GYRO
          </button>
        ) : (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "8px",
              color: "#2a5a2a",
              letterSpacing: "0.08em",
              textAlign: "right",
              lineHeight: 1.7,
              pointerEvents: "none",
            }}
          >
            {gyroStatus === "granted" ? (
              <>
                TILT TO<br />EXPLORE
              </>
            ) : (
              <>
                MOVE<br />MOUSE
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          터치 리플 효과
          픽셀 스타일 동심원 파문: CSS animation-ripple-expand 사용.
          여러 리플이 동시에 표시될 수 있도록 배열로 관리.
      ═══════════════════════════════════════════════════ */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute pointer-events-none"
          style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)", zIndex: 30 }}
        >
          {/* 외곽 확장 링 */}
          <div
            style={{
              position: "absolute",
              inset: "-14px",
              border: "2px solid rgba(0,255,100,0.7)",
              animation: "ripple-expand 0.65s ease-out forwards",
              imageRendering: "pixelated",
            }}
          />
          {/* 중간 링 (약간 딜레이) */}
          <div
            style={{
              position: "absolute",
              inset: "-7px",
              border: "1px solid rgba(0,255,100,0.5)",
              animation: "ripple-expand 0.65s 0.08s ease-out forwards",
              imageRendering: "pixelated",
            }}
          />
          {/* 중심 픽셀 점 */}
          <div
            style={{
              position: "absolute",
              width: "4px", height: "4px",
              top: "-2px", left: "-2px",
              background: "#00ff66",
              boxShadow: "0 0 4px #00ff66",
              imageRendering: "pixelated",
            }}
          />
        </div>
      ))}
    </div>
  );
}
