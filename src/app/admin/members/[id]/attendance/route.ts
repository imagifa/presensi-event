import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function requireAdmin(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin") || "";
  return pin === process.env.ADMIN_PIN;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id,
      event_id,
      method,
      check_in_at,
      events (
        id,
        title,
        event_date
      )
    `)
    .eq("member_id", id)
    .order("check_in_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attendance: data ?? [] });
}
