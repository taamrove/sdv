import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ScannerView } from "@/components/scanner/scanner-view";

export default async function ScanPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scanner"
        description="Scan piece barcodes for quick actions"
      />
      <ScannerView />
    </div>
  );
}
