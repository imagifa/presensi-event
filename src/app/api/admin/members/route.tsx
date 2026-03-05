import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function requirePin(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin") || "";
  const ADMIN_PIN = process.env.ADMIN_PIN || "123456";
  return pin === ADMIN_PIN;
}

export async function GET(req: Request) {
  if (!requirePin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 500);

  const supabase = supabaseService();

  // Supabase ILIKE (case-insensitive)
  // NOTE: Supabase "or" butuh format: col.ilike.%q%,col2.ilike.%q%
  let query = supabase
    .from("members")
    .select("id,name,phone,is_active,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const like = `%${q}%`;
    query = query.or(`id.ilike.${like},name.ilike.${like},phone.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] }, { status: 200 });
}