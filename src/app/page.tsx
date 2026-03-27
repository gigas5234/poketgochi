// ── PocketGochi 메인 페이지 ──
// AppShell이 기기 감지 후 PC/모바일 뷰를 분기함.
import AppShell from "@/components/AppShell";

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <AppShell />
    </main>
  );
}
