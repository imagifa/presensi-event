"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import QrScannerModal from "../components/qr/QrScannerModal";

type ActiveEvent = { id: string; title: string; event_date: string };

type Stats = {
  totalMembers: number;
  hadirHariIni: number;
  activeEvent: { id: string; title: string; event_date: string } | null;
};

type CheckinResult =
  | null
  | {
      ok: boolean;
      error?: string;
      name?: string;
      phone?: string;
      time?: string;
    };

type RegisterResult =
  | null
  | {
      ok: boolean;
      error?: string;
      member?: { id: string; name: string; phone: string };
      qrDataUrl?: string;
    };

export default function HomePage() {
  // ====== TOP STATS ======
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    hadirHariIni: 0,
    activeEvent: null,
  });

  // ====== ADMIN MODAL (PIN) ======
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");

  // ====== CHECK-IN ======
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [manualId, setManualId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [result, setResult] = useState<CheckinResult>(null);

  // ====== REGISTER ======
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<RegisterResult>(null);

  // ====== STATS: load + polling ======
  useEffect(() => {
    async function loadStats() {
      try {
        const r = await fetch("/api/admin/stats?pin=123456", { cache: "no-store" });
        const text = await r.text();
        if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
        const d = JSON.parse(text);

        setStats({
          totalMembers: d.totalMembers ?? 0,
          hadirHariIni: d.hadirHariIni ?? 0,
          activeEvent: d.activeEvent ?? null,
        });
      } catch (e) {
        console.error("Stats error:", e);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // ====== LOAD ACTIVE EVENTS ======
  useEffect(() => {
    fetch("/api/public/active-events", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const ev: ActiveEvent[] = d.events ?? [];
        setEvents(ev);
        if (ev.length) setEventId(ev[0].id);
      })
      .catch((e) => console.error("active-events error:", e));
  }, []);

  async function handleAdminLogin() {
    const res = await fetch(`/api/admin/stats?pin=${adminPin}`, { cache: "no-store" });
    if (!res.ok) {
      alert("PIN salah atau server error.");
      return;
    }
    localStorage.setItem("admin_pin", adminPin);
    window.location.href = "/admin";
  }

  async function doCheckin(memberId: string, method: "scan" | "manual") {
    setResult(null);

    const cleanId = memberId.trim();
    if (!cleanId) {
      setResult({ ok: false, error: "Member ID kosong. Isi dulu." });
      return;
    }
    if (!eventId) {
      setResult({ ok: false, error: "Event aktif belum tersedia." });
      return;
    }

    const res = await fetch("/api/public/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, member_id: cleanId, method }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      setResult({ ok: false, error: data?.error || `HTTP ${res.status}` });
      return;
    }

    if (data?.ok) {
      setManualId("");
      setResult({
        ok: true,
        name: data.member?.name,
        phone: data.member?.phone,
        time: data.check_in_at,
      });

      // refresh stats cepat setelah check-in
      fetch("/api/admin/stats?pin=123456", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setStats({
            totalMembers: d.totalMembers ?? 0,
            hadirHariIni: d.hadirHariIni ?? 0,
            activeEvent: d.activeEvent ?? null,
          });
        })
        .catch(() => {});
    } else {
      setResult({
        ok: false,
        error: data?.error || "Gagal",
        name: data?.member?.name,
        phone: data?.member?.phone,
        time: data?.check_in_at,
      });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegResult(null);

    const name = regName.trim();
    const phone = regPhone.trim();

    if (!name) {
      setRegResult({ ok: false, error: "Nama wajib diisi" });
      return;
    }
    if (!phone) {
      setRegResult({ ok: false, error: "No HP wajib diisi" });
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setRegResult({ ok: false, error: data?.error || `HTTP ${res.status}` });
        return;
      }

      if (!data?.ok) {
        // duplikat no hp → server balikin member juga
        setRegResult({
          ok: false,
          error: data?.error || "Gagal daftar",
          member: data?.member,
        });
        return;
      }

      const member = data.member as { id: string; name: string; phone: string };

      // Generate QR data URL (offline, no external API)
      const qrDataUrl = await QRCode.toDataURL(member.id, {
        margin: 1,
        width: 220,
      });

      setRegResult({ ok: true, member, qrDataUrl });
      setRegName("");
      setRegPhone("");

      // refresh stats setelah daftar
      fetch("/api/admin/stats?pin=123456", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setStats({
            totalMembers: d.totalMembers ?? 0,
            hadirHariIni: d.hadirHariIni ?? 0,
            activeEvent: d.activeEvent ?? null,
          });
        })
        .catch(() => {});
    } catch (err: any) {
      setRegResult({ ok: false, error: err?.message || "Server error" });
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">Presensi Event</h1>
            <p className="text-sm text-gray-500">
  Event aktif:{" "}
  {stats.activeEvent
    ? `${stats.activeEvent.title} • ${new Date(
        stats.activeEvent.event_date
      ).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "-"}
</p>
          </div>

          <button
            onClick={() => setShowAdmin(true)}
            className="px-4 py-2 rounded-xl border bg-white font-semibold hover:bg-gray-50"
          >
            Admin
          </button>
        </div>

        {/* Cards */}
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
  <p className="text-sm text-gray-500">Jadwal Event Aktif</p>
  <p className="text-lg font-bold">
    {stats.activeEvent
      ? new Date(stats.activeEvent.event_date).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-"}
  </p>
</div>
        </div>

        {/* Check-in */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Check-in</h2>

            <button
              onClick={() => setScanOpen(true)}
              disabled={!eventId}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
            >
              Scan QR (Kamera)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Event aktif</p>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.event_date})
                  </option>
                ))}
                {!events.length && <option value="">Tidak ada event aktif</option>}
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Input manual Member ID</p>
              <div className="flex gap-2">
                <input
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Contoh: MBR-ABC123"
                  className="flex-1 border rounded-xl px-3 py-2"
                />
                <button
                  onClick={() => doCheckin(manualId, "manual")}
                  className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  Check-in
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Tips: kalau kamera ditolak browser, pakai input manual.
              </p>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-2xl p-4 ${
                result.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-bold">
                {result.ok ? "Check-in berhasil ✅" : "Gagal / Sudah tercatat ⚠️"}
              </p>

              {result.error && <p className="text-sm mt-1">{result.error}</p>}

              {(result.name || result.phone || result.time) && (
                <div className="text-sm mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">Nama</p>
                    <p className="font-semibold">{result.name ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">No HP</p>
                    <p className="font-semibold">{result.phone ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">Waktu</p>
                    <p className="font-semibold">
                      {result.time ? new Date(result.time).toLocaleString("id-ID") : "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Register */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold">Daftar Peserta Baru</h2>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Nama</p>
              <input
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">No HP</p>
              <input
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="08xxxxxxx"
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={regLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {regLoading ? "Memproses..." : "Daftarkan & Buat QR"}
              </button>

              {regResult?.ok && regResult.member?.id && (
                <button
                  type="button"
                  onClick={() => doCheckin(regResult.member!.id, "manual")}
                  className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  Check-in Sekarang
                </button>
              )}
            </div>
          </form>

          {regResult && (
            <div className={`rounded-2xl p-4 ${regResult.ok ? "bg-blue-50" : "bg-amber-50"}`}>
              <p className="font-bold">
                {regResult.ok ? "Berhasil daftar ✅" : "Gagal / Duplikat ⚠️"}
              </p>
              {regResult.error && <p className="text-sm mt-1">{regResult.error}</p>}

              {regResult.member && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">Nama</p>
                    <p className="font-semibold">{regResult.member.name}</p>
                  </div>
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">No HP</p>
                    <p className="font-semibold">{regResult.member.phone}</p>
                  </div>
                  <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-gray-500">Member ID</p>
                    <p className="font-mono font-semibold">{regResult.member.id}</p>
                  </div>
                </div>
              )}

            {regResult.ok && regResult.qrDataUrl && regResult.member && (
  <div className="mt-4 flex flex-col items-center gap-3">
    <img
      src={regResult.qrDataUrl}
      alt="QR Member"
      className="rounded-xl border bg-white p-2"
    />

    <div className="text-center text-sm">
      <p className="font-semibold">{regResult.member.name}</p>
      <p className="text-gray-500">{regResult.member.phone}</p>
      <p className="font-mono">{regResult.member.id}</p>
    </div>

    <div className="flex gap-2 w-full max-w-xs">
      <button
        type="button"
        onClick={() => {
          // Download PNG dari dataURL
          const a = document.createElement("a");
          a.href = regResult.qrDataUrl!;
          a.download = `QR_${regResult.member!.id}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
        className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
      >
        Download QR (PNG)
      </button>

      <button
        type="button"
        onClick={() => {
  const member = regResult?.member;
  const qrDataUrl = regResult?.qrDataUrl;

  if (!member || !qrDataUrl) return;

  const w = window.open("", "_blank");
  if (!w) return;

  const html = `
    <html>
      <head>
        <title>Kartu Member</title>
        <style>
          body { font-family: Arial; padding: 24px; }
          .card { border: 1px solid #ddd; border-radius: 16px; padding: 16px; width: 320px; }
          img { width: 220px; height: 220px; display: block; margin: 0 auto 12px; }
          .name { font-size: 18px; font-weight: 700; text-align: center; margin: 6px 0; }
          .sub { font-size: 13px; color: #555; text-align: center; margin: 2px 0; }
          .id { font-family: monospace; font-weight: 700; text-align: center; margin-top: 8px; }
          .hint { font-size: 12px; color: #777; text-align: center; margin-top: 12px; }
          @media print { body { padding: 0; } .card { border: none; } }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${qrDataUrl}" />
          <div class="name">${member.name}</div>
          <div class="sub">${member.phone}</div>
          <div class="id">${member.id}</div>
          <div class="hint">Tunjukkan QR ini saat check-in kajian.</div>
        </div>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}}
        className="flex-1 px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
      >
        Print
      </button>
    </div>

    <p className="text-xs text-gray-500 text-center">
      Download untuk disimpan / kirim via WhatsApp. Print untuk kartu fisik.
    </p>
  </div>
)}
            </div>
          )}
        </div>
      </div>

      {/* Modal Admin (PIN) */}
      {showAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">Login Admin</h2>
              <p className="text-sm text-gray-500">Masukkan PIN admin untuk masuk dashboard</p>
            </div>

            <input
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="PIN Admin (contoh: 123456)"
              className="w-full border rounded-xl p-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAdmin(false);
                  setAdminPin("");
                }}
                className="flex-1 px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={handleAdminLogin}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                Masuk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner */}
      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(text) => {
          setScanOpen(false);
          doCheckin(text, "scan");
        }}
      />
    </main>
  );
}
