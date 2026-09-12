import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/api/request";
import { FEATURE_KEYS } from "@/src/lib/features/catalog";
import { isFeatureEnabled } from "@/src/lib/features/evaluation";

/**
 * GET /api/config — evaluated feature map for the current user.
 * Signed-in users only; keys are the allowlisted catalog (never arbitrary
 * flag rows). The frontend feature service is the only consumer.
 */
export async function GET(req: Request) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  try {
    const entries = await Promise.all(
      FEATURE_KEYS.map(async (key) => [
        key,
        await isFeatureEnabled(key, { userId: user.id, role: user.role }),
      ] as const),
    );
    return NextResponse.json({ flags: Object.fromEntries(entries) });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
