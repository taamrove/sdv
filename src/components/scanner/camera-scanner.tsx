"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, SwitchCamera, X, Flashlight, ZoomIn } from "lucide-react";
import jsQR from "jsqr";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  /** Renders as a fixed full-screen overlay (mobile). Default: false (card). */
  fullscreen?: boolean;
  /** Auto-start the camera stream on mount. */
  autoStart?: boolean;
  /** Called when the close button is pressed (fullscreen mode). */
  onClose?: () => void;
}

export interface CameraScannerHandle {
  stop: () => void;
}

export const CameraScanner = forwardRef<
  CameraScannerHandle,
  CameraScannerProps
>(function CameraScanner(
  { onScan, fullscreen = false, autoStart = false, onClose },
  ref
) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [scannerMode, setScannerMode] = useState<"native" | "jsqr" | null>(null);

  // ---- Torch / Flash ----
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // ---- Zoom ----
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [zoomStep, setZoomStep] = useState(0.1);
  const [zoom, setZoom] = useState(1);
  const [showZoom, setShowZoom] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);
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
    setTorchOn(false);
    setTorchSupported(false);
    setZoomSupported(false);
    setZoom(1);
    setShowZoom(false);
  }, []);

  useImperativeHandle(ref, () => ({ stop: stopScanner }), [stopScanner]);

  // ------------------------------------------------------------------
  // Parse QR / barcode payload
  // ------------------------------------------------------------------
  const handleDetection = useCallback(
    (raw: string) => {
      const now = Date.now();
      if (raw === lastScanRef.current && now - lastScanTimeRef.current < 2000) return;
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
          if (idx !== -1 && parts[idx + 1]) result = parts[idx + 1];
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
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
        video.play().catch(() => {});
      });

      setIsActive(true);

      // ---- Detect torch + zoom capabilities ----
      const track = stream.getVideoTracks()[0];
      if (track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps = track.getCapabilities() as any;
        if (caps?.torch) {
          setTorchSupported(true);
        }
        if (caps?.zoom) {
          setZoomSupported(true);
          setZoomMin(caps.zoom.min ?? 1);
          setZoomMax(caps.zoom.max ?? 1);
          setZoomStep(caps.zoom.step ?? 0.1);
          setZoom(caps.zoom.min ?? 1);
        }
      }

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const hasNative =
        typeof window !== "undefined" && "BarcodeDetector" in window;
      setScannerMode(hasNative ? "native" : "jsqr");

      intervalRef.current = setInterval(async () => {
        if (scanningRef.current) return;
        if (!video || video.readyState < 2) return;
        scanningRef.current = true;
        try {
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
            if (barcodes.length > 0) handleDetection(barcodes[0].rawValue);
          } else {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (code) handleDetection(code.data);
          }
        } catch {
          // ignore
        } finally {
          scanningRef.current = false;
        }
      }, 200);
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
  // Auto-start on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    if (autoStart) startScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Switch front/rear camera
  // ------------------------------------------------------------------
  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  useEffect(() => {
    if (isActive) {
      stopScanner();
      const timer = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ------------------------------------------------------------------
  // Torch toggle
  // ------------------------------------------------------------------
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch {
      // Torch not supported on this device
    }
  }, [torchOn]);

  // ------------------------------------------------------------------
  // Zoom change
  // ------------------------------------------------------------------
  const applyZoom = useCallback(async (value: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ zoom: value } as any] });
      setZoom(value);
    } catch {
      // Zoom not supported on this device
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ------------------------------------------------------------------
  // Scan guide corners (shared)
  // ------------------------------------------------------------------
  const ScanGuide = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-56 h-56">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
      </div>
    </div>
  );

  // ------------------------------------------------------------------
  // Zoom slider (shared between both modes, styled differently)
  // ------------------------------------------------------------------
  const ZoomControl = ({ dark }: { dark?: boolean }) =>
    zoomSupported && isActive ? (
      <div
        className={`flex items-center gap-3 ${dark ? "text-white" : "text-foreground"}`}
      >
        <ZoomIn
          className={`h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-muted-foreground"}`}
        />
        <Slider
          min={zoomMin}
          max={zoomMax}
          step={zoomStep}
          value={[zoom]}
          onValueChange={([v]: number[]) => applyZoom(v)}
          className={`w-full ${dark ? "[&_[role=slider]]:bg-white [&_.bg-primary]:bg-white" : ""}`}
        />
        <span
          className={`text-xs w-8 text-right tabular-nums ${dark ? "text-white/60" : "text-muted-foreground"}`}
        >
          {zoom.toFixed(1)}×
        </span>
      </div>
    ) : null;

  // ------------------------------------------------------------------
  // FULLSCREEN mode (mobile overlay)
  // ------------------------------------------------------------------
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video fills entire screen */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Off-screen canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
        />

        {/* Scan guide corners */}
        {isActive && <ScanGuide />}

        {/* Top bar: close + torch + flip */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 bg-black/30"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {isActive && (
            <div className="flex items-center gap-2">
              {torchSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`hover:bg-white/20 ${torchOn ? "text-yellow-300 bg-white/20" : "text-white bg-black/30"}`}
                  onClick={toggleTorch}
                >
                  <Flashlight className="h-5 w-5" />
                </Button>
              )}
              {zoomSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`hover:bg-white/20 ${showZoom ? "text-white bg-white/20" : "text-white bg-black/30"}`}
                  onClick={() => setShowZoom((v) => !v)}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 bg-black/30"
                onClick={toggleCamera}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Zoom slider (below top bar) */}
        {showZoom && isActive && (
          <div className="absolute top-20 left-4 right-4 bg-black/50 rounded-xl px-4 py-3">
            <ZoomControl dark />
          </div>
        )}

        {/* Centre state: not started / error */}
        {!isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Camera className="h-16 w-16 text-white/40" />
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20 bg-black/40"
              onClick={startScanner}
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <p className="text-white text-center text-sm bg-black/60 rounded-xl px-5 py-4">
              {error}
            </p>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={startScanner}
            >
              Try Again
            </Button>
          </div>
        )}

        {isActive && scannerMode === "jsqr" && (
          <p className="absolute top-20 inset-x-0 text-center text-xs text-white/50">
            QR codes only
          </p>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // CARD mode (desktop)
  // ------------------------------------------------------------------
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Camera Scanner
          </CardTitle>
          <div className="flex gap-2">
            {isActive && torchSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTorch}
                className={torchOn ? "border-yellow-400 text-yellow-600" : ""}
              >
                <Flashlight className="mr-1 h-4 w-4" />
                {torchOn ? "Flash On" : "Flash"}
              </Button>
            )}
            {isActive && (
              <Button variant="outline" size="sm" onClick={toggleCamera}>
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
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <ScanGuide />
        </div>

        <canvas
          ref={canvasRef}
          style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
        />

        {/* Zoom slider */}
        {isActive && zoomSupported && <ZoomControl />}

        {!isActive && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click &quot;Start&quot; to begin scanning.
          </p>
        )}
        {isActive && scannerMode === "jsqr" && (
          <p className="text-xs text-muted-foreground text-center">
            Using fallback scanner (QR codes only)
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}
      </CardContent>
    </Card>
  );
});
