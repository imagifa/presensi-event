"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Member = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at?: string;
};

type AttendanceItem = {
  id: string;
  event_id: string;
  method: string;
  check_in_at: string;
  events?: {
    id: string;
    title: string;
    event_date: string;
  };
};

export default function AdminMembersPage() {
  const [pin, setPin] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrMember, setQrMember] = useState<Member | null>(null);
  const [qrUrl, setQrUrl] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_pin") || "";
    setPin(saved);

    if (!saved) {
      setError("PIN belum ada. Login admin dulu dari halaman utama.");
      setLoading(false);
      return;
    }

    loadMembers(saved, "", "all", "newest");
  }, []);

  useEffect(() => {
    if (!pin) return;
    const t = setTimeout(() => {
      loadMembers(pin, q, status, sort);
    }, 400);
    return () => clearTimeout(t);
  }, [q, status, sort, pin]);

  async function loadMembers(pinValue: string, query: string, statusValue: string, sortValue: string) {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/members?pin=${encodeURIComponent(
        pinValue
      )}&q=${encodeURIComponent(query)}&status=${encodeURIComponent(
        statusValue
      )}&sort=${encodeURIComponent(sortValue)}`;

      const r = await fetch(url, { cache: "no-store" });
      const text = await r.text();
      if (!r.ok) throw new Error(text || `HTTP ${r.status}`);

      const d = JSON.parse(text);
      setMembers(d.members ?? []);
    } catch (e: any) {
      setError("Gagal load data member.");
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(() => members.length, [members]);

  async function openQr(member: Member) {
    setQrMember(member);
    setQrOpen(true);
    setQrUrl("");

    const dataUrl = await QRCode.toDataURL(member.id, {
      margin: 1,
      width: 240,
    });

    setQrUrl(dataUrl);
  }

  async function openDetail(member: Member) {
    setDetailMember(member);
    setDetailOpen(true);
    setAttendance([]);
    setAttendanceLoading(true);

    try {
      const r = await fetch(
        `/api/admin/members/${member.id}/attendance?pin=${encodeURIComponent(pin)}`,
        { cache: "no-store" }
      );
      const text = await r.text();
      if (!r.ok) throw new Error(text || `HTTP ${r.status}`);

      const d = JSON.parse(text);
      setAttendance(d.attendance ?? []);
    } catch (e) {
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }

  function openEdit(member: Member) {
    setEditMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editMember) return;

    setSaving(true);

    try {
      const r = await fetch(
        `/api/admin/members/${editMember.id}?pin=${encodeURIComponent(pin)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            phone: editPhone,
          }),
        }
      );

      const text = await r.text();
      const d = text ? JSON.parse(text) : null;

      if (!r.ok) {
        throw new Error(d?.error || "Gagal menyimpan perubahan");
      }

      setEditOpen(false);
      await loadMembers(pin, q, status, sort);

      if (detailMember?.id === editMember.id) {
        setDetailMember(d.member);
      }
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMember(member: Member) {
    try {
      const r = await fetch(
        `/api/admin/members/${member.id}?pin=${encodeURIComponent(pin)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_active: !member.is_active,
          }),
        }
      );

      const text = await r.text();
      const d = text ? JSON.parse(text) : null;

      if (!r.ok) {
        throw new Error(d?.error || "Gagal mengubah status");
      }

      await loadMembers(pin, q, status, sort);

      if (detailMember?.id === member.id) {
        setDetailMember(d.member);
      }
    } catch (e: any) {
      alert(e.message || "Gagal mengubah status");
    }
  }

  async function deleteMember(member: Member) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus member "${member.name}"?\n\nHistori attendance member ini juga akan ikut dihapus.`
    );

    if (!confirmed) return;

    try {
      const r = await fetch(
        `/api/admin/members/${member.id}?pin=${encodeURIComponent(pin)}`,
        {
          method: "DELETE",
        }
      );

      const text = await r.text();
      const d = text ? JSON.parse(text) : null;

      if (!r.ok) {
        throw new Error(d?.error || "Gagal menghapus member");
      }

      await loadMembers(pin, q, status, sort);

      if (detailMember?.id === member.id) {
        setDetailOpen(false);
        setDetailMember(null);
        setAttendance([]);
      }
    } catch (e: any) {
      alert(e.message || "Gagal menghapus member");
    }
  }

  function downloadQr() {
    if (!qrUrl || !qrMember) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `QR_${qrMember.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printQr() {
    if (!qrUrl || !qrMember) return;

    const w = window.open("", "_blank");
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>Kartu Member</title>
          <style>
            body { font-family: Arial; padding: 24px; }
            .card { border: 1px solid #ddd; border-radius: 16px; padding: 16px; width: 320px; }
            img { width: 240px; height: 240px; display: block; margin: 0 auto 12px; }
            .name { font-size: 18px; font-weight: 700; text-align: center; margin: 6px 0; }
            .sub { font-size: 13px; color: #555; text-align: center; margin: 2px 0; }
            .id { font-family: monospace; font-weight: 700; text-align: center; margin-top: 8px; }
            .hint { font-size: 12px; color: #777; text-align: center; margin-top: 12px; }
            @media print { body { padding: 0; } .card { border: none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${qrUrl}" />
            <div class="name">${escapeHtml(qrMember.name)}</div>
            <div class="sub">${escapeHtml(qrMember.phone)}</div>
            <div class="id">${escapeHtml(qrMember.id)}</div>
            <div class="hint">Tunjukkan QR ini saat check-in event.</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function logout() {
    localStorage.removeItem("admin_pin");
    window.location.href = "/";
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h1 className="text-2xl font-bold">Admin • Data Member</h1>
            <p className="text-red-600">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = "/admin")}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Kembali ke Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Data Member</h1>
            <p className="text-sm text-gray-500">Total hasil filter: {total}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => (window.location.href = "/admin")}
              className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
            >
              Dashboard
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-500">Cari member</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="nama / no HP / member ID"
              className="mt-2 w-full border rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full border rounded-xl px-3 py-2"
            >
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-500">Urutan</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-2 w-full border rounded-xl px-3 py-2"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="az">Nama A-Z</option>
              <option value="za">Nama Z-A</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3">Member ID</th>
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3">No HP</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{m.id}</td>
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3">{m.phone}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            m.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {m.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => openDetail(m)}
                            className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleMember(m)}
                            className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                          >
                            {m.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            onClick={() => openQr(m)}
                            className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => deleteMember(m)}
                            className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {qrOpen && qrMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">QR Member</h2>
              <button
                onClick={() => {
                  setQrOpen(false);
                  setQrMember(null);
                  setQrUrl("");
                }}
                className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>

            <div className="text-center">
              <p className="font-bold">{qrMember.name}</p>
              <p className="text-sm text-gray-500">{qrMember.phone}</p>
              <p className="text-sm font-mono mt-1">{qrMember.id}</p>
            </div>

            <div className="flex justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt="QR" className="border rounded-xl p-2 bg-white" />
              ) : (
                <div className="text-gray-500">Membuat QR...</div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadQr}
                disabled={!qrUrl}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                Download PNG
              </button>

              <button
                onClick={printQr}
                disabled={!qrUrl}
                className="flex-1 px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && detailMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Detail Member</h2>
              <button
                onClick={() => {
                  setDetailOpen(false);
                  setDetailMember(null);
                  setAttendance([]);
                }}
                className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Nama</p>
                <p className="font-semibold">{detailMember.name}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">No HP</p>
                <p className="font-semibold">{detailMember.phone}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Member ID</p>
                <p className="font-mono font-semibold">{detailMember.id}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Hadir</p>
                <p className="font-semibold">{attendance.length}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Riwayat Attendance</h3>

              {attendanceLoading ? (
                <p className="text-gray-500">Memuat histori...</p>
              ) : attendance.length === 0 ? (
                <p className="text-gray-500">Belum ada histori attendance</p>
              ) : (
                <div className="space-y-2">
                  {attendance.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold">
                          {a.events?.title ?? a.event_id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {a.events?.event_date
                            ? new Date(a.events.event_date).toLocaleString("id-ID")
                            : "-"}
                        </p>
                      </div>

                      <div className="text-sm">
                        <p>
                          Check-in:{" "}
                          <span className="font-semibold">
                            {new Date(a.check_in_at).toLocaleString("id-ID")}
                          </span>
                        </p>
                        <p>
                          Metode: <span className="font-semibold">{a.method}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openQr(detailMember)}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Lihat QR
              </button>

              <button
                onClick={() => openEdit(detailMember)}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Edit
              </button>

              <button
                onClick={() => toggleMember(detailMember)}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                {detailMember.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Member</h2>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditMember(null);
                }}
                className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-500">Nama</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">No HP</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-2 w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>

              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditMember(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
