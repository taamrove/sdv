"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FORMATS = {
  thermal: {
    label: "Thermal",
    sub: "58mm — warehouse label",
    page: "58mm auto",
    bodyWidth: "220px",
    qrSize: "200px",
    idSize: "20px",
    nameSize: "12px",
    sizesSize: "11px",
    padding: "6px",
  },
  sticker: {
    label: "Sticker",
    sub: "100×100mm — square label",
    page: "100mm 100mm",
    bodyWidth: "360px",
    qrSize: "280px",
    idSize: "26px",
    nameSize: "15px",
    sizesSize: "13px",
    padding: "10px",
  },
  sheet: {
    label: "A4 Sheet",
    sub: "Full page — centered",
    page: "A4",
    bodyWidth: "600px",
    qrSize: "400px",
    idSize: "36px",
    nameSize: "20px",
    sizesSize: "16px",
    padding: "40px",
  },
} as const;

type FormatKey = keyof typeof FORMATS;

interface QRPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  humanReadableId: string;
  productName?: string;
  sizes?: Record<string, string> | null;
}

function buildSizeString(sizes?: Record<string, string> | null): string {
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

export function QRPrintDialog({
  open,
  onOpenChange,
  itemId,
  humanReadableId,
  productName,
  sizes,
}: QRPrintDialogProps) {
  const [format, setFormat] = useState<FormatKey>("thermal");
  const [printing, setPrinting] = useState(false);
  const qrUrl = `/api/qr/${itemId}`;
  const sizeStr = buildSizeString(sizes);
  const fmt = FORMATS[format];

  function handlePrint() {
    setPrinting(true);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Label — ${humanReadableId}</title>
            <style>
              @page { margin: 0; size: ${fmt.page}; }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                margin: 0;
                padding: ${fmt.padding};
                font-family: monospace, sans-serif;
                width: ${fmt.bodyWidth};
                box-sizing: border-box;
              }
              img { display: block; width: ${fmt.qrSize}; height: ${fmt.qrSize}; }
              .id { font-size: ${fmt.idSize}; font-weight: bold; margin-top: 4px; text-align: center; }
              .name { font-size: ${fmt.nameSize}; margin-top: 2px; text-align: center; font-family: sans-serif; }
              .sizes { font-size: ${fmt.sizesSize}; margin-top: 2px; text-align: center; color: #555; font-family: sans-serif; }
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

  const previewQrSize =
    format === "sheet" ? 80 : format === "sticker" ? 70 : 56;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Print QR Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selector */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(FORMATS) as [FormatKey, (typeof FORMATS)[FormatKey]][]).map(
              ([key, f]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-left transition-colors",
                    format === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30 text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-medium leading-tight">{f.label}</span>
                  <span className="text-[10px] leading-tight opacity-75">{f.sub}</span>
                </button>
              )
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">
              Preview
            </p>
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR preview"
                width={previewQrSize}
                height={previewQrSize}
                className="block"
              />
              <p className="font-mono font-bold text-sm">{humanReadableId}</p>
              {productName && (
                <p className="text-xs text-center max-w-[160px] truncate">{productName}</p>
              )}
              {sizeStr && (
                <p className="text-[10px] text-muted-foreground text-center">{sizeStr}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={printing}>
              {printing ? "Printing..." : "Print"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
