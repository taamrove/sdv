"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScanResultCard } from "@/components/scanner/scan-result-card";
import type { ScannedItem } from "@/components/scanner/scan-result-card";
import { QuickActions } from "@/components/scanner/quick-actions";
import type { PackableContainer } from "@/components/scanner/quick-actions";
import { CameraScanner } from "@/components/scanner/camera-scanner";
import type { CameraScannerHandle } from "@/components/scanner/camera-scanner";
import {
  lookupItemByBarcode,
  lookupItemById,
  getContainersForPacking,
} from "@/actions/scan";
import { ITEM_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { ScanLine, Loader2, Clock, Trash2, Camera, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanHistoryEntry {
  humanReadableId: string;
  productName: string;
  status: string;
  scannedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HISTORY_STORAGE_KEY = "sdv-scan-history";
const MAX_HISTORY = 20;

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScannerView() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentItem, setCurrentItem] = useState<ScannedItem | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [containers, setContainers] = useState<PackableContainer[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  // Detected once on mount — avoids hydration mismatch
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraScannerRef = useRef<CameraScannerHandle>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Detect mobile + auto-open camera
  // -----------------------------------------------------------------------
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) setShowCamera(true);
  }, []);

  // -----------------------------------------------------------------------
  // Load containers on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    getContainersForPacking().then((result) => {
      if ("data" in result) setContainers(result.data as PackableContainer[]);
    });
  }, []);

  // -----------------------------------------------------------------------
  // Persist scan history to sessionStorage
  // -----------------------------------------------------------------------
  useEffect(() => {
    const saved = sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (historyLoaded) {
      sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(scanHistory));
    }
  }, [scanHistory, historyLoaded]);

  // -----------------------------------------------------------------------
  // Auto-focus input on desktop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isMobile) inputRef.current?.focus();
  }, [isMobile]);

  // -----------------------------------------------------------------------
  // Process a found item
  // -----------------------------------------------------------------------
  const processFoundItem = useCallback((item: ScannedItem) => {
    setCurrentItem(item);
    setScanHistory((prev) => {
      const entry: ScanHistoryEntry = {
        humanReadableId: item.humanReadableId,
        productName: item.product.name,
        status: item.status,
        scannedAt: new Date().toISOString(),
      };
      const filtered = prev.filter(
        (e) => e.humanReadableId !== item.humanReadableId
      );
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });

    toast.success(`${item.humanReadableId} — ${item.product.name}`);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // -----------------------------------------------------------------------
  // Core lookup (manual input)
  // -----------------------------------------------------------------------
  const performLookup = useCallback(
    async (humanReadableId: string) => {
      setLoading(true);
      try {
        const result = await lookupItemByBarcode({
          humanReadableId: humanReadableId.trim().toUpperCase(),
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        processFoundItem(result.data as ScannedItem);
      } catch {
        toast.error("Failed to look up item");
      } finally {
        setLoading(false);
        setBarcode("");
        inputRef.current?.focus();
      }
    },
    [processFoundItem]
  );

  // -----------------------------------------------------------------------
  // Camera scan handler
  // -----------------------------------------------------------------------
  const handleCameraScan = useCallback(
    async (scannedValue: string) => {
      setLoading(true);
      try {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            scannedValue
          );

        const result = isUuid
          ? await lookupItemById(scannedValue)
          : await lookupItemByBarcode({
              humanReadableId: scannedValue.trim().toUpperCase(),
            });

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        const item = result.data as ScannedItem;
        processFoundItem(item);

        // Close camera after successful scan
        cameraScannerRef.current?.stop();
        setShowCamera(false);
      } catch {
        toast.error("Failed to look up scanned item");
      } finally {
        setLoading(false);
      }
    },
    [processFoundItem]
  );

  // -----------------------------------------------------------------------
  // Form submit
  // -----------------------------------------------------------------------
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = barcode.trim();
    if (!value) return;
    performLookup(value);
  }

  // -----------------------------------------------------------------------
  // Action complete (re-fetch item + containers)
  // -----------------------------------------------------------------------
  const handleActionComplete = useCallback(async () => {
    if (currentItem) {
      const itemResult = await lookupItemByBarcode({
        humanReadableId: currentItem.humanReadableId,
      });
      if ("data" in itemResult) {
        const refreshed = itemResult.data as ScannedItem;
        setCurrentItem(refreshed);
        setScanHistory((prev) =>
          prev.map((e) =>
            e.humanReadableId === refreshed.humanReadableId
              ? { ...e, status: refreshed.status }
              : e
          )
        );
      }
    }
    const containerResult = await getContainersForPacking();
    if ("data" in containerResult) {
      setContainers(containerResult.data as PackableContainer[]);
    }
    inputRef.current?.focus();
  }, [currentItem]);

  function handleHistoryClick(humanReadableId: string) {
    setShowCamera(false);
    performLookup(humanReadableId);
  }

  function handleClearHistory() {
    setScanHistory([]);
  }

  // -----------------------------------------------------------------------
  // Open camera for next scan
  // -----------------------------------------------------------------------
  function openCameraForNext() {
    setCurrentItem(null);
    setBarcode("");
    setShowCamera(true);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      {/* ================================================================
          MOBILE: Full-screen camera overlay
          ================================================================ */}
      {showCamera && isMobile && (
        <>
          <CameraScanner
            ref={cameraScannerRef}
            onScan={handleCameraScan}
            fullscreen
            autoStart
            onClose={() => setShowCamera(false)}
          />

          {/* Floating input bar — above the camera overlay */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-6"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 60%, transparent 100%)",
            }}
          >
            {loading && (
              <p className="text-white/60 text-xs text-center mb-2 animate-pulse flex items-center justify-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Looking up item…
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-white/40" />
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter item ID manually…"
                  className="pl-10 h-12 text-base bg-white/10 text-white placeholder:text-white/40 border-white/20 focus-visible:ring-white/30"
                  disabled={loading}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !barcode.trim()}
                size="icon"
                className="h-12 w-12 shrink-0 bg-white text-black hover:bg-white/90 border-0"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* ================================================================
          DESKTOP + MOBILE (when camera closed): Main layout
          ================================================================ */}
      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-6",
          showCamera && isMobile && "hidden"
        )}
      >
        {/* Desktop camera panel — 1 column when open */}
        {showCamera && !isMobile && (
          <div className="hidden lg:block">
            <CameraScanner
              ref={cameraScannerRef}
              onScan={handleCameraScan}
              autoStart
            />
          </div>
        )}

        {/* Main column: input + results */}
        <div
          className={cn(
            "space-y-6",
            !(showCamera && !isMobile) && "lg:col-span-2"
          )}
        >
          {/* Input card */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan barcode or type item ID…"
                    className="pl-10 text-lg h-12"
                    disabled={loading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !barcode.trim()}
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ScanLine className="size-4" />
                  )}
                  Scan
                </Button>
              </form>

              {/* Camera toggle button */}
              <Button
                variant={showCamera && !isMobile ? "secondary" : "outline"}
                className="w-full"
                onClick={() => {
                  if (showCamera) {
                    cameraScannerRef.current?.stop();
                    setShowCamera(false);
                  } else {
                    setShowCamera(true);
                  }
                }}
              >
                <Camera className="size-4 mr-2" />
                {showCamera && !isMobile
                  ? "Close Camera"
                  : "Open Camera Scanner"}
              </Button>
            </CardContent>
          </Card>

          {/* Result + Quick Actions */}
          {currentItem ? (
            <div ref={resultRef} className="space-y-6">
              <ScanResultCard item={currentItem} />
              <QuickActions
                item={currentItem}
                containers={containers}
                onActionComplete={handleActionComplete}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={openCameraForNext}
              >
                <Camera className="size-4 mr-2" />
                Scan Another Item
              </Button>
            </div>
          ) : !showCamera ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ScanLine className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">
                  Scan an item to get started
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use a barcode scanner, type an item ID, or open the camera
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* History sidebar — desktop only */}
        <div className="hidden lg:block lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan History</CardTitle>
              <CardAction>
                <Badge variant="secondary">{scanHistory.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items scanned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {scanHistory.map((entry) => (
                    <button
                      key={entry.humanReadableId}
                      onClick={() => handleHistoryClick(entry.humanReadableId)}
                      className="w-full rounded-md border p-3 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">
                          {entry.humanReadableId}
                        </span>
                        <StatusBadge
                          status={entry.status}
                          label={
                            ITEM_STATUS_LABELS[entry.status] ?? entry.status
                          }
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-muted-foreground">
                        <span className="truncate mr-2">
                          {entry.productName}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="size-3" />
                          {formatRelativeTime(entry.scannedAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
            {scanHistory.length > 0 && (
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="w-full text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                  Clear History
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
