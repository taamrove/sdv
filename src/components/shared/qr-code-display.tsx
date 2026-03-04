"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { QRPrintDialog } from "@/components/shared/qr-print-dialog";

interface QRCodeDisplayProps {
  itemId: string;
  humanReadableId: string;
  /** Optional product name shown on the print label */
  productName?: string;
  /** Optional sizes map to show on the print label */
  sizes?: Record<string, string>;
  size?: number;
}

export function QRCodeDisplay({
  itemId,
  humanReadableId,
  productName,
  sizes,
  size = 200,
}: QRCodeDisplayProps) {
  const qrUrl = `/api/qr/${itemId}`;
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qr-${humanReadableId}.png`;
    link.click();
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-lg border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code for ${humanReadableId}`}
            width={size}
            height={size}
            className="block"
          />
        </div>
        <p className="font-mono text-sm font-bold">{humanReadableId}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1 h-3 w-3" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintDialogOpen(true)}
          >
            <Printer className="mr-1 h-3 w-3" />
            Print
          </Button>
        </div>
      </div>

      <QRPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        itemId={itemId}
        humanReadableId={humanReadableId}
        productName={productName}
        sizes={sizes}
      />
    </>
  );
}
