"use client";

// ─────────────────────────────────────────────
//  PocketGochi — 메인 게임 컨테이너
//
//  Three.js 3D 씬 + HUD 오버레이로 구성.
//  PhoneFrame 안에 삽입되어 동작함.
// ─────────────────────────────────────────────

import dynamic from "next/dynamic";

// Three.js는 SSR에서 window에 접근하므로 클라이언트에서만 로드
const ThreeScene = dynamic(() => import("./ThreeScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#000a00]">
      <span
        className="text-green-600 font-mono text-[10px] tracking-widest animate-pulse"
        style={{ imageRendering: "pixelated" }}
      >
        LOADING...
      </span>
    </div>
  ),
});

export default function PocketGochi() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ── 3D 씬 (전체 영역) ── */}
      <ThreeScene />

      {/* ── HUD: 타이틀 ── */}
      <div
        className="absolute top-2 left-0 right-0 flex justify-center
                   pointer-events-none z-20"
      >
        <div
          className="px-2 py-0.5 bg-black/60 border border-green-500/40
                     text-green-400 font-mono text-[10px] tracking-widest"
          style={{ imageRendering: "pixelated" }}
        >
          POCKET GOCHI
        </div>
      </div>

      {/* ── HUD: 조작 힌트 ── */}
      <div
        className="absolute bottom-6 left-0 right-0 flex justify-center
                   pointer-events-none z-20"
      >
        <div
          className="text-green-700 font-mono text-[8px] tracking-widest animate-pulse"
          style={{ imageRendering: "pixelated" }}
        >
          TILT TO LOOK AROUND
        </div>
      </div>
    </div>
  );
}
