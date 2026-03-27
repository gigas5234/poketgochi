"use client";

import React from "react";
import PocketGochi from "./PocketGochi";

// ─────────────────────────────────────────────
//  PhoneFrame
//  8:16 비율의 스마트폰 형태 프레임.
//  게임은 이 프레임 안에서만 구동된다.
//
//  픽셀 스타일 네온 테두리 + 노치/버튼 장식 포함.
// ─────────────────────────────────────────────

export default function PhoneFrame() {
  return (
    // ── 외부 컨테이너: 화면 중앙 정렬 ──
    <div className="flex items-center justify-center w-full h-full min-h-screen bg-[#050a05]">

      {/* ── 폰 외장 (네온 픽셀 테두리) ── */}
      <div
        className="relative flex flex-col items-center"
        style={{
          // 8:16 비율 유지
          width: "min(260px, 45vw, calc(85vh * 0.5))",
          aspectRatio: "8 / 16",
          imageRendering: "pixelated",
        }}
      >
        {/* ── 폰 바디 외곽선 (픽셀 네온 효과) ── */}
        <div
          className="absolute inset-0 rounded-[12%]"
          style={{
            background: "linear-gradient(145deg, #0d1a0d, #050a05)",
            border: "3px solid #00ff66",
            boxShadow: `
              0 0 0 1px #003322,
              0 0 12px #00ff66,
              0 0 24px #00aa44,
              inset 0 0 8px rgba(0,255,100,0.05)
            `,
            imageRendering: "pixelated",
          }}
        />

        {/* ── 상단 노치 영역 ── */}
        <div className="relative z-10 w-full flex justify-center pt-[5%]">
          {/* 스피커 그릴 (픽셀 도트) */}
          <div className="flex gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[3px] h-[3px] bg-green-600/60 rounded-none"
                style={{ imageRendering: "pixelated" }}
              />
            ))}
          </div>
        </div>

        {/* ── 카메라 + 노치 ── */}
        <div className="relative z-10 flex items-center gap-2 mt-[2%]">
          <div
            className="w-[6px] h-[6px] rounded-none bg-[#001a00] border border-cyan-500/50"
            style={{ boxShadow: "0 0 4px #00ffcc", imageRendering: "pixelated" }}
          />
          <div
            className="w-[20px] h-[6px] rounded-none bg-[#001a00] border border-green-500/30"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* ── 화면 영역 (게임 렌더링) ── */}
        <div
          className="relative z-10 w-[88%] flex-1 my-[3%] overflow-hidden"
          style={{
            // 픽셀 스타일 화면 테두리
            border: "2px solid #00ff44",
            boxShadow: "0 0 6px #00ff44, inset 0 0 16px rgba(0,20,0,0.8)",
            background: "#000a00",
            imageRendering: "pixelated",
          }}
        >
          {/* 화면 스캔라인 오버레이 (CRT 효과) */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
              imageRendering: "pixelated",
            }}
          />

          {/* 화면 모서리 글로우 */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)",
              imageRendering: "pixelated",
            }}
          />

          {/* ── 실제 게임 컴포넌트 ── */}
          <PocketGochi />
        </div>

        {/* ── 하단 홈 버튼 영역 ── */}
        <div className="relative z-10 w-full flex justify-center pb-[4%] gap-3">
          {/* 뒤로가기 */}
          <button
            className="w-[10px] h-[10px] border border-green-700/50 bg-transparent
                       hover:border-green-400 transition-colors cursor-pointer"
            style={{ imageRendering: "pixelated" }}
            aria-label="back"
          />
          {/* 홈 */}
          <button
            className="w-[12px] h-[12px] border-2 border-green-600/70 bg-transparent
                       hover:border-green-300 hover:shadow-[0_0_6px_#00ff66]
                       transition-all cursor-pointer"
            style={{ imageRendering: "pixelated" }}
            aria-label="home"
          />
          {/* 앱 전환 */}
          <button
            className="w-[10px] h-[10px] border border-green-700/50 bg-transparent
                       hover:border-green-400 transition-colors cursor-pointer"
            style={{ imageRendering: "pixelated" }}
            aria-label="recents"
          />
        </div>

        {/* ── 좌측 볼륨 버튼 ── */}
        <div
          className="absolute left-[-8px] top-[28%] flex flex-col gap-[4px] z-10"
          style={{ imageRendering: "pixelated" }}
        >
          <div className="w-[5px] h-[14px] bg-green-900 border-r border-green-600/50" />
          <div className="w-[5px] h-[14px] bg-green-900 border-r border-green-600/50" />
        </div>

        {/* ── 우측 전원 버튼 ── */}
        <div
          className="absolute right-[-8px] top-[32%] z-10"
          style={{ imageRendering: "pixelated" }}
        >
          <div className="w-[5px] h-[20px] bg-green-900 border-l border-green-600/50" />
        </div>
      </div>

      {/* ── 배경 글로우 (폰 아래 반사광) ── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "200px",
          height: "60px",
          background:
            "radial-gradient(ellipse, rgba(0,255,100,0.06) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}
