"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelRoom
//  탑다운 시점의 픽셀 방 레이아웃.
//
//  핵심 원리: 방 안 오브젝트들을 높이(depth)에 따라 여러 레이어로 분리하고,
//  각 레이어에 CSS 변수(--gx, --gy)를 다른 배율로 적용하여
//  카메라(폰 화면) 기울기에 따라 가까운 물체가 더 많이 이동하는
//  시차 효과(Parallax Effect)를 만들어낸다.
//
//  CSS 변수는 부모 RoomContainer 가 deviceorientation 이벤트를
//  받아 설정하고, 이 컴포넌트는 순수하게 렌더링만 담당한다.
//
//  깊이 배율(DEPTH) 단위: px / 자이로도(°)
//  • 높을수록 카메라에 가깝고 시차가 크다
// ─────────────────────────────────────────────────────────────────────────────

// ──── 깊이 레이어 상수 ────
const DEPTH = {
  FLOOR:     0,     // 바닥 타일 — 기준면, 움직이지 않음
  RUG:       0.28,  // 바닥에 놓인 러그 (바닥과 거의 같은 높이)
  SHADOW:    0.18,  // 캐릭터 그림자 (바닥면에 투영됨)
  FURNITURE: 0.62,  // 가구 프레임 (침대, 책상, 책장)
  SURFACE:   0.95,  // 가구 윗면 (베개, 이불, 모니터)
  CHARACTER: 1.35,  // 캐릭터 본체 — 가장 많이 이동
} as const;

// ──── 헬퍼: 깊이에 따른 parallax transform 인라인 스타일 ────
// CSS calc() 로 CSS 변수를 곱해 오프셋을 계산.
// var(--gx, 0) 의 fallback 0 은 변수 미설정 시 찌그러짐 방지.
function px(depth: number): React.CSSProperties {
  if (depth === 0) return {};
  return {
    transform: `translate(calc(var(--gx, 0) * ${depth}px), calc(var(--gy, 0) * ${depth}px))`,
    willChange: "transform", // GPU 레이어 승격 힌트 → 부드러운 애니메이션
  };
}

// ──── 헬퍼: 방 내 절대 위치 스타일 ────
function pos(
  left: string,
  top: string,
  width: string,
  height: string,
  extra?: React.CSSProperties
): React.CSSProperties {
  return { position: "absolute", left, top, width, height, imageRendering: "pixelated", ...extra };
}

