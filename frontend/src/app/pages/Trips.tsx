import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardCheck,
  MapPin,
  Plane,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../../lib/axios";

interface Checklist {
  items: { id: number }[];
}

interface Trip {
  id: number;
  title: string;
  destination?: string | null;
  tripType: string;
  startDate: string;
  endDate: string;
  collaborators: { id: number }[];
  activities: { id: number }[];
  checklist?: Checklist | null;
}

const tripTypes: Record<string, string> = {
  BEACH: "Praia",
  CITY_TOUR: "City tour",
  FLIGHT: "Avião",
  MOUNTAIN: "Montanha",
  BUSINESS: "Negócios",
  BACKPACKING: "Mochilão",
  TREKKING: "Trekking",
  CUSTOM: "Personalizada",
};

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    tripType: "BEACH",
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    void fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data } = await api.get<Trip[]>("/trips");
      setTrips(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível carregar as viagens."));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("A data de término deve ser posterior à data de início.");
      return;
    }

    setCreating(true);
    try {
      await api.post("/trips", formData);
      toast.success("Viagem criada com sucesso!");
      setFormData({ title: "", destination: "", tripType: "BEACH", startDate: "", endDate: "" });
      setShowForm(false);
      await fetchTrips();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível criar a viagem."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pb-16 pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                to="/dashboard"
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao painel
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Minhas viagens
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Planeje os detalhes e organize tudo em um só lugar.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((visible) => !visible)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Fechar formulário" : "Nova viagem"}
            </button>
          </div>

          {showForm && (
            <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Criar viagem</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Informe o nome, o destino, o tipo e as datas da viagem.
                </p>
              </div>
              <form onSubmit={handleCreateTrip} className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Nome da viagem
                  </span>
                  <input
                    type="text"
                    placeholder="Ex.: Férias em Florianópolis"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({ ...formData, title: event.target.value })
                    }
                    className={inputClassName}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Destino
                  </span>
                  <input
                    type="text"
                    placeholder="Ex.: Florianópolis"
                    value={formData.destination}
                    onChange={(event) =>
                      setFormData({ ...formData, destination: event.target.value })
                    }
                    className={inputClassName}
                    maxLength={100}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo de viagem
                  </span>
                  <select
                    value={formData.tripType}
                    onChange={(event) =>
                      setFormData({ ...formData, tripType: event.target.value })
                    }
                    className={inputClassName}
                  >
                    {Object.entries(tripTypes).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Início
                  </span>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(event) =>
                      setFormData({ ...formData, startDate: event.target.value })
                    }
                    className={inputClassName}
                    required
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Término
                  </span>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(event) =>
                      setFormData({ ...formData, endDate: event.target.value })
                    }
                    className={inputClassName}
                    required
                  />
                </label>
                <div className="flex flex-col-reverse gap-3 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "Criando..." : "Criar viagem"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <MapPin className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Sua próxima viagem começa aqui
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Crie uma viagem para organizar atividades, checklist e colaboradores.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Criar primeira viagem
              </button>
            </section>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="group flex min-h-56 flex-col rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <div className="mb-5 flex w-full items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700">
                      <Plane className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {tripTypes[trip.tripType] ?? trip.tripType}
                    </span>
                  </div>
                  <h2 className="w-full truncate text-lg font-semibold text-gray-900 transition group-hover:text-blue-700">
                    {trip.title}
                  </h2>
                  {trip.destination && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{trip.destination}</span>
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </p>
                  <div className="mt-auto grid w-full grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="h-4 w-4 text-indigo-500" />
                      {trip.collaborators.length}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Check className="h-4 w-4 text-blue-500" />
                      {trip.activities.length} atividades
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                      {trip.checklist?.items.length ?? 0} itens
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
