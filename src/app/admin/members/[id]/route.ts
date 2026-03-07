import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function requireAdmin(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin") || "";
  return pin === process.env.ADMIN_PIN;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const name = body.name?.toString().trim();
  const phone = body.phone?.toString().trim();
  const is_active = body.is_active;

  const supabase = supabaseService();

  const updates: Record<string, unknown> = {};

  if (typeof name === "string") {
    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }
    updates.name = name;
  }

  if (typeof phone === "string") {
    if (!phone) {
      return NextResponse.json({ error: "No HP wajib diisi" }, { status: 400 });
    }

    const dup = await supabase
      .from("members")
      .select("id")
      .eq("phone", phone)
      .neq("id", id)
      .maybeSingle();

    if (dup.error) {
      return NextResponse.json({ error: dup.error.message }, { status: 500 });
    }

    if (dup.data) {
      return NextResponse.json({ error: "No HP sudah digunakan member lain" }, { status: 400 });
    }

    updates.phone = phone;
  }

  if (typeof is_active === "boolean") {
    updates.is_active = is_active;
  }

  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id)
    .select("id,name,phone,is_active,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseService();

  const attendanceDelete = await supabase
    .from("attendance")
    .delete()
    .eq("member_id", id);

  if (attendanceDelete.error) {
    return NextResponse.json(
      { error: `Gagal hapus attendance: ${attendanceDelete.error.message}` },
      { status: 500 }
    );
  }

  const memberDelete = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (memberDelete.error) {
    return NextResponse.json(
      { error: `Gagal hapus member: ${memberDelete.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
