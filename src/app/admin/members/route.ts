import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function requireAdmin(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin") || "";
  return pin === process.env.ADMIN_PIN;
}

export async function GET(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "all").trim();
  const sort = (url.searchParams.get("sort") || "newest").trim();

  const supabase = supabaseService();

  let query = supabase
    .from("members")
    .select("id,name,phone,is_active,created_at");

  if (q) {
    const like = `%${q}%`;
    query = query.or(`id.ilike.${like},name.ilike.${like},phone.ilike.${like}`);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  }

  if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (sort === "az") {
    query = query.order("name", { ascending: true });
  } else if (sort === "za") {
    query = query.order("name", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}
