"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
//  상수: 카메라 기본 포지션 및 시차 강도
// ─────────────────────────────────────────────

/** 카메라 기본 위치: y=12로 거의 탑다운, z=2로 살짝 기울어짐 */
const CAM_BASE = { x: 0, y: 12, z: 2 } as const;

/**
 * 자이로/마우스 시차 강도.
 * 값이 클수록 카메라가 더 많이 이동함.
 */
const GYRO_STRENGTH = 0.045;
const MOUSE_STRENGTH = 1.8;

/** 카메라 lerp 감쇠 계수 (낮을수록 부드럽고 느림) */
const CAM_LERP = 0.055;

// ─────────────────────────────────────────────
//  buildRoom — 3D 방 구조물 생성 (큐브 조합)
//
//  ⚠️  SWAP POINT: 이 함수 전체를 GLTFLoader로 교체하면
//      외부 .glb/.gltf 모델로 즉시 전환 가능.
//
//  교체 예시:
//    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
//    const loader = new GLTFLoader();
//    loader.load("/models/room.glb", (gltf) => {
//      scene.add(gltf.scene);
//    });
// ─────────────────────────────────────────────
function buildRoom(): THREE.Group {
  const root = new THREE.Group();

  // ── 헬퍼: 박스 메시를 간단히 생성 ──
  function mkBox(
    w: number, h: number, d: number,
    color: number,
    emissive: number = 0x000000,
    emissiveIntensity: number = 1,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity,
      // flatShading으로 로우폴리 픽셀 감성 강조
      // (MeshLambertMaterial은 flatShading 지원 안 함 → MeshPhongMaterial 사용)
    });
    return new THREE.Mesh(geo, mat);
  }

  // ── 바닥 ──
  const floor = mkBox(6.3, 0.15, 6.3, 0x0c1c0c, 0x001a00, 0.5);
  floor.position.y = -0.075;
  root.add(floor);

  // 바닥 타일 격자 (얕은 박스들로 픽셀 타일 표현)
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const tile = mkBox(1.18, 0.05, 1.18, (gx + gz) % 2 === 0 ? 0x0e200e : 0x091509, 0x001200, 0.3);
      tile.position.set(gx * 1.2, 0.02, gz * 1.2);
      root.add(tile);
    }
  }

  // ── 벽 (4면, 얇은 박스) ──
  const wallColor = 0x0a1a0a;
  const wallEmissive = 0x001500;

  // 북쪽 벽
  const wallN = mkBox(6.3, 2.8, 0.18, wallColor, wallEmissive, 0.6);
  wallN.position.set(0, 1.4, -3.15);
  root.add(wallN);

  // 남쪽 벽
  const wallS = mkBox(6.3, 2.8, 0.18, wallColor, wallEmissive, 0.6);
  wallS.position.set(0, 1.4, 3.15);
  root.add(wallS);

  // 서쪽 벽
  const wallW = mkBox(0.18, 2.8, 6.3, wallColor, wallEmissive, 0.6);
  wallW.position.set(-3.15, 1.4, 0);
  root.add(wallW);

  // 동쪽 벽
  const wallE = mkBox(0.18, 2.8, 6.3, wallColor, wallEmissive, 0.6);
  wallE.position.set(3.15, 1.4, 0);
  root.add(wallE);

  // 벽 네온 몰딩 라인 (벽 하단 발광 띠)
  const moldingColor = 0x00ff66;
  const moldingEm = 0x00cc44;
  const mkMolding = (w: number, d: number, x: number, z: number) => {
    const m = mkBox(w, 0.08, d, moldingColor, moldingEm, 1.5);
    m.position.set(x, 0.04, z);
    root.add(m);
  };
  mkMolding(6.0, 0.1, 0, -3.05);   // 북
  mkMolding(6.0, 0.1, 0,  3.05);   // 남
  mkMolding(0.1, 6.0, -3.05, 0);   // 서
  mkMolding(0.1, 6.0,  3.05, 0);   // 동

  // ── 가구: 책상 (북서쪽 코너) ──
  const deskTop = mkBox(1.8, 0.1, 0.9, 0x0a2a18, 0x003322, 0.8);
  deskTop.position.set(-1.8, 0.85, -2.0);
  root.add(deskTop);
  // 책상 다리 4개
  [[-2.6, -2.4], [-2.6, -1.6], [-1.0, -2.4], [-1.0, -1.6]].forEach(([lx, lz]) => {
    const leg = mkBox(0.1, 0.85, 0.1, 0x071a0f);
    leg.position.set(lx, 0.425, lz);
    root.add(leg);
  });

  // 책상 위 모니터 (네온 화면)
  const monitorBody = mkBox(0.9, 0.55, 0.07, 0x081508, 0x001100, 0.5);
  monitorBody.position.set(-1.8, 1.37, -2.35);
  root.add(monitorBody);
  const monitorScreen = mkBox(0.78, 0.44, 0.04, 0x003322, 0x00ffaa, 1.2);
  monitorScreen.position.set(-1.8, 1.38, -2.32);
  root.add(monitorScreen);
  const monitorStand = mkBox(0.08, 0.2, 0.08, 0x081508);
  monitorStand.position.set(-1.8, 1.0, -2.35);
  root.add(monitorStand);

  // ── 가구: 침대 (동쪽) ──
  const bedFrame = mkBox(2.0, 0.18, 2.8, 0x0a1a28, 0x001133, 0.5);
  bedFrame.position.set(2.0, 0.09, 0.2);
  root.add(bedFrame);
  const mattress = mkBox(1.85, 0.32, 2.6, 0x112a1a, 0x002211, 0.4);
  mattress.position.set(2.0, 0.42, 0.2);
  root.add(mattress);
  const pillow = mkBox(0.65, 0.18, 0.45, 0x1a3a22, 0x003322, 0.6);
  pillow.position.set(2.0, 0.73, -0.9);
  root.add(pillow);
  // 침대 헤드보드
  const headboard = mkBox(2.0, 0.7, 0.12, 0x0d2a1a, 0x002211, 0.5);
  headboard.position.set(2.0, 0.65, -1.55);
  root.add(headboard);

  // ── 소품: 네온 발광 큐브들 (픽셀 장식) ──
  const glowItems: [number, number, number, number, number][] = [
    // [x, y, z, color, emissive]
    [-1.8, 1.1, -2.0, 0x00ff88, 0x00ee77],  // 책상 위 물체
    [-2.6, 0.35, 2.2, 0x00ffcc, 0x00bbaa],  // 소품 1
    [ 0.5, 0.35, 2.2, 0xff6600, 0xcc4400],  // 소품 2 (오렌지)
    [-0.5, 0.35, -2.8, 0x0066ff, 0x0044cc], // 소품 3 (블루)
  ];
  glowItems.forEach(([x, y, z, col, em]) => {
    const cube = mkBox(0.28, 0.28, 0.28, col, em, 1.5);
    cube.position.set(x, y, z);
    root.add(cube);
  });

  // ── 중앙 러그 (바닥 장식) ──
  const rug = mkBox(2.5, 0.03, 2.5, 0x0a2a1a, 0x002211, 0.8);
  rug.position.set(-0.5, 0.03, 0.5);
  root.add(rug);

  // ── 캐릭터 플레이스홀더 ──
  // name="character"로 지정하면 외부에서 scene.getObjectByName("character")로 접근 가능
  const charBody = mkBox(0.42, 0.58, 0.42, 0x00ff44, 0x00ee33, 1.2);
  charBody.position.set(-0.4, 0.29, 0.4);
  charBody.name = "character";
  root.add(charBody);

  // 캐릭터 눈 (두 개의 작은 큐브)
  const eyeL = mkBox(0.1, 0.1, 0.05, 0x000000);
  eyeL.position.set(-0.55, 0.42, 0.17); // 앞면 왼쪽
  charBody.add(eyeL); // 캐릭터의 자식으로 추가 (함께 회전)

  const eyeR = mkBox(0.1, 0.1, 0.05, 0x000000);
  eyeR.position.set(-0.55, 0.42, -0.17);
  charBody.add(eyeR);

  return root;
}

