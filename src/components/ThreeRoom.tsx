"use client";

/**
 * ThreeRoom.tsx — 2.5D Depth Parallax Scene (self-contained)
 *
 * 이 컴포넌트 하나로 모든 것이 동작합니다:
 *   - Custom ShaderMaterial (displacement 없음, fragment shader 전용)
 *   - 자이로스코프(모바일) / 마우스(데스크탑) 입력 처리
 *   - iOS DeviceOrientationEvent 권한 흐름
 *   - 네온 그린 레트로 HUD 오버레이
 *   - 터치 리플 + 햅틱 진동
 *
 * 이미지 교체:
 *   파일 상단 ASSETS 상수만 수정하면 됩니다.
 */

import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// ══════════════════════════════════════════════════════════════════
//  ASSETS — 여기 경로만 바꾸면 됩니다
// ══════════════════════════════════════════════════════════════════

const ASSETS = {
  /** 방 원본 이미지 (컬러 JPEG/PNG) */
  map:      "/asset/00_room.png", // → 교체: /room.jpg

  /** 깊이맵 (그레이스케일 — 흰=가까움, 검=멀음) */
  depthMap: "/asset/floor.png",   // → 교체: /depth_map.jpg
} as const;

// ── 시차 강도 (UV 오프셋 최댓값) ──
// 0.03 = 미묘 / 0.06 = 자연스러운 입체감 / 0.10 = 극적
const MAX_OFFSET = 0.07;

// ══════════════════════════════════════════════════════════════════
//  TILT STATE — module-level singleton (React re-render 없이 GPU 전달)
// ══════════════════════════════════════════════════════════════════
const tilt = { tx: 0, ty: 0 }; // 목표값 (이벤트 raw)
const cur  = { tx: 0, ty: 0 }; // 현재값 (Lerp 결과)
const LERP    = 0.08;
const CLAMP_X = 20; // gamma 최대 ±°
const CLAMP_Y = 12; // beta delta 최대 ±°
let betaCalib: number | null = null;
let gyroActive               = false;

