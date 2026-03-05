import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseService } from "@/lib/supabase/service";

function formatID(dateISO: string) {
  try {
    return new Date(dateISO).toLocaleString("id-ID");
  } catch {
    return dateISO;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin");
  const eventId = url.searchParams.get("event_id");

  if (!pin || pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();

  let q = supabase
    .from("attendance")
    .select(
      `
      id,
      check_in_at,
      method,
      member_id,
      event_id,
      members ( name, phone ),
      events ( title, event_date )
    `
    )
    .order("check_in_at", { ascending: false });

  if (eventId) q = q.eq("event_id", eventId);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((r: any, idx: number) => ({
    No: idx + 1,
    Event: r.events?.title ?? r.event_id,
    Tanggal_Event: r.events?.event_date ?? "",
    Nama: r.members?.name ?? "",
    No_HP: r.members?.phone ?? "",
    Member_ID: r.member_id ?? "",
    Waktu_Checkin: r.check_in_at ? formatID(r.check_in_at) : "",
    Metode: r.method ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = eventId ? `kehadiran_${eventId}.xlsx` : `kehadiran_kajian.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}