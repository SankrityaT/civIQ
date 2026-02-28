import Sidebar from "@/components/dashboard/Sidebar";
import SamAssistant from "@/components/dashboard/SamAssistant";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 px-6 py-8 lg:px-10">{children}</main>
      <SamAssistant />
    </div>
  );
}
