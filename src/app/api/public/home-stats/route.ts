import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  const supabase = supabaseService();

  const { count: totalMembers, error: membersErr } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true });

  if (membersErr) {
    return NextResponse.json({ error: membersErr.message }, { status: 500 });
  }

  const { data: activeEvent, error: eventErr } = await supabase
    .from("events")
    .select("id,title,event_date,is_active")
    .eq("is_active", true)
    .order("event_date", { ascending: false })
    .maybeSingle();

  if (eventErr) {
    return NextResponse.json({ error: eventErr.message }, { status: 500 });
  }

  let hadirHariIni = 0;

  if (activeEvent?.id) {
    const { count, error: hadirErr } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("event_id", activeEvent.id);

    if (hadirErr) {
      return NextResponse.json({ error: hadirErr.message }, { status: 500 });
    }

    hadirHariIni = count ?? 0;
  }

  return NextResponse.json({
    totalMembers: totalMembers ?? 0,
    hadirHariIni,
    activeEvent: activeEvent ?? null,
  });
}
