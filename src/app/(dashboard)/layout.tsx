import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { FeatureFlagProvider } from "@/components/providers/feature-flag-provider";
import { ServerSessionProvider } from "@/providers/server-session-provider";
import { VersionChecker } from "@/components/shared/version-checker";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Plain-object user data that crosses the RSC → Client Component boundary
  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        firstName: session.user.firstName ?? "",
        lastName: session.user.lastName ?? "",
        image: session.user.image ?? null,
        role: session.user.role ?? "",
        permissions: session.user.permissions ?? [],
      }
    : null;

  return (
    <ServerSessionProvider user={user}>
      <FeatureFlagProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
            <MobileBottomNav />
          </div>
        </div>
        <VersionChecker />
      </FeatureFlagProvider>
    </ServerSessionProvider>
  );
}
