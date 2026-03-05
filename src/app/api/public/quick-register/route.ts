import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { generateMemberId } from "@/lib/utils/id";

export async function POST(req: Request) {
  const supabase = supabaseService();
  const { name, phone } = await req.json();

  if (!name || !phone) {
    return NextResponse.json({ success: false, error: "Nama dan No HP wajib diisi" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: false, error: "No HP sudah terdaftar" }, { status: 400 });
  }

  const id = generateMemberId();

  const { data, error } = await supabase
    .from("members")
    .insert({ id, name, phone, is_active: true })
    .select("id,name,phone")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, member: data });
}