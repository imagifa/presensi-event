import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin");

  if (!pin || pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();

  // ambil event aktif
  const { data: activeEvent, error: evErr } = await supabase
    .from("events")
    .select("id,title,event_date")
    .eq("is_active", true)
    .maybeSingle();

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 });
  }

  // total member
  const { count: totalMembers, error: memErr } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true });

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  // hadir hari ini: hitung attendance untuk event aktif (paling akurat)
  let hadirHariIni = 0;

  if (activeEvent?.id) {
    const { count, error: attErr } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("event_id", activeEvent.id);

    if (attErr) {
      return NextResponse.json({ error: attErr.message }, { status: 500 });
    }

    hadirHariIni = count ?? 0;
  }

  return NextResponse.json({
    totalMembers: totalMembers ?? 0,
    hadirHariIni,
    activeEvent: activeEvent ?? null,
  });
}