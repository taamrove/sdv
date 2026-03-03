"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

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
  const [printing, setPrinting] = useState(false);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qr-${humanReadableId}.png`;
    link.click();
  }

  function buildSizeString() {
    if (!sizes) return "";
    const parts: string[] = [];
    if (sizes["size"]) parts.push(sizes["size"]);
    if (sizes["shoe"]) parts.push(`Shoe ${sizes["shoe"]}`);
    if (sizes["hat"]) parts.push(`Hat ${sizes["hat"]}`);
    if (sizes["chest"]) parts.push(`C${sizes["chest"]}`);
    if (sizes["waist"]) parts.push(`W${sizes["waist"]}`);
    if (sizes["hip"]) parts.push(`H${sizes["hip"]}`);
    return parts.join(" / ");
  }

  function handlePrint() {
    setPrinting(true);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const sizeStr = buildSizeString();
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Label — ${humanReadableId}</title>
            <style>
              @page { margin: 0; size: 58mm auto; }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                margin: 0;
                padding: 6px;
                font-family: monospace, sans-serif;
                width: 220px;
                box-sizing: border-box;
              }
              img { display: block; width: 200px; height: 200px; }
              .id { font-size: 20px; font-weight: bold; margin-top: 4px; text-align: center; }
              .name { font-size: 12px; margin-top: 2px; text-align: center; font-family: sans-serif; }
              .sizes { font-size: 11px; margin-top: 2px; text-align: center; color: #555; font-family: sans-serif; }
            </style>
          </head>
          <body>
            <img src="${qrUrl}" />
            <div class="id">${humanReadableId}</div>
            ${productName ? `<div class="name">${productName}</div>` : ""}
            ${sizeStr ? `<div class="sizes">${sizeStr}</div>` : ""}
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
