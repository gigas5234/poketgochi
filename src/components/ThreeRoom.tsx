"use client";

import React, { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// ══════════════════════════════════════════════════════════════════
//  에셋 경로 설정 — 여기만 수정하면 전체 적용됩니다
//
//  depth map : 흰색(255) = 가장 높음 / 검정(0) = 가장 낮음
//              grayscale PNG 권장 (RGBA 사용 시 R채널 기준)
// ══════════════════════════════════════════════════════════════════
const ASSETS = {
  floorMap:   "/asset/floor.png",
  floorDepth: "/asset/floor.png",      // ← 교체: 바닥 깊이맵 grayscale PNG
  bedMap:     "/asset/bed.png",
  bedDepth:   "/asset/bed.png",        // ← 교체: 침대 깊이맵 grayscale PNG
} as const;

// ── 깊이 효과 조정 ──
const FLOOR_DISPLACEMENT_SCALE = 0.45;  // 바닥 돌출 강도 (높을수록 입체)
const FLOOR_DISPLACEMENT_BIAS  = -0.15; // 바닥 전체 오프셋 (음수=내려감)
const BED_DISPLACEMENT_SCALE   = 0.30;  // 침대 돌출 강도
const BED_DISPLACEMENT_BIAS    = 0.0;

// ── 카메라 기울기 ──
const CLAMP_X = 20;   // gamma (좌우) 최대 ±°
const CLAMP_Y = 12;   // beta delta (앞뒤) 최대 ±°
const LERP    = 0.07; // 보간 계수 (작을수록 부드럽고 느림)

// ── Singleton 틸트 상태 ──
// React state 없이 module-level 객체로 관리 → re-render 제로
const _tgt = { tx: 0, ty: 0 };
const _cur = { tx: 0, ty: 0 };
let _betaCalib: number | null = null;
let _gyroActive               = false;

// ─────────────────────────────────────────────────────────────────
//  CameraRig
//  gyro 틸트값 → 카메라 궤도 이동 → 가구 옆면이 드러나는 효과
// ─────────────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();

  useFrame(() => {
    // Lerp: 현재값 → 목표값으로 부드럽게 수렴
    _cur.tx += (_tgt.tx - _cur.tx) * LERP;
    _cur.ty += (_tgt.ty - _cur.ty) * LERP;

    // 정규화된 기울기 (-1 ~ +1)
    const nx = _cur.tx / CLAMP_X;
    const ny = _cur.ty / CLAMP_Y;

    // 카메라가 중심 위에서 원호로 이동
    const R = 3.2;            // 궤도 반경
    const H = 3.8;            // 기본 높이
    const rX = nx * 0.50;    // 좌우 회전각 (최대 ~28°)
    const rY = ny * 0.28;    // 앞뒤 경사각 (최대 ~16°)

    camera.position.x = Math.sin(rX) * R;
    camera.position.z = Math.cos(rX) * R * 0.55 + rY * 1.4;
    camera.position.y = H - Math.abs(ny) * 0.5;
    camera.lookAt(0, 0.1, 0);
  });

  return null;
}

// ─────────────────────────────────────────────────────────────────
//  Floor
//  4×4 unit 평면, 256×256 분할 → displacement 로 바닥 요철 표현
// ─────────────────────────────────────────────────────────────────
function Floor() {
  const [colorTex, depthTex] = useTexture([ASSETS.floorMap, ASSETS.floorDepth]);

  colorTex.wrapS = colorTex.wrapT = THREE.ClampToEdgeWrapping;
  depthTex.wrapS = depthTex.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[4, 4, 256, 256]} />
      <meshStandardMaterial
        map={colorTex}
        displacementMap={depthTex}
        displacementScale={FLOOR_DISPLACEMENT_SCALE}
        displacementBias={FLOOR_DISPLACEMENT_BIAS}
        roughness={0.88}
        metalness={0.0}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Bed
//  투명 PNG를 바닥 위에 배치 + displacement 로 침대 두께 표현
//  bed.png 실제 비율: 1137×546 ≈ 2.08 : 1
// ─────────────────────────────────────────────────────────────────
function Bed() {
  const [colorTex, depthTex] = useTexture([ASSETS.bedMap, ASSETS.bedDepth]);

  colorTex.wrapS = colorTex.wrapT = THREE.ClampToEdgeWrapping;
  depthTex.wrapS = depthTex.wrapT = THREE.ClampToEdgeWrapping;

  // 방 전체(4unit) 기준 침대 너비 약 55% = 2.2unit
  const W = 2.2;
  const H = W / (1137 / 546); // ≈ 1.057

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.06, -0.65]}
      castShadow
    >
      <planeGeometry args={[W, H, 128, 64]} />
      <meshStandardMaterial
        map={colorTex}
        displacementMap={depthTex}
        displacementScale={BED_DISPLACEMENT_SCALE}
        displacementBias={BED_DISPLACEMENT_BIAS}
        transparent
        alphaTest={0.15}
        roughness={0.72}
        metalness={0.0}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Scene — 조명 구성
//  네온 색조 없이 자연스러운 백색광 → 텍스처 원색이 살아남
// ─────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* 전체 주변광 (부드러운 베이스) */}
      <ambientLight intensity={1.0} color="#ffffff" />

      {/* 위에서 내려오는 메인 조명 */}
      <directionalLight
        position={[1, 5, 2]}
        intensity={1.8}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />

      {/* 보조 역광 (오브젝트 윤곽 살리기) */}
      <directionalLight
        position={[-2, 3, -2]}
        intensity={0.35}
        color="#ddeeff"
      />

      <CameraRig />

      {/* Suspense: 텍스처 로딩 중에는 아무것도 표시 안 함 */}
      <Suspense fallback={null}>
        <Floor />
        <Bed />
      </Suspense>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ThreeRoom — 최상위: Canvas + 이벤트 리스너 관리
// ─────────────────────────────────────────────────────────────────
interface ThreeRoomProps {
  gyroGranted: boolean;
}

export default function ThreeRoom({ gyroGranted }: ThreeRoomProps) {
  useEffect(() => {
    // 마운트마다 보정값 초기화
    _betaCalib  = null;
    _gyroActive = false;

    if (!gyroGranted) return;

    // ── DeviceOrientation (자이로) ──
    function onOrientation(e: DeviceOrientationEvent) {
      const beta  = e.beta  ?? 90;
      const gamma = e.gamma ?? 0;
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
      camera={{ position: [0, 3.8, 2.2], fov: 50, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#0d0d0d", display: "block", width: "100%", height: "100%" }}
      shadows
    >
      <Scene />
    </Canvas>
  );
}
