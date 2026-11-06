import { NextResponse } from "next/server";
import { HttpError } from "./rooms";

export async function handle(fn) {
  try {
    return NextResponse.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export const readBody = (req) => req.json().catch(() => ({}));
