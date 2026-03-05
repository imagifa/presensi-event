import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const { event_id, member_id, method } = body as {
    event_id?: string;
    member_id?: string;
    method?: "scan" | "manual";
  };

  if (!event_id || !member_id) {
    return NextResponse.json(
      { error: "event_id dan member_id wajib" },
      { status: 400 }
    );
  }

  const supabase = supabaseService();

  // cek member aktif
  const { data: member, error: mErr } = await supabase
    .from("members")
    .select("id,name,phone,is_active")
    .eq("id", member_id)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });
  if (member.is_active === false)
    return NextResponse.json({ error: "Member nonaktif" }, { status: 400 });

  // cek event aktif
  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,title,is_active")
    .eq("id", event_id)
    .maybeSingle();

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
  if (!event) return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
  if (event.is_active === false)
    return NextResponse.json({ error: "Event tidak aktif" }, { status: 400 });

  // anti double check-in
  const { data: existing, error: xErr } = await supabase
    .from("attendance")
    .select("id,check_in_at")
    .eq("event_id", event_id)
    .eq("member_id", member_id)
    .maybeSingle();

  if (xErr) return NextResponse.json({ error: xErr.message }, { status: 500 });
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sudah tercatat",
        member: { id: member.id, name: member.name, phone: member.phone },
        check_in_at: existing.check_in_at,
      },
      { status: 200 }
    );
  }

  const now = new Date().toISOString();

  const { error: iErr } = await supabase.from("attendance").insert({
    event_id,
    member_id,
    method: method ?? "scan",
    check_in_at: now,
  });

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    member: { id: member.id, name: member.name, phone: member.phone },
    check_in_at: now,
  });
}