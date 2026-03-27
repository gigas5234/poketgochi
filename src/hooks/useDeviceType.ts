"use client";

import { useState, useEffect } from "react";

// ─────────────────────────────────────────────
//  useDeviceType — 기기 타입 감지 훅
//
//  감지 방식 (이중 체크):
//    1차: navigator.userAgent 로 모바일 UA 패턴 검사
//    2차: window.innerWidth < 768 로 화면 너비 체크 (태블릿/반응형 폴백)
//
//  SSR 안전: useEffect 내부에서만 window/navigator 접근.
//  서버 사이드에서는 "desktop"을 기본값으로 반환하고,
//  클라이언트 마운트 후 실제 기기로 교체됨.
// ─────────────────────────────────────────────

export type DeviceType = "mobile" | "desktop";

/** 모바일 UA 패턴 */
const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/** 모바일 기준 너비 (px) */
const MOBILE_BREAKPOINT = 768;

function detect(): DeviceType {
  const isMobileUA    = MOBILE_UA_REGEX.test(navigator.userAgent);
  const isMobileWidth = window.innerWidth < MOBILE_BREAKPOINT;
  return isMobileUA || isMobileWidth ? "mobile" : "desktop";
}

export function useDeviceType(): { deviceType: DeviceType; mounted: boolean } {
  // SSR 기본값: "desktop" (hydration mismatch 방지)
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    // 마운트 직후 실제 기기 타입으로 교체
    setDeviceType(detect());
    setMounted(true);

    // window resize 시 재감지 (PC→모바일 창 축소 대응)
    function handleResize() {
      setDeviceType(detect());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { deviceType, mounted };
}
