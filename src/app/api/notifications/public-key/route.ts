import { NextResponse } from "next/server";

// GET /api/notifications/public-key - Return the configured VAPID public key
export async function GET() {
  // Prefer explicit server-side key; fallback to NEXT_PUBLIC for local dev parity
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 404 }
    );
  }

  return NextResponse.json({ publicKey });
}

