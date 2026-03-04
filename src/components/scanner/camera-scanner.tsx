"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, SwitchCamera } from "lucide-react";
import jsQR from "jsqr";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
}

export interface CameraScannerHandle {
  stop: () => void;
}

/**
 * Inline camera scanner using getUserMedia + frame analysis.
 * Uses native BarcodeDetector when available (Chrome, Edge, Safari 17.2+)
 * and falls back to jsQR for all other browsers.
 *
 * The video feed is rendered directly inside the card — no popups.
 */
export const CameraScanner = forwardRef<CameraScannerHandle, CameraScannerProps>(
  function CameraScanner({ onScan }, ref) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [scannerMode, setScannerMode] = useState<"native" | "jsqr" | null>(
    null
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false); // prevents overlapping detect() calls
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // ------------------------------------------------------------------
  // Stop camera + scanning loop
  // ------------------------------------------------------------------
  const stopScanner = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    scanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  // Expose stop() to parent via ref
  useImperativeHandle(ref, () => ({ stop: stopScanner }), [stopScanner]);

  // ------------------------------------------------------------------
  // Parse QR / barcode payload
  // ------------------------------------------------------------------
  const handleDetection = useCallback(
    (raw: string) => {
      const now = Date.now();
      if (
        raw === lastScanRef.current &&
        now - lastScanTimeRef.current < 2000
      ) {
        return; // debounce duplicate scans
      }
      lastScanRef.current = raw;
      lastScanTimeRef.current = now;

      let result = raw;

      if (raw.startsWith("sdv:")) {
        result = raw.slice(4);
      } else {
        try {
          const url = new URL(raw);
          const parts = url.pathname.split("/");
          const idx = parts.indexOf("inventory");
          if (idx !== -1 && parts[idx + 1]) {
            result = parts[idx + 1];
          }
        } catch {
          // plain text — humanReadableId
        }
      }

      onScan(result);
    },
    [onScan]
  );

  // ------------------------------------------------------------------
  // Start camera + scanning loop
  // ------------------------------------------------------------------
  const startScanner = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      // Wait for video to actually be playing before starting scan loop
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
        video.play().catch(() => {});
      });

      setIsActive(true);

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      // Prefer native BarcodeDetector (faster, supports barcodes + QR)
      const hasNative =
        typeof window !== "undefined" && "BarcodeDetector" in window;

      setScannerMode(hasNative ? "native" : "jsqr");

      // Use setInterval (not rAF) — more reliable across browsers,
      // especially Safari where rAF can throttle in background-ish tabs.
      // Scan ~5 times per second.
      intervalRef.current = setInterval(async () => {
        // Guard: skip if a previous detect() is still running
        if (scanningRef.current) return;
        if (!video || video.readyState < 2) return;

        scanningRef.current = true;

        try {
          // Draw current video frame to canvas
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (hasNative) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detector = new (window as any).BarcodeDetector({
              formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes: any[] = await detector.detect(canvas);
            if (barcodes.length > 0) {
              handleDetection(barcodes[0].rawValue);
            }
          } else {
            // jsQR fallback
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              { inversionAttempts: "dontInvert" }
            );
            if (code) {
              handleDetection(code.data);
            }
          }
        } catch {
          // ignore detection errors — retry next interval
        } finally {
          scanningRef.current = false;
        }
      }, 200); // 5 fps
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start camera. Please check camera permissions."
      );
      setIsActive(false);
    }
  }, [facingMode, handleDetection]);

  // ------------------------------------------------------------------
  // Switch front/rear camera
  // ------------------------------------------------------------------
  const toggleCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
  }, [facingMode]);

  // Restart when facingMode changes while active
  useEffect(() => {
    if (isActive) {
      stopScanner();
      const timer = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Camera Scanner
          </CardTitle>
          <div className="flex gap-2">
            {isActive && (
              <Button variant="outline" size="default" onClick={toggleCamera}>
                <SwitchCamera className="mr-1 h-4 w-4" />
                Flip
              </Button>
            )}
            <Button
              variant={isActive ? "destructive" : "outline"}
              size="sm"
              onClick={isActive ? stopScanner : startScanner}
            >
              {isActive ? (
                <>
                  <CameraOff className="mr-1 h-3 w-3" />
                  Stop
                </>
              ) : (
                <>
                  <Camera className="mr-1 h-3 w-3" />
                  Start Camera
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Video feed — always in DOM so ref is ready, hidden when inactive */}
        <div
          className={`relative overflow-hidden rounded-lg bg-black ${isActive ? "" : "hidden"}`}
        >
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            playsInline
            muted
            autoPlay
          />
          {/* Scan region overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-white/60 rounded-lg" />
          </div>
        </div>

        {/* Off-screen canvas for frame capture — positioned off screen, not display:none */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
        />

        {!isActive && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click &quot;Start Camera&quot; to scan QR codes with your device
            camera.
          </p>
        )}
        {isActive && scannerMode === "jsqr" && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Using fallback QR scanner (QR codes only)
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}
      </CardContent>
    </Card>
  );
});
