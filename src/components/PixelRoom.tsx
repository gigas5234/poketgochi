"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PixelRoom — 다중 레이어 패럴랙스 탑다운 픽셀 방
//
//  ── CSS 변수 기반 깊이 시스템 ──
//  부모 RoomContainer 가 --tilt-x / --tilt-y 를 unitless 숫자로 설정.
//  각 레이어는 자신의 --depth 를 px 단위로 독립 설정.
//
//  transform: translate(
//    calc(var(--tilt-x) * var(--depth)),   ← unitless × px = px ✓
//    calc(var(--tilt-y) * var(--depth))
//  )
//
//  ── 레이어 깊이 배치 (사용자 지정) ──
//  Layer 0 (HUD/유리창): depth=0  → 움직임 없음  (폰 화면에 붙어있음)
//  Layer 3 (바닥/그림자): depth=0.3px → 아주 조금 (가장 멀리, 기준에 가까움)
//  Layer 2 (가구/캐릭터 발): depth=1.0px → 중간 이동
//  Layer 1 (캐릭터 머리/높은 가구 상단): depth=1.5px → 가장 크게 이동
//
//  기울기 20° 기준 최대 이동량:
//    Layer 3: 20 × 0.3px = 6px
//    Layer 2: 20 × 1.0px = 20px
//    Layer 1: 20 × 1.5px = 30px
//  Layer 3 vs Layer 1 차이: 24px → "캐릭터가 실제로 서 있는" 입체감 생성
// ─────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────
//  Layer 컴포넌트
//  --depth CSS 변수를 설정하고 parallax transform 을 적용.
//  TypeScript 에서 커스텀 CSS 변수를 inline style 로 쓰려면
//  Record<string, string> 으로 타입 캐스팅 필요.
// ──────────────────────────────────────────────────────
function Layer({
  depth,
  children,
  className = "",
}: {
  depth: number;          // px 단위 깊이 (e.g. 1.5 → "--depth: 1.5px")
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={
        {
          // --depth 를 이 요소에 설정 → transform calc() 에서 참조
          "--depth": depth === 0 ? undefined : `${depth}px`,
          transform:
            depth === 0
              ? "none"
              : "translate(calc(var(--tilt-x, 0) * var(--depth, 0px)), calc(var(--tilt-y, 0) * var(--depth, 0px)))",
          willChange: depth > 0 ? "transform" : "auto",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────
//  위치 헬퍼: absolute 포지셔닝 + pixelated 렌더링
// ──────────────────────────────────────────────────────
function at(
  left: string,
  top: string,
  width: string,
  height: string,
  extra: React.CSSProperties = {}
): React.CSSProperties {
  return {
    position: "absolute",
    left, top, width, height,
    imageRendering: "pixelated",
    ...extra,
  };
}

export default function PixelRoom() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "#030803", overflow: "hidden", imageRendering: "pixelated" }}
    >

      {/* ═══════════════════════════════════════════════════════════════
          ██ LAYER 3 — 바닥 & 그림자 (depth = 0.3px)
          가장 먼 레이어. 기울여도 거의 움직이지 않아 기준면 역할.
          ∙ 5×5 체스판 타일 그리드
          ∙ 천장 램프 조명 투영 (방 중앙 원형 글로우)
          ∙ 캐릭터 그림자 (바닥에 투영됨, 캐릭터와 차이로 부유감 생성)
          ∙ 러그
      ═══════════════════════════════════════════════════════════════ */}
      <Layer depth={0.3}>

        {/* ── 벽 외곽 보더 ── */}
        <div
          style={at("0%", "0%", "100%", "100%", {
            border: "4px solid #1a3a1a",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.7), inset 0 0 0 1px #0d1a0d",
          })}
        />

        {/* ── 5×5 바닥 타일 ── */}
        <div
          style={{
            position: "absolute",
            inset: "4%",
            display: "grid",
            gridTemplate: "repeat(5, 1fr) / repeat(5, 1fr)",
          }}
        >
          {Array.from({ length: 25 }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            // 체스판 패턴 + 모서리 타일 특수 강조
            const isCorner = (col === 0 || col === 4) && (row === 0 || row === 4);
            const isEdge   = col === 0 || col === 4 || row === 0 || row === 4;
            const base     = (col + row) % 2 === 0 ? "#0d1d0d" : "#081308";
            const bg       = isCorner ? "#0e2010" : isEdge ? "#0a1a0a" : base;
            return (
              <div
                key={i}
                style={{
                  background: bg,
                  borderRight:  col < 4 ? "1px solid #142414" : "none",
                  borderBottom: row < 4 ? "1px solid #142414" : "none",
                  boxShadow: isCorner ? "inset 0 0 0 1px #1a3a1a" : undefined,
                  imageRendering: "pixelated",
                }}
              />
            );
          })}
        </div>

        {/* ── 바닥 타일 네온 강조선 (가로/세로 2줄씩) ── */}
        {/* 가로 강조선 */}
        {["32%", "64%"].map((top) => (
          <div
            key={top}
            style={at("4%", top, "92%", "1px", {
              background: "linear-gradient(90deg, transparent, rgba(0,180,60,0.12) 20%, rgba(0,180,60,0.12) 80%, transparent)",
            })}
          />
        ))}
        {/* 세로 강조선 */}
        {["32%", "64%"].map((left) => (
          <div
            key={left}
            style={at(left, "4%", "1px", "92%", {
              background: "linear-gradient(180deg, transparent, rgba(0,180,60,0.12) 20%, rgba(0,180,60,0.12) 80%, transparent)",
            })}
          />
        ))}

        {/* ── 천장 조명 투영 (방 중앙 원형 글로우) ── */}
        {/* 탑다운 시점에서 위에서 내려오는 빛이 바닥에 맺히는 형태 */}
        <div
          style={at("25%", "25%", "50%", "50%", {
            background: "radial-gradient(ellipse, rgba(0,255,100,0.055) 0%, transparent 70%)",
            pointerEvents: "none",
          })}
        />

        {/* ── 책상 영역 보조 조명 (모니터 빛이 바닥으로) ── */}
        <div
          style={at("5%", "62%", "30%", "22%", {
            background: "radial-gradient(ellipse, rgba(0,255,80,0.04) 0%, transparent 70%)",
          })}
        />

        {/* ── 러그 ── */}
        <div
          style={at("28%", "30%", "40%", "36%", {
            background: "#091a09",
            border: "2px solid #1a3820",
            boxShadow: "inset 0 0 0 5px #0b160b, inset 0 0 16px rgba(0,0,0,0.4)",
          })}
        >
          {/* 러그 테두리 패턴 */}
          <div style={{ position: "absolute", inset: "6px", border: "1px solid #163016", opacity: 0.8 }} />
          <div style={{ position: "absolute", inset: "11px", border: "1px solid #122612", opacity: 0.5 }} />
          {/* 러그 중앙 다이아몬드 문양 */}
          <div
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%) rotate(45deg)",
              width: "18%", height: "18%",
              border: "1px solid #1e4020",
              background: "#0a1e0a",
            }}
          />
          {/* 대각선 장식선 */}
          <div style={{ position: "absolute", inset: "14px", border: "none",
                        backgroundImage: "linear-gradient(45deg, rgba(0,80,20,0.15) 25%, transparent 25%, transparent 75%, rgba(0,80,20,0.15) 75%)",
                        backgroundSize: "8px 8px" }} />
        </div>

        {/* ── 캐릭터 그림자 ── */}
        {/* floor 레이어에 있어 캐릭터(Layer 1)와 분리됨 → 기울이면 그림자와 캐릭터가 벌어짐 */}
        <div
          style={at("44%", "48%", "11%", "6%", {
            background: "rgba(0,0,0,0.6)",
            borderRadius: "50%",
            filter: "blur(4px)",
          })}
        />

        {/* ── 침대 발치 그림자 ── */}
        <div
          style={at("62%", "53%", "32%", "3%", {
            background: "rgba(0,0,0,0.35)",
            filter: "blur(3px)",
          })}
        />

      </Layer>


      {/* ═══════════════════════════════════════════════════════════════
          ██ LAYER 2 — 가구 & 캐릭터 몸통 (depth = 1.0px)
          ∙ 침대 프레임 + 매트리스
          ∙ 책상 프레임
          ∙ 책장 (프레임)
          ∙ 캐릭터 몸통 (발 위치)
          ∙ 화분 포트
          ∙ 벽 몰딩 네온 라인
      ═══════════════════════════════════════════════════════════════ */}
      <Layer depth={1.0}>

        {/* ── 벽 네온 몰딩 (바닥과 벽이 만나는 경계선) ── */}
        {/* 북쪽 */}
        <div style={at("4%", "4%", "92%", "2px", { background: "linear-gradient(90deg, transparent, #00ff66 20%, #00ff66 80%, transparent)", opacity: 0.25 })} />
        {/* 남쪽 */}
        <div style={at("4%", "calc(96% - 2px)", "92%", "2px", { background: "linear-gradient(90deg, transparent, #00ff66 20%, #00ff66 80%, transparent)", opacity: 0.25 })} />
        {/* 서쪽 */}
        <div style={at("4%", "4%", "2px", "92%", { background: "linear-gradient(180deg, transparent, #00ff66 20%, #00ff66 80%, transparent)", opacity: 0.25 })} />
        {/* 동쪽 */}
        <div style={at("calc(96% - 2px)", "4%", "2px", "92%", { background: "linear-gradient(180deg, transparent, #00ff66 20%, #00ff66 80%, transparent)", opacity: 0.25 })} />

        {/* ── 침대 프레임 (우측 상단) ── */}
        <div
          style={at("62%", "5%", "33%", "50%", {
            background: "#08162a",
            border: "2px solid #1a3460",
            boxShadow: "inset 0 0 12px rgba(0,0,0,0.5)",
          })}
        >
          {/* 헤드보드 */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "14%",
              background: "linear-gradient(to bottom, #0e2248, #0a1a3a)",
              borderBottom: "1px solid #2a4880",
            }}
          />
          {/* 발치 보드 */}
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "6%",
              background: "#0a1a3a",
              borderTop: "1px solid #1a3060",
            }}
          />
          {/* 매트리스 */}
          <div
            style={{
              position: "absolute", inset: "14% 5% 6%",
              background: "#06101e",
              border: "1px solid #0e2040",
            }}
          />
          {/* 침대 모서리 볼트 */}
          {[["3%","2%"], ["3%","92%"], ["95%","2%"], ["95%","92%"]].map(([l, t]) => (
            <div key={`${l}${t}`} style={{ position:"absolute", left:l, top:t, width:"4%", height:"3%", background:"#1a3060" }} />
          ))}
        </div>

        {/* ── 책상 프레임 (좌측 하단) ── */}
        <div
          style={at("5%", "70%", "38%", "24%", {
            background: "#06180c",
            border: "2px solid #133822",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.4)",
          })}
        >
          {/* 상판 목재 결 */}
          {[0.25, 0.5, 0.75].map((x) => (
            <div key={x} style={{ position:"absolute", left:`${x*100}%`, top:0, bottom:0, width:"1px", background:"#0a2012", opacity:0.6 }} />
          ))}
          {/* 앞쪽 선반 테두리 */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"8%", background:"#081a0e", borderTop:"1px solid #143020" }} />
        </div>

        {/* ── 책장 프레임 (좌측 벽) ── */}
        <div
          style={at("5%", "10%", "9%", "50%", {
            background: "#0a160a",
            border: "2px solid #183018",
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.5)",
          })}
        >
          {/* 선반 6칸 */}
          {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((y) => (
            <div key={y} style={{ position:"absolute", left:0, right:0, top:`${y*100}%`, height:"2px", background:"#1a3018" }} />
          ))}
          {/* 측판 강조 */}
          <div style={{ position:"absolute", top:0, bottom:0, right:0, width:"3px", background:"#162816" }} />
        </div>

        {/* ── 화분 포트 (우측 하단) ── */}
        <div
          style={{
            ...at("67%", "73%", "9%", "9%", {
              background: "#0e1e0e",
              border: "2px solid #1e3e1e",
              borderRadius: "2px",
            }),
          }}
        >
          {/* 받침대 */}
          <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:"20%", background:"#0a1a0a" }} />
        </div>

        {/* ── 소형 협탁 (침대 옆) ── */}
        <div
          style={at("58%", "5%", "8%", "12%", {
            background: "#071520",
            border: "1px solid #143050",
          })}
        >
          {/* 서랍선 */}
          <div style={{ position:"absolute", left:0, right:0, top:"50%", height:"1px", background:"#143050" }} />
        </div>

        {/* ── 캐릭터 몸통 (하체) ── */}
        {/* 몸통은 Layer 2, 머리는 Layer 1 → 기울이면 머리가 더 많이 이동 */}
        <div
          style={at("46%", "47%", "9%", "6%", {
            background: "#00cc33",
            border: "2px solid #009922",
          })}
        >
          {/* 발 구분선 */}
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:"1px", background:"#008818" }} />
        </div>

        {/* ── 캐릭터 배낭/아이템 (몸통 뒤) ── */}
        <div
          style={at("44%", "47%", "4%", "5%", {
            background: "#996600",
            border: "1px solid #cc8800",
          })}
        />

      </Layer>


      {/* ═══════════════════════════════════════════════════════════════
          ██ LAYER 1 — 캐릭터 머리 & 높은 가구 상단 (depth = 1.5px)
          가장 많이 이동하는 레이어. Layer 3 대비 24px 차이 →
          "캐릭터가 실제로 서 있는" 것 같은 깊이감의 핵심.
          ∙ 캐릭터 머리
          ∙ 침대 이불·베개 (가구 윗면)
          ∙ 책 (책장에서 위로 솟은 부분)
          ∙ 모니터 (책상 위)
          ∙ 화분 식물 잎사귀
          ∙ 협탁 조명
          ∙ 발광 오브젝트
      ═══════════════════════════════════════════════════════════════ */}
      <Layer depth={1.5}>

        {/* ── 캐릭터 머리 ── */}
        {/* Layer 1 이라 기울이면 몸통(Layer 2)에서 분리되어 보임 → 키 높이 표현 */}
        <div
          style={at("46%", "42%", "9%", "8%", {
            background: "#00ff44",
            border: "2px solid #00cc22",
            boxShadow: "0 0 6px rgba(0,255,70,0.3)",
          })}
        >
          {/* 머리카락 */}
          <div style={{ position:"absolute", top:"8%", left:"12%", right:"12%", height:"30%", background:"#002a00" }} />
          {/* 눈 (좌) */}
          <div style={{ position:"absolute", bottom:"22%", left:"18%", width:"18%", height:"20%", background:"#001a00" }}>
            <div style={{ position:"absolute", inset:"1px", background:"#66ffaa" }} />
          </div>
          {/* 눈 (우) */}
          <div style={{ position:"absolute", bottom:"22%", right:"18%", width:"18%", height:"20%", background:"#001a00" }}>
            <div style={{ position:"absolute", inset:"1px", background:"#66ffaa" }} />
          </div>
          {/* 입 */}
          <div style={{ position:"absolute", bottom:"10%", left:"30%", right:"30%", height:"8%", background:"#002200" }} />
        </div>

        {/* ── 캐릭터 글로우 링 (발광 오라) ── */}
        <div
          style={at("42%", "40%", "17%", "16%", {
            border: "1px solid rgba(0,255,80,0.2)",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(0,255,80,0.1)",
          })}
        />

        {/* ── 침대 베개 ── */}
        <div
          style={at("63%", "19%", "30%", "12%", {
            background: "#162c1e",
            border: "1px solid #224a2e",
            boxShadow: "inset 0 0 6px rgba(0,0,0,0.4)",
          })}
        >
          <div style={{ position:"absolute", inset:"4px", border:"1px solid #1a3a24", opacity:0.6 }} />
          {/* 베개 솔기 */}
          <div style={{ position:"absolute", top:"40%", left:"10%", right:"10%", height:"1px", background:"#1a3a24", opacity:0.5 }} />
        </div>

        {/* ── 침대 이불 ── */}
        <div
          style={at("63%", "33%", "31%", "22%", {
            background: "#0a1c30",
            border: "1px solid #163050",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,60,140,0.10) 3px, rgba(0,60,140,0.10) 4px)",
          })}
        >
          {/* 이불 주름 */}
          {["25%","50%","75%"].map((l) => (
            <div key={l} style={{ position:"absolute", left:l, top:0, bottom:0, width:"1px", background:"#0e2440", opacity:0.5 }} />
          ))}
          {/* 이불 자수 패턴 */}
          <div style={{ position:"absolute", left:"10%", top:"20%", width:"12%", height:"60%", border:"1px solid rgba(0,80,200,0.2)" }} />
        </div>

        {/* ── 침대 옆 조명 (협탁 위 램프) ── */}
        <div
          style={at("59%", "5%", "4%", "4%", {
            background: "#ffcc44",
            boxShadow: "0 0 8px rgba(255,200,50,0.6), 0 0 20px rgba(255,180,30,0.2)",
            borderRadius: "50%",
          })}
        />
        {/* 램프 빛 번짐 */}
        <div
          style={at("54%", "3%", "14%", "12%", {
            background: "radial-gradient(ellipse, rgba(255,200,50,0.10) 0%, transparent 70%)",
          })}
        />

        {/* ── 모니터 (책상 위, 화면 글로우 포함) ── */}
        <div
          style={at("7%", "71%", "17%", "15%", {
            background: "#001a0a",
            border: "1px solid #00aa44",
            boxShadow: "0 0 8px rgba(0,255,80,0.25)",
          })}
        >
          <div
            style={{
              position:"absolute", inset:"3px",
              background: "#002d12",
              boxShadow: "0 0 6px rgba(0,255,100,0.4), inset 0 0 6px rgba(0,255,100,0.15)",
            }}
          >
            {/* 화면 내용 (픽셀 UI 느낌) */}
            <div style={{ position:"absolute", top:"15%", left:"10%", right:"10%", height:"2px", background:"rgba(0,255,80,0.5)" }} />
            <div style={{ position:"absolute", top:"35%", left:"10%", width:"40%", height:"2px", background:"rgba(0,255,80,0.3)" }} />
            <div style={{ position:"absolute", top:"55%", left:"10%", right:"10%", height:"2px", background:"rgba(0,255,80,0.3)" }} />
            <div style={{ position:"absolute", top:"75%", left:"10%", width:"25%", height:"2px", background:"rgba(0,255,80,0.2)" }} />
            {/* 화면 상단 반사 */}
            <div style={{ position:"absolute", top:0, left:0, width:"40%", height:"30%", background:"rgba(0,255,150,0.05)" }} />
          </div>
        </div>

        {/* ── 키보드 ── */}
        <div
          style={at("26%", "74%", "15%", "8%", {
            background: "#0a1a0a",
            border: "1px solid #182818",
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,80,0,0.25) 4px, rgba(0,80,0,0.25) 5px)",
          })}
        />

        {/* ── 발광 소품 (책상 위) ── */}
        <div
          style={at("8%", "70%", "5%", "7%", {
            background: "#00ff88",
            boxShadow: "0 0 8px #00ff88, 0 0 16px rgba(0,255,136,0.4)",
          })}
        />

        {/* ── 책 등 (책장 칸별 색상) ── */}
        {[
          { accent: "#00ff66", top: "11%", h: "7%" },
          { accent: "#4488ff", top: "24%", h: "7%" },
          { accent: "#ff4444", top: "37%", h: "7%" },
          { accent: "#ffcc00", top: "49%", h: "6%" },
          { accent: "#cc44ff", top: "60%", h: "7%" },
        ].map(({ accent, top, h }) => (
          <div
            key={top}
            style={at("5%", top, "9%", h, {
              borderLeft: `2px solid ${accent}`,
              borderBottom: "1px solid #1a321a",
              background: "rgba(0,0,0,0.3)",
              boxShadow: `inset 2px 0 0 rgba(${accent.replace('#','').match(/.{2}/g)?.map(h=>parseInt(h,16)).join(',')},0.15)`,
            })}
          />
        ))}

        {/* ── 화분 식물 잎 (원형 + 글로우) ── */}
        <div
          style={at("68%", "74%", "7%", "7%", {
            background: "#00aa22",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(0,180,40,0.4), inset 0 0 4px rgba(0,0,0,0.3)",
          })}
        >
          {/* 잎맥 */}
          <div style={{ position:"absolute", left:"50%", top:"10%", bottom:"10%", width:"1px", background:"rgba(0,80,0,0.5)", transform:"translateX(-50%)" }} />
          <div style={{ position:"absolute", top:"50%", left:"10%", right:"10%", height:"1px", background:"rgba(0,80,0,0.5)", transform:"translateY(-50%)" }} />
        </div>

        {/* ── 벽 포스터 (북쪽 벽 위, 아주 높이 있음) ── */}
        {/* 탑다운에서 벽에 걸린 물건은 아주 조금만 보이지만
            이 위치에 있으면 가장 많이 이동해 높이 차이를 극적으로 표현 */}
        <div
          style={at("28%", "4%", "22%", "6%", {
            background: "#0a0a1a",
            border: "1px solid #2a2a5a",
            boxShadow: "0 0 4px rgba(60,60,200,0.2)",
          })}
        >
          {/* 포스터 내용 (픽셀 아트) */}
          <div style={{ position:"absolute", inset:"2px", background:"#060614",
                        backgroundImage:"radial-gradient(ellipse at 50% 50%, rgba(80,80,255,0.15) 0%, transparent 70%)" }} />
          <div style={{ position:"absolute", top:"20%", left:"20%", right:"20%", height:"1px", background:"rgba(100,100,255,0.4)" }} />
          <div style={{ position:"absolute", top:"55%", left:"25%", right:"25%", height:"1px", background:"rgba(100,100,255,0.25)" }} />
        </div>

        {/* ── 방문 프레임 (동쪽 벽, 아주 높은 위치) ── */}
        <div
          style={at("94%", "30%", "3%", "35%", {
            background: "#0a1a0a",
            border: "1px solid #1a3a1a",
            borderRight: "none",
          })}
        >
          {/* 문 손잡이 */}
          <div style={{ position:"absolute", left:"10%", top:"45%", width:"60%", height:"10%", background:"#1a4a1a", borderRadius:"50%" }} />
        </div>

      </Layer>

    </div>
  );
}
