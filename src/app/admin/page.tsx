"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalMembers: number;
  hadirHariIni: number;
  activeEvent: { id: string; title: string; event_date: string } | null;
};

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin_pin") || "";
    setPin(saved);

    if (!saved) {
      setErr("PIN belum ada. Balik ke halaman utama dan login admin dulu.");
      return;
    }

    fetch(`/api/admin/stats?pin=${saved}`, { cache: "no-store" })
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
        return JSON.parse(text);
      })
      .then((d) => {
        setStats({
          totalMembers: d.totalMembers ?? 0,
          hadirHariIni: d.hadirHariIni ?? 0,
          activeEvent: d.activeEvent ?? null,
        });
        setErr(null);
      })
      .catch(() => {
        setErr("PIN salah / tidak valid. Login ulang dari halaman utama.");
      });
  }, []);

  function logout() {
    localStorage.removeItem("admin_pin");
    window.location.href = "/";
  }

  if (err) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-red-600">{err}</p>
            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Kembali ke Home
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

  if (!stats) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            Loading admin...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-gray-500">
              Event aktif: {stats.activeEvent?.title ?? "-"}
            </p>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Member</p>
            <p className="text-3xl font-bold">{stats.totalMembers}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Hadir (Event Aktif)</p>
            <p className="text-3xl font-bold">{stats.hadirHariIni}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">PIN tersimpan</p>
            <p className="text-xl font-mono">{pin ? "******" : "-"}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-2">Menu Admin</h2>
          <div className="flex flex-col md:flex-row gap-2">
  <a
    className="px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50 text-center"
    href={`/api/admin/export-attendance?pin=${pin}`}
  >
    Export Kehadiran (Excel/CSV)
  </a>

  <a
    className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-center hover:bg-emerald-700"
    href="/admin/members"
  >
    Data Member
  </a>
<a
  className="px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50 text-center"
  href="/admin/events"
>
  Kelola Event
</a>            
</div>
          <p className="text-xs text-gray-500 mt-3">
            Nanti kita rapikan jadi tombol “Download Excel” yang lebih proper.
          </p>
        </div>
      </div>
    </main>
  );
}
