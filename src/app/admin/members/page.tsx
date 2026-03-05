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

export default function AdminMembersPage() {
  const [pin, setPin] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  // QR modal state
  const [qrOpen, setQrOpen] = useState(false);
  const [qrMember, setQrMember] = useState<Member | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_pin") || "";
    setPin(saved);

    if (!saved) {
      setError("PIN belum ada. Login admin dulu dari halaman utama.");
      setLoading(false);
      return;
    }

    loadMembers(saved, "");
  }, []);

  async function loadMembers(pinValue: string, query: string) {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/members?pin=${encodeURIComponent(pinValue)}&q=${encodeURIComponent(
        query
      )}&limit=200`;

      const r = await fetch(url, { cache: "no-store" });

      const text = await r.text();
      if (!r.ok) throw new Error(text || `HTTP ${r.status}`);

      const d = JSON.parse(text);
      setMembers(d.members ?? []);
    } catch (e: any) {
      setError("Gagal load data member. Pastikan PIN benar dan server normal.");
    } finally {
      setLoading(false);
    }
  }

  // debounce sederhana untuk search
  useEffect(() => {
    if (!pin) return;
    const t = setTimeout(() => {
      loadMembers(pin, q);
    }, 400);
    return () => clearTimeout(t);
  }, [q, pin]);

  const total = useMemo(() => members.length, [members]);

  async function openQr(m: Member) {
    setQrMember(m);
    setQrOpen(true);
    setQrUrl("");

    // generate QR dataURL
    const dataUrl = await QRCode.toDataURL(m.id, { margin: 1, width: 240 });
    setQrUrl(dataUrl);
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
            <div class="hint">Tunjukkan QR ini saat check-in kajian.</div>
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
        <div className="max-w-5xl mx-auto p-6">
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
                Hapus PIN & Logout
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
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Data Member</h1>
            <p className="text-sm text-gray-500">Total: {total}</p>
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

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm text-gray-500">Cari (nama / no HP / member ID)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="contoh: Ahmad / 0812 / MBR-ABC123"
            className="mt-2 w-full border rounded-xl px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-2">
            Search otomatis jalan setelah kamu berhenti mengetik ±0.4 detik.
          </p>
        </div>

        {/* Table */}
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
                            m.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {m.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openQr(m)}
                          className="px-3 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                        >
                          Lihat QR
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Modal */}
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

            <p className="text-xs text-gray-500">
              Tip: Download untuk kirim WA, Print untuk kartu fisik.
            </p>
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