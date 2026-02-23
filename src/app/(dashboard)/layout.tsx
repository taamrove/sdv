import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FeatureFlagProvider } from "@/components/providers/feature-flag-provider";
import { VersionChecker } from "@/components/shared/version-checker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
      <VersionChecker />
    </FeatureFlagProvider>
  );
}
