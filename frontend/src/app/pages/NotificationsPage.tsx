import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, Clock3, LoaderCircle, Mail, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import api, { getErrorMessage } from "../../lib/axios";

interface Trip {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
}

interface Reminder {
  id: number;
  email: string;
  daysBefore: number;
  sentAt: string | null;
  sendAt: string;
  trip: Trip;
}

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripId, setTripId] = useState("");
  const [daysBefore, setDaysBefore] = useState(1);
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const now = new Date();
  const activeTrips = trips.filter((trip) => new Date(trip.endDate) > now);
  const upcomingTrips = activeTrips.filter((trip) => new Date(trip.startDate) > now);

  const fetchReminders = useCallback(async () => {
    const { data } = await api.get<Reminder[]>("/notifications/my");
    setReminders(data);
  }, []);

  useEffect(() => {
    Promise.all([api.get<Trip[]>("/trips").then((res) => setTrips(res.data)), fetchReminders()])
      .catch((error) => toast.error(getErrorMessage(error, "Erro ao carregar lembretes.")))
      .finally(() => setLoading(false));
  }, [fetchReminders]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<{ message: string }>("/notifications/schedule", {
        tripId: Number(tripId),
        daysBefore,
        email: email.trim(),
      });
      toast.success(data.message);
      await fetchReminders();
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao agendar lembrete."));
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!tripId || !email.trim()) {
      toast.error("Selecione uma viagem e informe um email.");
      return;
    }
    setTesting(true);
    try {
      const { data } = await api.post<{ message: string }>("/notifications/test", {
        tripId: Number(tripId),
        email: email.trim(),
      });
      toast.success(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível enviar o email de teste."));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este lembrete?")) return;
    try {
      await api.delete(`/notifications/${id}`);
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
      toast.success("Lembrete removido.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o lembrete."));
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pb-16 pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Lembretes de viagem</h1>
              <p className="mt-1 text-sm text-gray-500">Receba um email antes de cada viagem começar.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 font-semibold text-gray-900">Novo lembrete</h2>
              {!loading && upcomingTrips.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                  {activeTrips.length > 0 ? (
                    <>
                      Lembretes só podem ser agendados para viagens que ainda não começaram, e{" "}
                      {activeTrips.length === 1
                        ? `“${activeTrips[0].title}” já está em andamento.`
                        : "todas as suas viagens já estão em andamento."}{" "}
                    </>
                  ) : (
                    "Você não tem viagens futuras. "
                  )}
                  <Link to="/trips" className="text-blue-600 hover:underline">Criar uma viagem →</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Viagem</span>
                    <select
                      value={tripId}
                      onChange={(event) => setTripId(event.target.value)}
                      className={inputClassName}
                      required
                    >
                      <option value="">Selecione uma viagem...</option>
                      {activeTrips.map((trip) => {
                        const started = new Date(trip.startDate) <= now;
                        return (
                          <option key={trip.id} value={trip.id} disabled={started}>
                            {trip.title} ({formatDate(trip.startDate)}){started ? " — já em andamento" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Quantos dias antes?</span>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={daysBefore}
                        onChange={(event) => setDaysBefore(Number(event.target.value))}
                        className="h-2 flex-1 cursor-pointer accent-blue-600"
                      />
                      <span className="min-w-12 text-lg font-bold text-blue-600">{daysBefore}d</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                      className={inputClassName}
                      required
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving || testing}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                      Agendar lembrete
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={saving || testing}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar teste agora
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 font-semibold text-gray-900">Meus lembretes</h2>
              {loading ? (
                <div className="h-32 animate-pulse rounded-xl bg-gray-50" />
              ) : reminders.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                  Nenhum lembrete agendado ainda.
                </div>
              ) : (
                <ul className="space-y-3">
                  {reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          reminder.sentAt ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {reminder.sentAt ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/trips/${reminder.trip.id}`}
                          className="block truncate font-medium text-gray-900 hover:text-blue-600"
                        >
                          {reminder.trip.title}
                        </Link>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {reminder.email}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reminder.sentAt
                            ? `Enviado em ${formatDate(reminder.sentAt)}`
                            : `${reminder.daysBefore} dia(s) antes · envio em ${formatDate(reminder.sendAt)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(reminder.id)}
                        aria-label="Remover lembrete"
                        className="p-1 text-gray-400 transition hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
