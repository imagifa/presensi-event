import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseService } from "@/lib/supabase/service";

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    const phoneRaw = (body?.phone ?? "").toString().trim();
    const phone = normalizePhone(phoneRaw);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Nama wajib diisi" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "No HP wajib diisi" }, { status: 400 });
    }

    const supabase = supabaseService();

    // Cek duplikat phone
    const dup = await supabase
      .from("members")
      .select("id, name, phone")
      .eq("phone", phone)
      .maybeSingle();

    if (dup.data) {
      return NextResponse.json(
        { ok: false, error: "No HP sudah terdaftar", member: dup.data },
        { status: 200 }
      );
    }

    // Generate Member ID
    // Format: MBR + 6 karakter (random) → contoh: MBR-A1B2C3
    const memberId = `MBR-${nanoid(6).toUpperCase()}`;

    const insert = await supabase
      .from("members")
      .insert({
        id: memberId,
        name,
        phone,
        is_active: true,
      })
      .select("id, name, phone, is_active")
      .single();

    if (insert.error) {
      return NextResponse.json(
        { ok: false, error: insert.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, member: insert.data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}