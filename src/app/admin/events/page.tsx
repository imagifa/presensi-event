"use client";

import { useEffect, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  event_date: string;
  is_active: boolean;
};

export default function AdminEventsPage() {
  const [pin, setPin] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedPin = localStorage.getItem("admin_pin") || "";
    if (!savedPin) {
      window.location.href = "/";
      return;
    }

    setPin(savedPin);
    loadEvents(savedPin);
  }, []);

  async function loadEvents(adminPin: string) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/admin/events?pin=${adminPin}`, {
        cache: "no-store",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengambil data event");
      }

      setEvents(data.events || []);
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setMessage("Nama event wajib diisi");
      return;
    }

    if (!dateTime) {
      setMessage("Tanggal dan jam wajib diisi");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const isoDate = new Date(dateTime).toISOString();

      const res = await fetch(`/api/admin/events?pin=${pin}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          event_date: isoDate,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Gagal membuat event");
      }

      setTitle("");
      setDateTime("");
      setMessage("Event berhasil dibuat");
      loadEvents(pin);
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

async function activateEvent(eventId: string) {
  setMessage("");

  try {
    const res = await fetch(`/api/admin/events/activate?pin=${pin}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: eventId,
      }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(data?.error || "Gagal mengaktifkan event");
    }

    setMessage(`Event "${data.event.title}" berhasil diaktifkan`);
    setTimeout(() => loadEvents(pin), 200);
  } catch (err: any) {
    setMessage(err.message || "Terjadi kesalahan");
  }
}

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">Kelola Event</h1>
            <p className="text-sm text-gray-500">
              Buat event baru dan aktifkan event presensi
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/admin")}
            className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
          >
            Kembali ke Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Buat Event Baru</h2>

          <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">Nama Event</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Kajian Pekanan"
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">Tanggal & Jam</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Buat Event"}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-4 text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Daftar Event</h2>

          {loading ? (
            <p className="text-gray-500">Memuat event...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500">Belum ada event</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Nama Event</th>
                    <th className="text-left py-3 px-2">Tanggal & Jam</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{event.title}</td>
                      <td className="py-3 px-2">
                        {new Date(event.event_date).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2">
                        {event.is_active ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => activateEvent(event.id)}
                          className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
                          disabled={event.is_active}
                        >
                          {event.is_active ? "Sedang Aktif" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
