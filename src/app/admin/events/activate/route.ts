import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin");

  if (pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body?.event_id) {
    return NextResponse.json({ error: "event_id wajib diisi" }, { status: 400 });
  }

  const eventId = body.event_id as string;
  const supabase = supabaseService();

  const resetAll = await supabase
    .from("events")
    .update({ is_active: false })
    .neq("id", "");

  if (resetAll.error) {
    return NextResponse.json({ error: resetAll.error.message }, { status: 500 });
  }

  const activate = await supabase
    .from("events")
    .update({ is_active: true })
    .eq("id", eventId)
    .select("id, title, event_date, is_active")
    .single();

  if (activate.error) {
    return NextResponse.json({ error: activate.error.message }, { status: 500 });
  }

  return NextResponse.json({ event: activate.data });
}