// ══════════════════════════════════════════════════════════════════
//  GLSL — Vertex Shader
// ══════════════════════════════════════════════════════════════════
const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    // UV를 Fragment Shader 로 전달 (0,0 = 좌하단, 1,1 = 우상단)
    vUv = uv;
    // 정점 이동 없음 — 모든 깊이 효과는 Fragment Shader 에서 처리
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ══════════════════════════════════════════════════════════════════
//  GLSL — Fragment Shader (2.5D 시차 효과의 핵심)
// ══════════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;     // 원본 방 이미지 (컬러)
  uniform sampler2D uDepthMap;    // 깊이맵 (greyscale: 흰=가까움, 검=멀음)
  uniform vec2      uOffset;      // 현재 시차 오프셋 (UV 단위, 자이로/마우스 기반)
  uniform vec2      uResolution;  // 캔버스 픽셀 크기 (width, height)
  uniform float     uImageAspect; // 원본 이미지 종횡비 (width / height)

  varying vec2 vUv;

  // ─────────────────────────────────────────────────────────────
  //  coverUV: CSS object-fit:cover 와 동일한 UV 보정
  //
  //  PlaneGeometry 의 UV 는 화면 비율을 무시하고 항상 0→1.
  //  이 함수로 이미지 비율을 유지하면서 화면을 꽉 채운다.
  //
  //  imageAspect / screenAspect = scale
  //    scale > 1 → 이미지가 더 넓음 → 좌우 크롭
  //    scale < 1 → 이미지가 더 높음 → 상하 크롭
  // ─────────────────────────────────────────────────────────────
  vec2 coverUV(vec2 uv) {
    float screenAspect = uResolution.x / uResolution.y;
    float scale = uImageAspect / screenAspect;
    if (scale > 1.0) {
      return vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    } else {
      return vec2(uv.x, (uv.y - 0.5) / scale + 0.5);
    }
  }

  void main() {
    // ── 1. object-fit:cover UV 보정 ──────────────────────────────
    vec2 uv = coverUV(vUv);

    // ── 2. 이 UV 위치의 깊이값 읽기 ──────────────────────────────
    //  depth = 1.0 → 카메라에 가장 가까운 픽셀 (예: 침대 위면)
    //  depth = 0.0 → 카메라에서 가장 먼 픽셀 (예: 바닥)
    float depth = texture2D(uDepthMap, uv).r;

    // ── 3. 시차 UV 변위 (핵심 로직) ──────────────────────────────
    //
    //  parallaxUV = uv - uOffset * depth
    //
    //  작동 원리:
    //    카메라를 오른쪽으로 기울이면 (uOffset.x > 0):
    //      • depth=1.0 인 가까운 픽셀 → UV가 왼쪽으로 이동
    //        → 텍스처의 오른쪽 영역에서 샘플
    //        → 화면에서 왼쪽으로 이동한 것처럼 보임
    //      • depth=0.0 인 먼 픽셀 → 이동 없음 (배경 고정)
    //      • 이 차이가 '물체가 배경 앞에 있는' 입체감을 만든다
    //      → 가구 옆면이 드러나는 효과
    //
    //  빼기(subtraction)를 쓰는 이유:
    //    UV 좌표계에서 +X = 오른쪽, 화면 좌표계에서 오른쪽으로
    //    보이려면 UV 샘플 위치를 왼쪽으로 옮겨야 함.
    vec2 parallaxUV = uv - uOffset * depth;

    // ── 4. 색수차 (Chromatic Aberration) ─────────────────────────
    //
    //  R/G/B 채널을 미세하게 다른 UV 에서 샘플링.
    //  깊이가 높고 기울기가 클수록 강해짐 → 렌즈 굴절 효과 재현.
    //  0.12 계수 = 시차 오프셋의 12%만 색수차에 사용 (미묘한 수준 유지).
    vec2 ca = uOffset * depth * 0.12;
    float r  = texture2D(uTexture, parallaxUV + ca).r;
    float g  = texture2D(uTexture, parallaxUV     ).g;
    float b  = texture2D(uTexture, parallaxUV - ca).b;
    vec3 color = vec3(r, g, b);

    // ── 5. AO 근사 (Ambient Occlusion) ───────────────────────────
    //
    //  오목하거나 멀리 있는 영역(depth → 0)을 살짝 어둡게.
    //  실내 자연 음영과 비슷한 느낌. (0.88 ~ 1.0 범위)
    color *= 0.88 + 0.12 * depth;

    // ── 6. 경계 페이드 마스크 ──────────────────────────────────────
    //
    //  시차로 인해 parallaxUV 가 [0,1] 밖으로 나갈 수 있음.
    //  clamp 로 늘리지 않고 알파를 0으로 페이드 → 검은 배경이
    //  자연스럽게 드러남 (씬의 "경계" 처럼 보임).
    vec2  edgeDist = min(parallaxUV, 1.0 - parallaxUV);
    float edgeMask = smoothstep(0.0, 0.06, min(edgeDist.x, edgeDist.y));

    gl_FragColor = vec4(color, edgeMask);
  }
