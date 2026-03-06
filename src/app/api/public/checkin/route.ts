import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const eventId = (body.event_id ?? "").toString().trim();
  const memberId = (body.member_id ?? "").toString().trim();
  const method = (body.method ?? "manual").toString().trim();

  if (!memberId) {
    return NextResponse.json({ ok: false, error: "Member ID wajib diisi" }, { status: 400 });
  }

  const supabase = supabaseService();

  // 1) Ambil event aktif tunggal
  const { data: activeEvent, error: activeEventErr } = await supabase
    .from("events")
    .select("id, title, event_date, is_active")
    .eq("is_active", true)
    .order("event_date", { ascending: false })
    .maybeSingle();

  if (activeEventErr) {
    return NextResponse.json({ ok: false, error: activeEventErr.message }, { status: 500 });
  }

  if (!activeEvent) {
    return NextResponse.json(
      { ok: false, error: "Tidak ada event aktif. Hubungi admin untuk mengaktifkan event." },
      { status: 400 }
    );
  }

  // 2) Kalau frontend kirim event_id yang beda dari event aktif → tolak
  if (eventId && eventId !== activeEvent.id) {
    return NextResponse.json(
      {
        ok: false,
        error: `Presensi dikunci ke event aktif: ${activeEvent.title}. Silakan refresh halaman.`,
      },
      { status: 400 }
    );
  }

  // 3) Cek member
  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("id,name,phone,is_active")
    .eq("id", memberId)
    .maybeSingle();

  if (memberErr) {
    return NextResponse.json({ ok: false, error: memberErr.message }, { status: 500 });
  }

  if (!member) {
    return NextResponse.json({ ok: false, error: "Member tidak ditemukan" }, { status: 404 });
  }

  if (member.is_active === false) {
    return NextResponse.json({ ok: false, error: "Member nonaktif" }, { status: 400 });
  }

  // 4) Anti double check-in untuk event aktif
  const { data: existing, error: existingErr } = await supabase
    .from("attendance")
    .select("id,check_in_at")
    .eq("event_id", activeEvent.id)
    .eq("member_id", memberId)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: false,
      error: "Sudah tercatat untuk event aktif ini",
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
      },
      check_in_at: existing.check_in_at,
      event: activeEvent,
    });
  }

  // 5) Simpan attendance ke event aktif, bukan event yang dikirim client
  const now = new Date().toISOString();

  const { error: insertErr } = await supabase.from("attendance").insert({
    event_id: activeEvent.id,
    member_id: memberId,
    method,
    check_in_at: now,
  });

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
    },
    check_in_at: now,
    event: activeEvent,
  });
}
