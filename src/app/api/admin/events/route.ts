import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function isAuthorized(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin");
  return pin === process.env.ADMIN_PIN;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, is_active")
    .order("event_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin");

  if (pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const eventDate = body.event_date;

  if (!title) {
    return NextResponse.json({ error: "Nama event wajib diisi" }, { status: 400 });
  }

  if (!eventDate) {
    return NextResponse.json({ error: "Tanggal dan jam event wajib diisi" }, { status: 400 });
  }

  const supabase = supabaseService();

  const id = `EVT-${Date.now()}`;

  const { data, error } = await supabase
    .from("events")
    .insert({
      id,
      title,
      event_date: eventDate,
      is_active: false,
    })
    .select("id, title, event_date, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
