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
import type { ScannedPiece } from "@/components/scanner/scan-result-card";
import { QuickActions } from "@/components/scanner/quick-actions";
import type { PackableContainer } from "@/components/scanner/quick-actions";
import { CameraScanner } from "@/components/scanner/camera-scanner";
import type { CameraScannerHandle } from "@/components/scanner/camera-scanner";
import { lookupPieceByBarcode, lookupPieceById, getContainersForPacking } from "@/actions/scan";
import { PIECE_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { ScanLine, Loader2, Clock, Trash2, Camera } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanHistoryEntry {
  humanReadableId: string;
  itemName: string;
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

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScannerView() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPiece, setCurrentPiece] = useState<ScannedPiece | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [containers, setContainers] = useState<PackableContainer[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraScannerRef = useRef<CameraScannerHandle>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Load containers on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function loadContainers() {
      const result = await getContainersForPacking();
      if ("data" in result) {
        setContainers(result.data as PackableContainer[]);
      }
    }
    loadContainers();
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
        // Ignore invalid stored data
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
  // Auto-focus on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // -----------------------------------------------------------------------
  // Common: process a found piece
  // -----------------------------------------------------------------------
  const processFoundPiece = useCallback((piece: ScannedPiece) => {
    setCurrentPiece(piece);

    // Prepend to scan history (deduplicate and cap at MAX_HISTORY)
    setScanHistory((prev) => {
      const entry: ScanHistoryEntry = {
        humanReadableId: piece.humanReadableId,
        itemName: piece.item.name,
        status: piece.status,
        scannedAt: new Date().toISOString(),
      };
      const filtered = prev.filter(
        (e) => e.humanReadableId !== piece.humanReadableId
      );
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });

    toast.success(`${piece.humanReadableId} — ${piece.item.name}`);

    // Scroll result into view
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // -----------------------------------------------------------------------
  // Core scan function (text input / barcode scanner)
  // -----------------------------------------------------------------------
  const performLookup = useCallback(
    async (humanReadableId: string) => {
      setLoading(true);
      try {
        const result = await lookupPieceByBarcode({
          humanReadableId: humanReadableId.trim().toUpperCase(),
        });

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        processFoundPiece(result.data as ScannedPiece);
      } catch {
        toast.error("Failed to look up piece");
      } finally {
        setLoading(false);
        setBarcode("");
        inputRef.current?.focus();
      }
    },
    [processFoundPiece]
  );

  // -----------------------------------------------------------------------
  // Camera scan handler
  // -----------------------------------------------------------------------
  const handleCameraScan = useCallback(
    async (scannedValue: string) => {
      setLoading(true);
      try {
        // Check if it's a UUID (from QR code)
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            scannedValue
          );

        let result;
        if (isUuid) {
          result = await lookupPieceById(scannedValue);
        } else {
          result = await lookupPieceByBarcode({
            humanReadableId: scannedValue.trim().toUpperCase(),
          });
        }

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        const piece = result.data as ScannedPiece;
        processFoundPiece(piece);

        // Stop camera after successful scan so the result is visible
        cameraScannerRef.current?.stop();
        setShowCamera(false);
      } catch {
        toast.error("Failed to look up scanned piece");
      } finally {
        setLoading(false);
      }
    },
    [processFoundPiece]
  );

  // -----------------------------------------------------------------------
  // Handle form submit
  // -----------------------------------------------------------------------
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = barcode.trim();
    if (!value) return;
    performLookup(value);
  }

  // -----------------------------------------------------------------------
  // Action complete callback (re-fetch piece + containers, re-focus)
  // -----------------------------------------------------------------------
  const handleActionComplete = useCallback(async () => {
    if (currentPiece) {
      // Re-fetch the current piece
      const pieceResult = await lookupPieceByBarcode({
        humanReadableId: currentPiece.humanReadableId,
      });
      if ("data" in pieceResult) {
        const refreshedPiece = pieceResult.data as ScannedPiece;
        setCurrentPiece(refreshedPiece);

        // Update history entry with new status
        setScanHistory((prev) =>
          prev.map((entry) =>
            entry.humanReadableId === refreshedPiece.humanReadableId
              ? { ...entry, status: refreshedPiece.status }
              : entry
          )
        );
      }
    }

    // Re-fetch containers
    const containerResult = await getContainersForPacking();
    if ("data" in containerResult) {
      setContainers(containerResult.data as PackableContainer[]);
    }

    inputRef.current?.focus();
  }, [currentPiece]);

  // -----------------------------------------------------------------------
  // History entry click
  // -----------------------------------------------------------------------
  function handleHistoryClick(humanReadableId: string) {
    performLookup(humanReadableId);
  }

  // -----------------------------------------------------------------------
  // Clear history
  // -----------------------------------------------------------------------
  function handleClearHistory() {
    setScanHistory([]);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: input + result + actions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Scan input + camera toggle */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode or type piece ID..."
                  className="pl-10 text-lg h-12"
                  disabled={loading}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
              <Button type="submit" disabled={loading || !barcode.trim()} size="lg">
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
                )}
                Scan
              </Button>
            </form>
            {!showCamera && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="size-4 mr-2" />
                Open Camera Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Camera scanner -- shown on demand */}
        {showCamera && (
          <CameraScanner
            ref={cameraScannerRef}
            onScan={handleCameraScan}
          />
        )}

        {/* Result + Quick Actions */}
        {currentPiece ? (
          <div ref={resultRef} className="space-y-6">
            <ScanResultCard piece={currentPiece} />
            <QuickActions
              piece={currentPiece}
              containers={containers}
              onActionComplete={handleActionComplete}
            />
            {!showCamera && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowCamera(true);
                  setCurrentPiece(null);
                }}
              >
                <Camera className="size-4 mr-2" />
                Scan Another Piece
              </Button>
            )}
          </div>
        ) : !showCamera ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ScanLine className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                Scan a piece to get started
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use a barcode scanner, type a piece ID, or open the camera
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Right column: scan history */}
      <div className="lg:col-span-1">
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
                No pieces scanned yet
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
                        label={PIECE_STATUS_LABELS[entry.status] ?? entry.status}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-muted-foreground">
                      <span className="truncate mr-2">{entry.itemName}</span>
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
  );
}