// ─────────────────────────────────────────────
//  ThreeScene 컴포넌트
// ─────────────────────────────────────────────
export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  // 자이로 값: Ref 사용 (렌더 루프에서 직접 읽어야 하므로 state 불필요)
  const gyroRef = useRef({ beta: 0, gamma: 0, active: false });
  const mouseRef = useRef({ x: 0, y: 0 });

  // iOS DeviceOrientation 권한 상태
  const [gyroStatus, setGyroStatus] = useState<"idle" | "granted" | "denied" | "unavailable">("idle");

  // ── iOS 자이로 권한 요청 ──
  const requestGyro = useCallback(async () => {
    // iOS 13+에서는 DeviceOrientationEvent.requestPermission() 필요
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (DeviceOrientationEvent as any).requestPermission();
        setGyroStatus(result === "granted" ? "granted" : "denied");
      } catch {
        setGyroStatus("denied");
      }
    } else {
      // Android 또는 데스크탑: 권한 불필요
      setGyroStatus("granted");
    }
  }, []);

  // ── Three.js 초기화 ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── 1. WebGL Renderer ──
    const renderer = new THREE.WebGLRenderer({
      antialias: false,   // 픽셀 선명도 우선 (antialias 끄면 픽셀 엣지가 살아남)
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1);                // 픽셀 선명도: devicePixelRatio 무시
    renderer.setClearColor(0x000a00, 1);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // ── 2. Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000a00, 0.08); // 지수 안개로 가장자리 페이드

    // ── 3. PerspectiveCamera (탑다운, 약간 기울어짐) ──
    const camera = new THREE.PerspectiveCamera(
      45,                                          // FOV: 좁을수록 원근 왜곡 줄어듦
      mount.clientWidth / mount.clientHeight,
      0.1,
      60
    );
    camera.position.set(CAM_BASE.x, CAM_BASE.y, CAM_BASE.z);
    camera.lookAt(0, 0, 0);

    // ── 4. 조명 ──
    // 환경광: 네온 그린 베이스
    const ambient = new THREE.AmbientLight(0x002200, 3);
    scene.add(ambient);

    // 방향광: 위에서 살짝 기울어진 메인 라이트
    const dirLight = new THREE.DirectionalLight(0x00ff88, 2.5);
    dirLight.position.set(3, 10, 4);
    scene.add(dirLight);

    // 네온 포인트 라이트: 방 중앙 (공간감 강조)
    const neonPoint = new THREE.PointLight(0x00ffaa, 4, 9);
    neonPoint.position.set(0, 2.5, 0);
    scene.add(neonPoint);

    // 보조 포인트 라이트: 책상 쪽 (모니터 빛)
    const deskLight = new THREE.PointLight(0x00ffcc, 2, 4);
    deskLight.position.set(-1.8, 1.6, -2.2);
    scene.add(deskLight);

    // ── 5. 방 모델 추가 ──
    // ⚠️  SWAP POINT: buildRoom() → GLTFLoader().load(...) 로 교체
    const roomGroup = buildRoom();
    scene.add(roomGroup);

    // 캐릭터 메시 참조 (애니메이션용)
    const characterMesh = roomGroup.getObjectByName("character") as THREE.Mesh | undefined;
    let charTime = 0;

    // ── 6. DeviceOrientation 이벤트 ──
    const handleOrientation = (e: DeviceOrientationEvent) => {
      gyroRef.current = {
        beta:   e.beta   ?? 0,  // 앞뒤 기울기: 수직 들면 ~90°
        gamma:  e.gamma  ?? 0,  // 좌우 기울기: 평평하면 0°
        active: true,
      };
    };
    window.addEventListener("deviceorientation", handleOrientation, true);

    // ── 7. 마우스 이동 폴백 (데스크탑 테스트용) ──
    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width  - 0.5) * 2,  // -1 ~ 1
        y: ((e.clientY - rect.top)  / rect.height - 0.5) * 2,
      };
    };
    mount.addEventListener("mousemove", handleMouseMove);

    // ── 8. 애니메이션 루프 ──
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      charTime += 0.016;

      // ── 시차 오프셋 계산 ──
      let offsetX: number;
      let offsetZ: number;

      if (gyroRef.current.active) {
        // 자이로 모드:
        //   gamma(-90~90) → 좌우 시차 (X축)
        //   beta(0~180) → 앞뒤 시차 (Z축)
        //   폰을 세로로 들면 beta≈90이 "기준(평형)", 거기서 벗어난 만큼 오프셋
        const normalizedGamma = gyroRef.current.gamma * GYRO_STRENGTH;
        const normalizedBeta  = (gyroRef.current.beta - 90) * GYRO_STRENGTH;
        offsetX =  normalizedGamma;   // 왼쪽 기울임 → 카메라 왼쪽으로 이동 → 오브젝트가 오른쪽으로 이동해 보임
        offsetZ =  normalizedBeta;    // 앞으로 기울임 → 카메라 앞으로 이동
      } else {
        // 마우스 폴백: 마우스가 오른쪽에 있으면 카메라가 오른쪽으로 이동
        offsetX = mouseRef.current.x * MOUSE_STRENGTH;
        offsetZ = mouseRef.current.y * MOUSE_STRENGTH;
      }

      // ── 카메라 위치 부드러운 보간 (Lerp) ──
      // 목표 위치 = 기본 위치 + 오프셋
      camera.position.x += (CAM_BASE.x + offsetX - camera.position.x) * CAM_LERP;
      camera.position.y += (CAM_BASE.y           - camera.position.y) * CAM_LERP;
      camera.position.z += (CAM_BASE.z + offsetZ - camera.position.z) * CAM_LERP;

      // ── 핵심: 카메라는 항상 방 중앙(0,0,0)을 바라봄 ──
      // 이것이 시차 효과의 핵심: 위치는 변하지만 시선은 고정
      camera.lookAt(0, 0, 0);

      // ── 캐릭터 애니메이션 ──
      if (characterMesh) {
        characterMesh.rotation.y = charTime * 0.8;                          // 천천히 회전
        characterMesh.position.y = 0.29 + Math.sin(charTime * 1.5) * 0.06; // 위아래 호버링
      }

      // ── 네온 라이트 펄스 ──
      neonPoint.intensity = 3.5 + Math.sin(charTime * 2) * 0.5;

      renderer.render(scene, camera);
    }

    animate();

    // ── 9. 리사이즈 핸들러 ──
    // 카메라 aspect ratio와 렌더러 크기를 동기화하는 단일 함수.
    // ResizeObserver(컨테이너 기준)와 window resize(뷰포트 기준) 양쪽에 등록해
    // PC↔모바일 전환, 브라우저 창 크기 변경, 주소창 출몰 등 모든 상황을 대응함.
    function handleResize() {
      const nw = mount!.clientWidth;
      const nh = mount!.clientHeight;
      if (nw === 0 || nh === 0) return;
      // 렌더러 해상도 업데이트
      renderer.setSize(nw, nh);
      // 카메라 비율(Aspect Ratio) 업데이트 → 찌그러짐 방지
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }

    // 컨테이너 크기 변화 감지 (PhoneFrame 내부 ↔ 풀스크린 전환 대응)
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // 윈도우 뷰포트 크기 변화 감지 (창 크기 조절, 모바일 주소창 출몰 대응)
    window.addEventListener("resize", handleResize);

    // ── 10. 클린업 ──
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      mount.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
      // Three.js 지오메트리/머티리얼 메모리 해제
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js 캔버스 마운트 포인트 */}
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />

      {/* iOS Safari: 자이로 권한 버튼 (탭 1회 필요) */}
      {gyroStatus === "idle" && (
        <button
          onClick={requestGyro}
          className="absolute bottom-3 left-1/2 -translate-x-1/2
                     px-2 py-0.5 bg-black/80 border border-green-500/70
                     text-green-400 font-mono text-[9px] tracking-widest
                     hover:bg-green-900/30 active:scale-95 transition-all z-30
                     animate-pulse"
          style={{ imageRendering: "pixelated" }}
        >
          ▶ ENABLE GYRO
        </button>
      )}

      {/* 자이로 활성화 상태 표시 */}
      {gyroStatus === "granted" && (
        <div
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-none
                     bg-green-400 animate-pulse z-30"
          title="Gyro active"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}
