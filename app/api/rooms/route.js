import { createRoom } from "@/lib/rooms";
import { handle, readBody } from "@/lib/http";

export async function POST(req) {
  return handle(async () => createRoom((await readBody(req)).name));
}
