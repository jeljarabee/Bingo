import { claimBingo, draw, HttpError, joinRoom, resetRoom } from "@/lib/rooms";
import { handle, readBody } from "@/lib/http";

const actions = {
  join: (code, body) => joinRoom(code, body.name),
  draw: (code, body) => draw(code, body.playerId),
  bingo: (code, body) => claimBingo(code, body.playerId),
  reset: (code, body) => resetRoom(code, body.playerId),
};

export async function POST(req, { params }) {
  const { code, action } = await params;
  return handle(async () => {
    if (!actions[action]) throw new HttpError(404, "ไม่พบคำสั่งนี้");
    return actions[action](code, await readBody(req));
  });
}
