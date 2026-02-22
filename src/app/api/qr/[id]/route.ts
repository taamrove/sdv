import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * QR codes encode ONLY the item UUID (prefixed with "sdv:").
 * This makes them domain-independent — they never expire or break
 * when the app URL / IP changes. The in-app camera scanner parses
 * the "sdv:{uuid}" payload and looks up the item directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Encode a compact, domain-independent payload
  const payload = `sdv:${id}`;

  try {
    const buffer = await QRCode.toBuffer(payload, {
      type: "png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
