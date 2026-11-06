import { getState } from "@/lib/rooms";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { code } = await params;
  return handle(async () => getState(code, new URL(req.url).searchParams.get("playerId")));
}
