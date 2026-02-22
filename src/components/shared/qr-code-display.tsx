"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface QRCodeDisplayProps {
  itemId: string;
  humanReadableId: string;
  size?: number;
}

export function QRCodeDisplay({
  itemId,
  humanReadableId,
  size = 200,
}: QRCodeDisplayProps) {
  const qrUrl = `/api/qr/${itemId}`;
  const [printing, setPrinting] = useState(false);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qr-${humanReadableId}.png`;
    link.click();
  }

  function handlePrint() {
    setPrinting(true);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${humanReadableId}</title></head>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;">
            <img src="${qrUrl}" width="300" height="300" />
            <p style="font-size:24px;font-weight:bold;font-family:monospace;margin-top:16px;">${humanReadableId}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setPrinting(false);
      };
    } else {
      setPrinting(false);
    }
  }

  return (
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
          onClick={handlePrint}
          disabled={printing}
        >
          <Printer className="mr-1 h-3 w-3" />
          {printing ? "Printing..." : "Print"}
        </Button>
      </div>
    </div>
  );
}
