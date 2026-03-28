"use client";

import React, { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// ══════════════════════════════════════════════════════════════════
//  에셋 경로 — 여기만 수정하면 전체 적용됩니다
//
//  map      : 원본 실사 이미지 (JPEG/PNG)
//  depthMap : 깊이맵 grayscale PNG  (흰=가까움 / 검=멀음)
//
//  현재: 00_room.png 와 floor.png 로 동작 확인용 기본값 설정.
//  교체 시: map → "/asset/room.jpg", depthMap → "/asset/depth_map.png"
// ══════════════════════════════════════════════════════════════════
export const PARALLAX_ASSETS = {
  map:      "/asset/00_room.png",    // ← 교체: 실사 방 이미지
  depthMap: "/asset/floor.png",      // ← 교체: 깊이맵 grayscale PNG
} as const;

// ── 시차 강도 (숫자가 클수록 입체감 강함) ──
// 0.03 = 미묘 / 0.06 = 권장 / 0.12 = 극적
export const PARALLAX_STRENGTH = 0.06;

// ── 자이로/마우스 클램핑 & 보간 ──
const CLAMP_X = 20;
const CLAMP_Y = 12;
const LERP    = 0.07;

// ── Singleton 틸트 상태 ──
// React state 대신 module-level 객체 → rAF 에서 re-render 없이 GPU 에 직접 전달
const _tgt = { tx: 0, ty: 0 };
const _cur = { tx: 0, ty: 0 };
let _betaCalib: number | null = null;
let _gyroActive               = false;

// ════════════════════════════════════════════════════════════════
//  GLSL — Vertex Shader
// ════════════════════════════════════════════════════════════════
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ════════════════════════════════════════════════════════════════
//  GLSL — Fragment Shader (Depth Parallax + Chromatic Aberration)
//
//  처리 순서:
//  1. UV 보정     : object-fit:cover 와 동일하게 이미지 비율 맞춤
//  2. 깊이 샘플   : depth map에서 픽셀 높이값 읽기
//  3. 시차 오프셋 : 가까운 물체(depth=1)일수록 기울기 방향 반대로 이동
//                  → 틸트 시 물체 옆면이 드러남
//  4. 색수차      : R/G/B를 미세하게 다른 UV에서 샘플 (v0.dev 스타일)
//  5. AO 근사     : 오목한 부분(낮은 depth)을 살짝 어둡게
//  6. 경계 페이드 : 시차 경계 늘어남을 부드럽게 숨김
// ════════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;        // 원본 이미지
  uniform sampler2D uDepthMap;   // 깊이맵
  uniform vec2      uTilt;       // 정규화 기울기 (-1 ~ +1, 좌우/앞뒤)
  uniform float     uStrength;   // 시차 강도
  uniform vec2      uResolution; // 캔버스 픽셀 크기 (width, height)
  uniform float     uImgRatio;   // 이미지 종횡비 (width / height)

  varying vec2 vUv;

  void main() {
    // ── 1. UV 보정 (object-fit: cover) ──────────────────────────
    float screenRatio = uResolution.x / uResolution.y;
    float scale       = uImgRatio / screenRatio;

    vec2 uv = vUv;
    if (scale > 1.0) {
      // 이미지가 화면보다 넓음 → 좌우 크롭, 상하 꽉 채움
      uv.x = (vUv.x - 0.5) * scale + 0.5;
    } else {
      // 이미지가 화면보다 좁음 → 상하 크롭, 좌우 꽉 채움
      uv.y = (vUv.y - 0.5) / scale + 0.5;
    }

    // ── 2. 깊이 샘플 ─────────────────────────────────────────────
    // depth: 0.0 = 가장 멀리 / 1.0 = 가장 가까이
    float depth = texture2D(uDepthMap, uv).r;

    // ── 3. 시차 오프셋 ────────────────────────────────────────────
    // parallax = tilt * depth * strength
    //   depth 가 클수록(가까울수록) 더 많이 이동
    //   finalUV = uv - parallax  →  틸트 반대 방향으로 이동
    //   → 기울이면 가까운 물체가 비켜나고 뒤(옆면)가 드러남
    vec2 parallax = uTilt * depth * uStrength;
    vec2 finalUV  = uv - parallax;

    // ── 4. 색수차 (Chromatic Aberration) ─────────────────────────
    // R 채널: 시차 방향으로 살짝 더 이동
    // B 채널: 반대 방향으로 살짝 이동
    // → 가까운 물체 엣지에서 미세한 색 분리 → 고급스러운 렌즈 효과
    vec2 caShift = parallax * 0.18;
    float r = texture2D(uMap, finalUV + caShift).r;
    float g = texture2D(uMap, finalUV          ).g;
    float b = texture2D(uMap, finalUV - caShift).b;

    // ── 5. Ambient Occlusion 근사 ─────────────────────────────────
    // depth 낮은 곳(오목 / 멀리) = 살짝 어둡게 → 실내 음영 표현
    float ao    = 0.88 + 0.12 * depth;
    vec3  color = vec3(r, g, b) * ao;

    // ── 6. 경계 페이드 ────────────────────────────────────────────
    // finalUV 가 0~1 밖으로 나가면 클램프 대신 알파를 0으로
    // smoothstep 으로 부드럽게 페이드 → 테두리 늘어남 아티팩트 제거
    vec2  edge = min(finalUV, 1.0 - finalUV);
    float mask = smoothstep(0.0, 0.06, min(edge.x, edge.y));

    gl_FragColor = vec4(color, mask);
  }
`;

// ─────────────────────────────────────────────────────────────────
//  ParallaxMesh — 셰이더 플레인 (화면 전체 채움)
// ─────────────────────────────────────────────────────────────────
function ParallaxMesh() {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const [mapTex, depthTex] = useTexture([
    PARALLAX_ASSETS.map,
    PARALLAX_ASSETS.depthMap,
  ]);

  // ── 고품질 필터링 설정 (image-rendering: pixelated 절대 금지) ──
  useMemo(() => {
    [mapTex, depthTex].forEach((t) => {
      t.minFilter       = THREE.LinearMipmapLinearFilter;
      t.magFilter       = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate     = true;
    });
  }, [mapTex, depthTex]);

  // ── 이미지 종횡비 자동 감지 ──
  const imgRatio = useMemo(() => {
    const img = mapTex.image as HTMLImageElement | undefined;
    if (img?.naturalWidth && img.naturalHeight) {
      return img.naturalWidth / img.naturalHeight;
    }
    return 4 / 3; // 폴백
  }, [mapTex]);

  // ── uniform 초기화 (텍스처 변경 시 재생성) ──
  const uniforms = useMemo(
    () => ({
      uMap:        { value: mapTex },
      uDepthMap:   { value: depthTex },
      uTilt:       { value: new THREE.Vector2(0, 0) },
      uStrength:   { value: PARALLAX_STRENGTH },
      uResolution: { value: new THREE.Vector2(1, 1) }, // useFrame 에서 매 프레임 갱신
      uImgRatio:   { value: imgRatio },
    }),
    [mapTex, depthTex, imgRatio],
  );

  // ── rAF 루프: 틸트 Lerp → uniform 갱신 → 메시 스케일 유지 ──
  useFrame(({ size, viewport: vp }) => {
    _cur.tx += (_tgt.tx - _cur.tx) * LERP;
    _cur.ty += (_tgt.ty - _cur.ty) * LERP;

    if (matRef.current) {
      const u = matRef.current.uniforms;
      // 정규화 (-1~+1) 후 Y축 반전 (Three.js UV vs 화면 좌표계 차이)
      u.uTilt.value.set(_cur.tx / CLAMP_X, -(_cur.ty / CLAMP_Y));
      u.uResolution.value.set(size.width, size.height);
    }

    // viewport 세계 좌표 크기에 맞게 플레인 스케일 유지 (항상 화면 꽉 채움)
    if (meshRef.current) {
      meshRef.current.scale.set(vp.width, vp.height, 1);
    }
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TextureErrorBoundary — 텍스처 404 시 앱 크래시 방지
// ─────────────────────────────────────────────────────────────────
class TextureErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return null; // 에셋 없으면 검은 배경만 표시
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────
//  ThreeRoom — Canvas + 이벤트 리스너 (최상위)
// ─────────────────────────────────────────────────────────────────
interface ThreeRoomProps {
  gyroGranted: boolean;
}

export default function ThreeRoom({ gyroGranted }: ThreeRoomProps) {
  useEffect(() => {
    _betaCalib  = null;
    _gyroActive = false;

    if (!gyroGranted) return;

    // ── DeviceOrientation (자이로스코프) ──
    function onOrientation(e: DeviceOrientationEvent) {
      const beta  = e.beta  ?? 90;
      const gamma = e.gamma ?? 0;
      // 첫 수신값을 기준으로 delta 계산 → 어떤 각도로 들든 항상 0이 중립
      if (_betaCalib === null) _betaCalib = beta;
      _gyroActive = true;
      _tgt.tx = Math.max(-CLAMP_X, Math.min(CLAMP_X, gamma));
      _tgt.ty = Math.max(-CLAMP_Y, Math.min(CLAMP_Y, beta - _betaCalib));
    }

    // ── 마우스 폴백 (데스크탑) ──
    function onMouseMove(e: MouseEvent) {
      if (_gyroActive) return;
      _tgt.tx = (e.clientX / window.innerWidth  - 0.5) * CLAMP_X * 2;
      _tgt.ty = (e.clientY / window.innerHeight - 0.5) * CLAMP_Y * 2;
    }

    // ── 터치 드래그 폴백 (자이로 없는 환경) ──
    function onTouchMove(e: TouchEvent) {
      if (_gyroActive) return;
      const t = e.touches[0];
      _tgt.tx = (t.clientX / window.innerWidth  - 0.5) * CLAMP_X * 2;
      _tgt.ty = (t.clientY / window.innerHeight - 0.5) * CLAMP_Y * 2;
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("mousemove",         onMouseMove);
    window.addEventListener("touchmove",         onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener("mousemove",         onMouseMove);
      window.removeEventListener("touchmove",         onTouchMove);
    };
  }, [gyroGranted]);

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: false }}
      style={{
        display:         "block",
        width:           "100%",
        height:          "100%",
        background:      "#000000",
        imageRendering:  "auto", // globals.css 의 pixelated 덮어쓰기
      }}
    >
      <TextureErrorBoundary>
        <Suspense fallback={null}>
          <ParallaxMesh />
        </Suspense>
      </TextureErrorBoundary>
    </Canvas>
  );
}
