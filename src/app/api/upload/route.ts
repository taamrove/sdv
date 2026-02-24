import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Use Vercel Blob when the token is available (production), filesystem otherwise (local dev). */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "misc";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB" },
        { status: 400 }
      );
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, "");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");
    const filename = `${randomUUID()}.${safeExt}`;

    let url: string;

    if (useBlob) {
      // --- Vercel Blob (production) ---
      const blob = await put(`${safeFolder}/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      url = blob.url;
    } else {
      // --- Local filesystem (development) ---
      const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
      await mkdir(uploadDir, { recursive: true });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(path.join(uploadDir, filename), buffer);

      url = `/uploads/${safeFolder}/${filename}`;
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
