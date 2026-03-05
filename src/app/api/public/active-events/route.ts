import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("events")
    .select("id,title,event_date,is_active")
    .eq("is_active", true)
    .order("event_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}