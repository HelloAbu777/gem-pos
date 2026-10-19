import Sidebar from '@/components/layout/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      {/* Mobile: top bar uchun padding, desktop: sidebar bor shuning uchun padding yo'q */}
      <main className="flex-1 overflow-y-auto md:overflow-y-auto pt-12 md:pt-0">
        {children}
      </main>
    </div>
  );
}
