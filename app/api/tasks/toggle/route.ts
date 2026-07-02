import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "Provide numeric `id`." }, { status: 400 });

  const [task] = await sql`
    update tasks set done = not done where id = ${id}
    returning id, title, done
  `;
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  return NextResponse.json({ task });
}