`;

// ══════════════════════════════════════════════════════════════════
//  ParallaxMesh — R3F 씬 컴포넌트
// ══════════════════════════════════════════════════════════════════
function ParallaxMesh() {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // 두 텍스처 로드 (둘 다 로드 완료 시 Suspense 해제)
  const [roomTex, depthTex] = useTexture([ASSETS.map, ASSETS.depthMap]);

  // ── 고품질 리니어 필터링 (pixelated 절대 사용 안 함) ──
  useMemo(() => {
    [roomTex, depthTex].forEach((t) => {
      t.minFilter       = THREE.LinearMipmapLinearFilter;
      t.magFilter       = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate     = true;
    });
  }, [roomTex, depthTex]);

  // ── 이미지 종횡비 자동 감지 ──
  const imgAspect = useMemo(() => {
    const img = roomTex.image as HTMLImageElement | undefined;
    return img?.naturalWidth && img.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : 4 / 3;
  }, [roomTex]);

  // ── Uniform 초기화 (텍스처 변경 시에만 재생성) ──
  const uniforms = useMemo(
    () => ({
      uTexture:     { value: roomTex },
      uDepthMap:    { value: depthTex },
      uOffset:      { value: new THREE.Vector2(0, 0) },
      uResolution:  { value: new THREE.Vector2(1, 1) },
      uImageAspect: { value: imgAspect },
    }),
    [roomTex, depthTex, imgAspect],
  );

  // ── 매 프레임: Lerp → Uniform 갱신 → 스케일 유지 ──
  useFrame(({ size, viewport: vp }) => {
    // 목표값으로 부드럽게 수렴 (지수 보간)
    cur.tx += (tilt.tx - cur.tx) * LERP;
    cur.ty += (tilt.ty - cur.ty) * LERP;

    if (matRef.current) {
      const u = matRef.current.uniforms;
      // [-CLAMP, +CLAMP] → [-1, +1] 정규화 → UV 오프셋으로 변환
      // Y축 반전: Three.js UV +Y = 위, 화면 좌표 +Y = 아래
      u.uOffset.value.set(
         (cur.tx / CLAMP_X) * MAX_OFFSET,
        -(cur.ty / CLAMP_Y) * MAX_OFFSET,
      );
      u.uResolution.value.set(size.width, size.height);
    }

    // viewport 크기(월드 좌표)에 맞게 평면 스케일 → 화면 항상 꽉 채움
    if (meshRef.current) {
      meshRef.current.scale.set(vp.width, vp.height, 1);
    }
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      {/* 1×1 단위 평면 — scale 로 뷰포트를 채움 */}
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ══════════════════════════════════════════════════════════════════
//  TextureErrorBoundary — 에셋 파일 없을 때 앱 크래시 방지
// ══════════════════════════════════════════════════════════════════
class TextureErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    // 에러 시 검은 배경만 표시 (조용히 실패)
    return this.state.error ? null : this.props.children;
  }
}

// ══════════════════════════════════════════════════════════════════
//  터치 리플 이펙트
// ══════════════════════════════════════════════════════════════════
function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x, top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div style={{
        position: "absolute", inset: -14,
        border: "1.5px solid rgba(0,255,70,0.6)",
        animation: "ripple-expand 0.65s ease-out forwards",
      }} />
      <div style={{
        position: "absolute", inset: -7,
        border: "1px solid rgba(0,255,70,0.35)",
        animation: "ripple-expand 0.65s 0.08s ease-out forwards",
      }} />
      <div style={{
        position: "absolute",
        width: 4, height: 4, top: -2, left: -2,
        background: "rgba(0,255,70,0.85)",
        boxShadow: "0 0 6px rgba(0,255,70,0.7)",
      }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Neon Green Retro HUD
// ══════════════════════════════════════════════════════════════════
type GyroStatus = "idle" | "granted" | "denied";

interface HUDProps {
  gyroStatus: GyroStatus;
  onRequestGyro: () => void;
}

function RetroHUD({ gyroStatus, onRequestGyro }: HUDProps) {
  // ref 로 DOM 직접 업데이트 → React re-render 없이 20fps 좌표 갱신
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (xRef.current)
        xRef.current.textContent = ((cur.tx / CLAMP_X) * 99.9).toFixed(1).padStart(6);
      if (yRef.current)
        yRef.current.textContent = ((cur.ty / CLAMP_Y) * 99.9).toFixed(1).padStart(6);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const isGyro   = gyroStatus === "granted";
  const FONT: React.CSSProperties = { fontFamily: '"Courier New", Courier, monospace' };

  // ── 코너 브라켓 정의 ──
  const C = "rgba(0,255,70,0.85)";
  const B = 8; // 모서리에서의 거리(px)
  const S = 16; // 브라켓 크기(px)
  const brackets: React.CSSProperties[] = [
    { top: B, left: B,       borderTop: `2px solid ${C}`, borderLeft: `2px solid ${C}` },
    { top: B, right: B,      borderTop: `2px solid ${C}`, borderRight: `2px solid ${C}` },
    { bottom: B, left: B,    borderBottom: `2px solid ${C}`, borderLeft: `2px solid ${C}` },
    { bottom: B, right: B,   borderBottom: `2px solid ${C}`, borderRight: `2px solid ${C}` },
  ];

  return (
    <div
      style={{
        position: "absolute", inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        ...FONT,
        // 네온 그린 테두리 + 내부 글로우
        border: "1px solid rgba(0,255,70,0.30)",
        boxShadow: [
          "inset 0 0 60px rgba(0,255,70,0.04)",
          "0 0 20px rgba(0,255,70,0.08)",
        ].join(", "),
      }}
    >
      {/* ── 코너 브라켓 ──────────────────────────────────────────── */}
      {brackets.map((style, i) => (
        <div key={i} style={{ position: "absolute", width: S, height: S, ...style }} />
      ))}

      {/* ── 중앙 수평 기준선 (매우 미묘) ────────────────────────── */}
      <div style={{
        position: "absolute", top: "50%", left: B * 2, right: B * 2,
        height: 1, background: "rgba(0,255,70,0.05)",
      }} />

      {/* ── 상단 HUD 바 ──────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
        padding: "8px 14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 9, color: "#d0d0d0", letterSpacing: "0.22em" }}>
          POCKET GOCHI
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* 상태 LED */}
          <div style={{
            width: 5, height: 5,
            background: isGyro ? "#00ff46" : "#1a2a1a",
            boxShadow: isGyro
              ? "0 0 6px #00ff46, 0 0 14px rgba(0,255,70,0.5)"
              : "none",
          }} />
          <span style={{
            fontSize: 8,
            color: isGyro ? "#aaaaaa" : "#2e2e2e",
            letterSpacing: "0.08em",
          }}>
            {gyroStatus === "granted" ? "GYRO ●"
             : gyroStatus === "denied"  ? "MOUSE ○"
             :                           "GYRO ○"}
          </span>
        </div>
      </div>

      {/* ── 하단 HUD 바 ──────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        pointerEvents: gyroStatus === "idle" ? "auto" : "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
        padding: "20px 14px 8px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        {/* 실시간 틸트 좌표 */}
        <div style={{ fontSize: 9, color: "#3e3e3e", lineHeight: 1.9 }}>
          <div>
            X{" "}
            <span ref={xRef} style={{ color: "#707070", fontSize: 10, letterSpacing: "0.04em" }}>
              {"  0.0"}
            </span>
          </div>
          <div>
            Y{" "}
            <span ref={yRef} style={{ color: "#707070", fontSize: 10, letterSpacing: "0.04em" }}>
              {"  0.0"}
            </span>
          </div>
        </div>

        {/* iOS 권한 버튼 or 조작 힌트 */}
        {gyroStatus === "idle" ? (
          <button
            style={{
              pointerEvents: "auto",
              ...FONT,
              fontSize: 8, color: "#d0d0d0", letterSpacing: "0.12em",
              background: "rgba(0,0,0,0.88)",
              border: "1px solid rgba(0,255,70,0.6)",
              boxShadow: "0 0 10px rgba(0,255,70,0.25)",
              padding: "4px 10px", cursor: "pointer",
              animation: "neon-pulse 2s ease-in-out infinite",
            }}
            onClick={(e) => { e.stopPropagation(); onRequestGyro(); }}
          >
            ▶ ENABLE GYRO
          </button>
        ) : (
          <span style={{
            fontSize: 8, color: "#2e2e2e",
            letterSpacing: "0.08em", textAlign: "right", lineHeight: 1.8,
          }}>
            {isGyro ? <>TILT TO<br />EXPLORE</> : <>MOVE<br />MOUSE</>}
          </span>
        )}
      </div>

      {/* ── CRT 수평 주사선 (매우 미묘) ───────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 3px)",
      }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ThreeRoom — 메인 컴포넌트 (default export)
// ══════════════════════════════════════════════════════════════════
interface RippleData { id: number; x: number; y: number; }
let rippleSeq = 0;

export default function ThreeRoom() {
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>("idle");
  const [ripples,    setRipples]    = useState<RippleData[]>([]);

  // ── iOS 여부 감지 (마운트 시) ──────────────────────────────────
  useEffect(() => {
    // requestPermission 함수가 없으면 Android/Desktop → 즉시 granted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") {
      setGyroStatus("granted");
    }
  }, []);

  // ── iOS 자이로 권한 요청 (반드시 사용자 제스처 내에서 호출) ────
  const requestGyro = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (DeviceOrientationEvent as any).requestPermission();
      setGyroStatus(result === "granted" ? "granted" : "denied");
    } catch {
      setGyroStatus("denied");
    }
  }, []);

  // ── 터치/클릭: 햅틱 진동 + 리플 이펙트 ──────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 짧은 햅틱 진동 (Android / 일부 iOS)
    if (navigator.vibrate) navigator.vibrate(22);

    // 리플 추가
    const rect = e.currentTarget.getBoundingClientRect();
    const id   = ++rippleSeq;
    setRipples((prev) => [...prev, {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 750);
  }, []);

  // ── 입력 이벤트 리스너 ─────────────────────────────────────────
  useEffect(() => {
    // iOS 이고 아직 권한 없으면 이벤트 등록 안 함
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (gyroStatus === "idle" &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (DeviceOrientationEvent as any).requestPermission === "function") return;

    betaCalib  = null;
    gyroActive = false;

    // ── DeviceOrientation (자이로스코프) ──
    function onOrientation(e: DeviceOrientationEvent) {
      const beta  = e.beta  ?? 90;
      const gamma = e.gamma ?? 0;
      // 첫 수신값으로 보정 → 어떤 각도로 들든 '현재 자세 = 0'
      if (betaCalib === null) betaCalib = beta;
      gyroActive = true;
      tilt.tx = Math.max(-CLAMP_X, Math.min(CLAMP_X, gamma));
      tilt.ty = Math.max(-CLAMP_Y, Math.min(CLAMP_Y, beta - betaCalib));
    }

    // ── 마우스 폴백 (데스크탑) ──
    function onMouseMove(e: MouseEvent) {
      if (gyroActive) return;
      tilt.tx = (e.clientX / window.innerWidth  - 0.5) * CLAMP_X * 2;
      tilt.ty = (e.clientY / window.innerHeight - 0.5) * CLAMP_Y * 2;
    }

    // ── 터치 드래그 폴백 (자이로 없는 환경) ──
    function onTouchMove(e: TouchEvent) {
      if (gyroActive) return;
      const t = e.touches[0];
      tilt.tx = (t.clientX / window.innerWidth  - 0.5) * CLAMP_X * 2;
      tilt.ty = (t.clientY / window.innerHeight - 0.5) * CLAMP_Y * 2;
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("mousemove",         onMouseMove);
    window.addEventListener("touchmove",         onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener("mousemove",         onMouseMove);
      window.removeEventListener("touchmove",         onTouchMove);
    };
  }, [gyroStatus]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000000",
        overflow: "hidden",
        cursor: "crosshair",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
    >
      {/* ── WebGL 캔버스 ───────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: false }}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          // globals.css 의 image-rendering: pixelated 를 이 엘리먼트에서 덮어씀
          imageRendering: "auto",
        }}
      >
        <TextureErrorBoundary>
          <Suspense fallback={null}>
            <ParallaxMesh />
          </Suspense>
        </TextureErrorBoundary>
      </Canvas>

      {/* ── 네온 그린 레트로 HUD (캔버스 위 absolute) ─────────────── */}
      <RetroHUD gyroStatus={gyroStatus} onRequestGyro={requestGyro} />

      {/* ── 터치 리플 레이어 ─────────────────────────────────────── */}
      {ripples.map((r) => (
        <Ripple key={r.id} x={r.x} y={r.y} />
      ))}
    </div>
  );
}
