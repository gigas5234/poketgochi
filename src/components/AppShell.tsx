"use client";

import dynamic from "next/dynamic";
import { useDeviceType } from "@/hooks/useDeviceType";
import PhoneFrame from "./PhoneFrame";

// ─────────────────────────────────────────────
//  AppShell — 기기별 뷰 분기 컴포넌트
//
//  PC   → PhoneFrame 안에 3D 씬 (가짜 스마트폰 UI)
//  모바일 → 풀스크린 3D 씬 (프레임 없음, 100vw × 100vh)
//
//  흐름:
//    1. useDeviceType 훅이 UA + 화면 너비로 기기 감지
//    2. mounted=false 구간(SSR/hydration)에는 빈 배경만 표시
//       → hydration mismatch 방지
//    3. mounted=true 이후 deviceType에 따라 뷰 전환
// ─────────────────────────────────────────────

// PocketGochi(ThreeScene 포함)는 모바일 풀스크린용으로 직접 로드
const PocketGochi = dynamic(() => import("./PocketGochi"), {
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

export default function AppShell() {
  const { deviceType, mounted } = useDeviceType();

  // ── 마운트 전: 빈 배경 (깜빡임 방지) ──
  if (!mounted) {
    return <div className="w-screen h-screen bg-[#050a05]" />;
  }

  // ── 모바일: 풀스크린 (프레임 제거) ──
  if (deviceType === "mobile") {
    return (
      // fixed + inset-0 으로 주소창/상태바 영역까지 완전 덮음
      // 100dvh: dynamic viewport height — iOS Safari 주소창 대응
      <div
        className="fixed inset-0 overflow-hidden bg-[#000a00]"
        style={{ width: "100dvw", height: "100dvh" }}
      >
        <PocketGochi />
      </div>
    );
  }

  // ── PC: 가짜 스마트폰 프레임 ──
  return <PhoneFrame />;
}