export default function PixelRoom() {
  return (
    // 루트: overflow hidden → 시차 이동 시 방 밖이 노출되지 않도록 클리핑
    <div
      className="absolute inset-0"
      style={{ background: "#050a05", overflow: "hidden", imageRendering: "pixelated" }}
    >

      {/* ═══════════════════════════════════════════════════
          LAYER 0 — 바닥 타일 (DEPTH = 0, 기준면, 고정)
          5×5 체스판 패턴 그리드. 폰을 아무리 기울여도 움직이지 않는
          기준 레이어. 이 위의 오브젝트들이 이동함으로써 상대적 깊이감이 생긴다.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0">
        {/* 바닥 + 벽 외곽선 */}
        <div
          className="absolute"
          style={{
            inset: "4%",
            border: "3px solid #1e3d1e",
            boxShadow: "inset 0 0 0 1px #0d1a0d, inset 0 0 20px rgba(0,0,0,0.6)",
          }}
        />
        {/* 5×5 타일 그리드 */}
        <div
          className="absolute"
          style={{
            inset: "4%",
            display: "grid",
            gridTemplate: "repeat(5, 1fr) / repeat(5, 1fr)",
          }}
        >
          {Array.from({ length: 25 }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            return (
              <div
                key={i}
                style={{
                  background: (col + row) % 2 === 0 ? "#0c1c0c" : "#081408",
                  borderRight:  col < 4 ? "1px solid #162816" : "none",
                  borderBottom: row < 4 ? "1px solid #162816" : "none",
                  imageRendering: "pixelated",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 1 — 러그 (DEPTH = 0.28)
          바닥에 깔린 러그는 바닥보다 아주 조금 더 이동.
          시차 차이가 작아 "바닥에 납작하게 붙어있음"을 표현.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={px(DEPTH.RUG)}>
        <div
          style={pos("27%", "28%", "42%", "38%", {
            background: "#091909",
            border: "2px solid #1a4022",
            boxShadow: "inset 0 0 0 4px #0d1a0d",
          })}
        >
          {/* 러그 내부 테두리 패턴 */}
          <div style={{ position: "absolute", inset: "5px", border: "1px solid #1a3a1a", opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: "10px", border: "1px solid #162e16", opacity: 0.4 }} />
          {/* 러그 중앙 심볼 */}
          <div
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              width: "20%", height: "20%",
              border: "1px solid #1e4020",
              background: "#0a1e0a",
            }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 2 — 캐릭터 그림자 (DEPTH = 0.18)
          그림자는 바닥에 투영되므로 바닥보다 약간만 이동.
          캐릭터(DEPTH=1.35)와의 차이가 "떠 있는 높이감"을 만든다.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={px(DEPTH.SHADOW)}>
        <div
          style={{
            ...pos("44%", "50%", "10%", "5%"),
            background: "rgba(0,0,0,0.55)",
            borderRadius: "50%",
            filter: "blur(3px)",
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 3 — 가구 프레임 (DEPTH = 0.62)
          침대 프레임, 책상, 책장 등 가구의 베이스.
          러그보다 더 이동 → "바닥에서 떠있는 물체" 느낌.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={px(DEPTH.FURNITURE)}>

        {/* ── 침대 (우측 상단) ── */}
        <div
          style={pos("62%", "5%", "32%", "50%", {
            background: "#09172a",
            border: "2px solid #1a3660",
          })}
        >
          {/* 헤드보드 (위쪽) */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, height: "14%",
              background: "#0d2248",
              border: "1px solid #2a4a88",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
            }}
          />
          {/* 침대 프레임 내부 (매트리스 공간) */}
          <div
            style={{
              position: "absolute",
              inset: "14% 4% 4%",
              background: "#070f1e",
              border: "1px solid #0e2040",
            }}
          />
        </div>

        {/* ── 책상 (좌측 하단) ── */}
        <div
          style={pos("5%", "70%", "38%", "24%", {
            background: "#061b0e",
            border: "2px solid #143824",
          })}
        >
          {/* 책상 상판 질감 라인 */}
          {[0.33, 0.66].map((x) => (
            <div
              key={x}
              style={{
                position: "absolute",
                left: `${x * 100}%`, top: 0, bottom: 0,
                width: "1px",
                background: "#0d2a18",
              }}
            />
          ))}
        </div>

        {/* ── 책장 (좌측 벽) ── */}
        <div
          style={pos("5%", "12%", "10%", "48%", {
            background: "#0b160b",
            border: "2px solid #1a321a",
          })}
        >
          {/* 선반 구분선 5개 */}
          {[0.17, 0.34, 0.51, 0.68, 0.85].map((y) => (
            <div
              key={y}
              style={{
                position: "absolute",
                left: 0, right: 0,
                top: `${y * 100}%`,
                height: "2px",
                background: "#1a321a",
              }}
            />
          ))}
        </div>

        {/* ── 작은 원형 화분 (우측 하단) ── */}
        <div
          style={{
            ...pos("66%", "72%", "8%", "8%"),
            background: "#0e1e0e",
            border: "2px solid #1e3e1e",
            borderRadius: "50%",
          }}
        >
          <div style={{ position: "absolute", inset: "3px", background: "#0a2a0a", borderRadius: "50%" }} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 4 — 가구 표면 (DEPTH = 0.95)
          베개, 이불, 모니터, 키보드, 책 등 가구 위에 놓인 물건들.
          가구 프레임보다 더 많이 이동 → 가구가 입체적으로 보임.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={px(DEPTH.SURFACE)}>

        {/* 베개 (침대 머리 쪽) */}
        <div
          style={pos("63%", "20%", "28%", "12%", {
            background: "#122a1c",
            border: "1px solid #204a2c",
          })}
        >
          {/* 베개 봉제선 */}
          <div style={{ position: "absolute", inset: "4px", border: "1px solid #1a3a22", opacity: 0.5 }} />
        </div>

        {/* 이불 */}
        <div
          style={pos("63%", "34%", "30%", "20%", {
            background: "#0a1c30",
            border: "1px solid #163050",
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,60,140,0.10) 3px, rgba(0,60,140,0.10) 4px)",
          })}
        >
          {/* 이불 주름선 */}
          <div style={{ position: "absolute", left: "30%", top: 0, bottom: 0, width: "1px", background: "#0e2440", opacity: 0.6 }} />
          <div style={{ position: "absolute", left: "60%", top: 0, bottom: 0, width: "1px", background: "#0e2440", opacity: 0.6 }} />
        </div>

        {/* 모니터 (탑다운: 직사각형 + 화면 글로우) */}
        <div
          style={pos("7%", "72%", "16%", "14%", {
            background: "#001a0a",
            border: "1px solid #00aa44",
          })}
        >
          {/* 화면 영역 */}
          <div
            style={{
              position: "absolute", inset: "3px",
              background: "#002d12",
              boxShadow: "0 0 6px rgba(0,255,100,0.35), inset 0 0 4px rgba(0,255,100,0.15)",
            }}
          >
            {/* 화면 반사 하이라이트 */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "35%", background: "rgba(0,255,150,0.06)" }} />
          </div>
        </div>

        {/* 키보드 */}
        <div
          style={pos("25%", "74%", "16%", "8%", {
            background: "#0a1a0a",
            border: "1px solid #182818",
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,80,0,0.20) 5px, rgba(0,80,0,0.20) 6px)",
          })}
        />

        {/* 책 등 (책장 칸마다 색상 다르게) */}
        {[
          { color: "#002200", accent: "#00cc44", top: "13%" },
          { color: "#000022", accent: "#0044dd", top: "24%" },
          { color: "#220000", accent: "#dd2200", top: "35%" },
          { color: "#002222", accent: "#00cccc", top: "46%" },
          { color: "#110022", accent: "#8800cc", top: "57%" },
        ].map(({ color, accent, top }) => (
          <div
            key={top}
            style={pos("5%", top, "10%", "8%", {
              background: color,
              borderLeft: `2px solid ${accent}`,
              borderBottom: "1px solid #1a321a",
            })}
          />
        ))}

        {/* 책상 위 발광 소품 */}
        <div
          style={pos("8%", "71%", "4%", "6%", {
            background: "#00ff88",
            boxShadow: "0 0 5px #00ff88, 0 0 10px rgba(0,255,136,0.4)",
          })}
        />

        {/* 화분 식물 (원형 위에 초록 점) */}
        <div
          style={{
            ...pos("67.5%", "73.5%", "5%", "5%"),
            background: "#00aa22",
            borderRadius: "50%",
            boxShadow: "0 0 3px rgba(0,200,50,0.3)",
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 5 — 캐릭터 (DEPTH = 1.35, 가장 높은 시차)
          서 있는 캐릭터는 방에서 가장 높은 위치.
          기울일수록 그림자(DEPTH=0.18)와 벌어지는 차이가
          "캐릭터가 실제로 떠있는 것 같은" 입체감을 만든다.
      ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={px(DEPTH.CHARACTER)}>
        <div style={pos("45%", "43%", "11%", "13%")}>

          {/* 몸통 (탑다운: 아래쪽 직사각형) */}
          <div
            style={{
              position: "absolute",
              left: "15%", top: "42%", right: "15%", bottom: 0,
              background: "#00cc33",
              border: "2px solid #009922",
              imageRendering: "pixelated",
            }}
          />

          {/* 머리 (탑다운: 위쪽 정사각형, 더 밝음) */}
          <div
            style={{
              position: "absolute",
              top: 0, left: "20%", right: "20%", height: "46%",
              background: "#00ff44",
              border: "2px solid #00cc22",
              imageRendering: "pixelated",
            }}
          >
            {/* 머리카락 */}
            <div
              style={{
                position: "absolute",
                top: "8%", left: "12%", right: "12%", height: "32%",
                background: "#003300",
                imageRendering: "pixelated",
              }}
            />
            {/* 눈 (2개 픽셀 점) */}
            <div style={{ position: "absolute", bottom: "18%", left: "20%", width: "18%", height: "18%", background: "#000" }} />
            <div style={{ position: "absolute", bottom: "18%", right: "20%", width: "18%", height: "18%", background: "#000" }} />
          </div>
        </div>
      </div>

    </div>
  );
}
