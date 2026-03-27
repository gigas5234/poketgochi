"use client";

import React from "react";

// ─────────────────────────────────────────────
//  IsometricGrid
//  5×5 아이소메트릭 그리드 타일을 렌더링하는 컴포넌트.
//
//  좌표 변환 공식 (2D 그리드 → 아이소메트릭 화면):
//    screenX = (col - row) * (TILE_W / 2)
//    screenY = (col + row) * (TILE_H / 2)
//
//  각 타일은 CSS clip-path로 마름모(rhombus) 형태로 잘라냄.
// ─────────────────────────────────────────────

const GRID_SIZE = 5; // 5×5 그리드
const TILE_W = 48; // 타일 가로 픽셀 (짝수 권장)
const TILE_H = 24; // 타일 세로 픽셀 (TILE_W / 2)

/** 그리드 셀 (col, row)을 화면 픽셀 좌표로 변환 */
export function gridToScreen(col: number, row: number) {
  const screenX = (col - row) * (TILE_W / 2);
  const screenY = (col + row) * (TILE_H / 2);
  return { screenX, screenY };
}

/** 캐릭터의 아이소메트릭 중심 픽셀 좌표 계산 (발 위치 기준) */
export function gridToCharacterPos(col: number, row: number) {
  const { screenX, screenY } = gridToScreen(col, row);
  // 타일 중심으로 오프셋
  return {
    x: screenX + TILE_W / 2,
    y: screenY, // 타일 위에 서 있도록 y 그대로
  };
}

interface IsometricGridProps {
  /** 클릭된 그리드 셀 좌표 (플래시 효과용) */
  clickedCell?: { col: number; row: number } | null;
}

export default function IsometricGrid({ clickedCell }: IsometricGridProps) {
  // 전체 그리드의 화면 너비·높이 계산
  // 최대 screenX: (4-0)*24 = 96, 최소: (0-4)*24 = -96 → 총 너비 = GRID_SIZE * TILE_W
  const totalW = GRID_SIZE * TILE_W;
  const totalH = (GRID_SIZE * TILE_H) + TILE_H; // 여유 공간 추가

  return (
    <div
      className="relative"
      style={{
        width: totalW,
        height: totalH,
        imageRendering: "pixelated",
      }}
    >
      {/* 타일을 뒤에서 앞 순서로(painter's algorithm) 렌더링 */}
      {Array.from({ length: GRID_SIZE }, (_, row) =>
        Array.from({ length: GRID_SIZE }, (_, col) => {
          const { screenX, screenY } = gridToScreen(col, row);
          const isClicked =
            clickedCell?.col === col && clickedCell?.row === row;

          // 타일 색상: 체스판 패턴 + 클릭 시 강조
          const baseColor = (col + row) % 2 === 0 ? "#1a2a1a" : "#0d1a0d";
          const tileColor = isClicked ? "#00ff88" : baseColor;
          const borderColor = isClicked ? "#00ffcc" : "#00aa44";

          return (
            <div
              key={`${col}-${row}`}
              className="absolute"
              style={{
                // 타일 중심을 그리드 기준점(컨테이너 중앙 상단)에 배치
                left: screenX + totalW / 2 - TILE_W / 2,
                top: screenY,
                width: TILE_W,
                height: TILE_H,
                // 마름모 클리핑: 위→오른쪽→아래→왼쪽
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                backgroundColor: tileColor,
                // 타일 내부 테두리는 box-shadow로 표현 (clip-path와 border 호환 이슈)
                boxShadow: `inset 0 0 0 1px ${borderColor}`,
                transition: "background-color 0.2s",
                imageRendering: "pixelated",
              }}
            />
          );
        })
      )}
    </div>
  );
}

// 상수 export (다른 컴포넌트에서 재사용)
export { TILE_W, TILE_H, GRID_SIZE };
