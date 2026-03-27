// ── PocketGochi 메인 페이지 ──
// Next.js App Router의 루트 페이지.
// PhoneFrame이 전체 화면을 차지하며 게임을 감쌈.
import PhoneFrame from "@/components/PhoneFrame";

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <PhoneFrame />
    </main>
  );
}
