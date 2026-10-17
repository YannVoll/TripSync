import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CloudSun,
  History,
  ListChecks,
  LoaderCircle,
  MailPlus,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/axios";
import WeatherForecast from "./WeatherForecast";

type CollaboratorRole = "COLLABORATOR" | "VIEWER";
type TripTab = "activities" | "checklist" | "collaborators" | "weather" | "history";

interface Collaborator {
  id: number;
  role: CollaboratorRole;
  user: { id: number; name: string; email: string };
}

interface Activity {
  id: number;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  createdBy: { id: number; name: string };
}

interface ChecklistItem {
  id: number;
  title: string;
  completed: boolean;
  category?: string | null;
}

interface Trip {
  id: number;
  ownerId: number;
  title: string;
  destination?: string | null;
  tripType: string;
  startDate: string;
  endDate: string;
  owner: { id: number; name: string };
  collaborators: Collaborator[];
  activities: Activity[];
  checklist?: { items: ChecklistItem[] } | null;
  history?: {
    id: number;
    action: string;
    createdAt: string;
    user: { name: string };
  }[];
}

const tabs: { id: TripTab; label: string; icon: typeof Check }[] = [
  { id: "activities", label: "Atividades", icon: CalendarDays },
  { id: "checklist", label: "Checklist", icon: ClipboardCheck },
  { id: "collaborators", label: "Colaboradores", icon: Users },
  { id: "weather", label: "Clima", icon: CloudSun },
  { id: "history", label: "Histórico", icon: History },
];

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
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TripDetail() {
  const { tripId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [activeTab, setActiveTab] = useState<TripTab>("activities");
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
  });
  const [newItemTitle, setNewItemTitle] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState<{
    email: string;
    role: CollaboratorRole;
  }>({ email: "", role: "COLLABORATOR" });

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const { data } = await api.get<Trip>(`/trips/${tripId}`);
      setTrip(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível carregar esta viagem."));
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void fetchTrip();
  }, [fetchTrip]);

  const currentRole = trip?.collaborators.find(
    (collaborator) => collaborator.user.id === user?.id
  )?.role;
  const isOwner = Boolean(trip && user && trip.ownerId === user.id);
  const canEdit = isOwner || currentRole === "COLLABORATOR";
  const checklistItems = trip?.checklist?.items ?? [];
  const completedItems = checklistItems.filter((item) => item.completed).length;
  const checklistProgress = checklistItems.length
    ? Math.round((completedItems / checklistItems.length) * 100)
    : 0;

  const handleAddActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (new Date(newActivity.endTime) <= new Date(newActivity.startTime)) {
      toast.error("O término da atividade deve ser depois do início.");
      return;
    }

    setSavingActivity(true);
    try {
      await api.post(`/trips/${tripId}/activities`, newActivity);
      toast.success("Atividade adicionada à viagem.");
      setNewActivity({ title: "", description: "", startTime: "", endTime: "" });
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível criar a atividade."));
    } finally {
      setSavingActivity(false);
    }
  };

  const handleSaveDestination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingDestination(true);
    try {
      await api.put(`/trips/${tripId}`, { destination: destinationInput });
      toast.success("Destino salvo.");
      setDestinationInput("");
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível salvar o destino."));
    } finally {
      setSavingDestination(false);
    }
  };

  const handleInviteCollaborator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingInvite(true);
    try {
      await api.post(`/trips/${tripId}/collaborators`, {
        ...newCollaborator,
        email: newCollaborator.email.trim(),
      });
      toast.success("Colaborador adicionado à viagem.");
      setNewCollaborator({ email: "", role: "COLLABORATOR" });
      await fetchTrip();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Não foi possível convidar este colaborador.")
      );
    } finally {
      setSavingInvite(false);
    }
  };

  const handleCreateChecklist = async () => {
    setSavingChecklist(true);
    try {
      await api.post(`/trips/${tripId}/checklist`);
      toast.success("Checklist criada com itens recomendados para a viagem.");
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível gerar a checklist."));
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleAddChecklistItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    setSavingChecklist(true);
    try {
      await api.post(`/trips/${tripId}/checklist/items`, { title });
      setNewItemTitle("");
      await fetchTrip();
      toast.success("Item adicionado à checklist.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível adicionar o item."));
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: number) => {
    try {
      await api.patch(`/trips/${tripId}/checklist/items/${itemId}`);
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível atualizar o item."));
    }
  };

  if (loading || authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-32">
          <div className="mx-auto max-w-5xl animate-pulse">
            <div className="mb-5 h-4 w-28 rounded bg-gray-200" />
            <div className="mb-3 h-8 w-72 rounded bg-gray-200" />
            <div className="mb-8 h-4 w-56 rounded bg-gray-200" />
            <div className="h-72 rounded-2xl bg-white" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!trip) {
    return (
      <>
        <Header />
        <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 pt-24">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <MapPin className="mx-auto mb-4 h-8 w-8 text-gray-400" />
            <h1 className="text-xl font-semibold text-gray-900">
              Viagem não encontrada
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Ela pode ter sido removida ou você não tem acesso a ela.
            </p>
            <Link
              to="/trips"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar às viagens
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pb-16 pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/trips"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Todas as viagens
          </Link>

          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.tripType.replace(/_/g, " ")}
                </span>
                <h1 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  {trip.title}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-blue-100">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </p>
                {trip.destination && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-blue-100">
                    <MapPin className="h-4 w-4" />
                    {trip.destination}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-52">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4" />
                    {trip.activities.length}
                  </div>
                  <p className="mt-1 text-xs text-blue-100">atividades</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4" />
                    {trip.collaborators.length + 1}
                  </div>
                  <p className="mt-1 text-xs text-blue-100">participantes</p>
                </div>
              </div>
            </div>
          </section>

          <nav
            aria-label="Seções da viagem"
            className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          {activeTab === "activities" && (
            <section className="space-y-5">
              {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Adicionar atividade
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Organize passeios, reservas e outros compromissos.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleAddActivity} className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        Nome da atividade
                      </span>
                      <input
                        type="text"
                        placeholder="Ex.: Visita ao centro histórico"
                        value={newActivity.title}
                        onChange={(event) =>
                          setNewActivity({ ...newActivity, title: event.target.value })
                        }
                        className={inputClassName}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        Observações <span className="font-normal text-gray-400">(opcional)</span>
                      </span>
                      <textarea
                        placeholder="Local, endereço ou detalhes úteis"
                        value={newActivity.description}
                        onChange={(event) =>
                          setNewActivity({
                            ...newActivity,
                            description: event.target.value,
                          })
                        }
                        className={`${inputClassName} min-h-20 resize-y`}
                        rows={2}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        Início
                      </span>
                      <input
                        type="datetime-local"
                        value={newActivity.startTime}
                        onChange={(event) =>
                          setNewActivity({ ...newActivity, startTime: event.target.value })
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
                        value={newActivity.endTime}
                        onChange={(event) =>
                          setNewActivity({ ...newActivity, endTime: event.target.value })
                        }
                        className={inputClassName}
                        required
                      />
                    </label>
                    <div className="sm:col-span-2 sm:text-right">
                      <button
                        type="submit"
                        disabled={savingActivity}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {savingActivity ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {savingActivity ? "Salvando..." : "Adicionar atividade"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Programação
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {trip.activities.length}{" "}
                      {trip.activities.length === 1 ? "atividade" : "atividades"}
                    </p>
                  </div>
                </div>
                {trip.activities.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 px-5 py-10 text-center">
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                    <p className="font-medium text-gray-700">
                      Ainda não há atividades
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {canEdit
                        ? "Adicione a primeira atividade para começar a montar a programação."
                        : "As atividades adicionadas à viagem aparecerão aqui."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trip.activities.map((activity) => (
                      <article
                        key={activity.id}
                        className="flex gap-4 rounded-xl border border-gray-100 p-4 transition hover:border-blue-100 hover:bg-blue-50/30"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Clock3 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {activity.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatDateTime(activity.startTime)} –{" "}
                            {formatDateTime(activity.endTime)}
                          </p>
                          {activity.description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                              {activity.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-gray-400">
                            Adicionada por {activity.createdBy.name}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "checklist" && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              {!trip.checklist ? (
                <div className="mx-auto max-w-lg py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Prepare tudo para a viagem
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Gere uma lista inicial com itens recomendados para o tipo
                    desta viagem e personalize-a com o grupo.
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleCreateChecklist}
                      disabled={savingChecklist}
                      className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingChecklist ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <ListChecks className="h-4 w-4" />
                      )}
                      Gerar checklist
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Checklist da viagem
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {completedItems} de {checklistItems.length} itens concluídos
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {checklistProgress}%
                    </span>
                  </div>
                  <div
                    className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-label="Progresso da checklist"
                    aria-valuenow={checklistProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>

                  {canEdit && (
                    <form
                      onSubmit={handleAddChecklistItem}
                      className="mb-5 flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={(event) => setNewItemTitle(event.target.value)}
                        placeholder="Adicionar item à checklist"
                        className={inputClassName}
                        maxLength={120}
                        required
                      />
                      <button
                        type="submit"
                        disabled={savingChecklist}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </button>
                    </form>
                  )}

                  {checklistItems.length === 0 ? (
                    <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                      Nenhum item na checklist. Adicione o primeiro acima.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {checklistItems.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            canEdit
                              ? "cursor-pointer border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/40"
                              : "border-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={!canEdit}
                            onChange={() => void handleToggleChecklistItem(item.id)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-default"
                          />
                          <span
                            className={`text-sm ${
                              item.completed
                                ? "text-gray-400 line-through"
                                : "text-gray-700"
                            }`}
                          >
                            {item.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === "collaborators" && (
            <section className="space-y-5">
              {isOwner && (
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <MailPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Convidar alguém para colaborar
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Informe o e-mail da conta cadastrada no TripSync.
                      </p>
                    </div>
                  </div>
                  <form
                    onSubmit={handleInviteCollaborator}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]"
                  >
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newCollaborator.email}
                      onChange={(event) =>
                        setNewCollaborator({
                          ...newCollaborator,
                          email: event.target.value,
                        })
                      }
                      className={inputClassName}
                      required
                    />
                    <select
                      value={newCollaborator.role}
                      onChange={(event) =>
                        setNewCollaborator({
                          ...newCollaborator,
                          role: event.target.value as CollaboratorRole,
                        })
                      }
                      className={inputClassName}
                    >
                      <option value="COLLABORATOR">Colaborador — pode editar</option>
                      <option value="VIEWER">Visualizador — somente leitura</option>
                    </select>
                    <button
                      type="submit"
                      disabled={savingInvite}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingInvite ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Convidar
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-gray-400">
                    Quem entrar como colaborador poderá criar atividades e
                    checklist, além de atualizar os itens.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pessoas nesta viagem
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    O proprietário e os colaboradores com acesso.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                      {trip.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {trip.owner.name}
                      </p>
                      <p className="text-xs text-gray-500">Proprietário</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Proprietário
                    </span>
                  </div>
                  {trip.collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                        {collaborator.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {collaborator.user.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {collaborator.user.email}
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {collaborator.role === "COLLABORATOR"
                          ? "Colaborador"
                          : "Visualizador"}
                      </span>
                    </div>
                  ))}
                  {trip.collaborators.length === 0 && (
                    <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                      Ainda não há colaboradores. Convide alguém para planejar
                      junto com você.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "weather" && (
            <section className="space-y-5">
              {trip.destination ? (
                <WeatherForecast city={trip.destination} />
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">Clima do destino</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isOwner
                      ? "Informe a cidade de destino para ver o clima atual e a previsão."
                      : "O proprietário ainda não definiu o destino desta viagem."}
                  </p>
                </div>
              )}
              {isOwner && (
                <form
                  onSubmit={handleSaveDestination}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:p-6"
                >
                  <input
                    type="text"
                    placeholder={trip.destination ? "Alterar destino" : "Ex.: Rio de Janeiro"}
                    value={destinationInput}
                    onChange={(event) => setDestinationInput(event.target.value)}
                    className={inputClassName}
                    maxLength={100}
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingDestination}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingDestination ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Salvar destino
                  </button>
                </form>
              )}
            </section>
          )}

          {activeTab === "history" && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  Histórico da viagem
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Acompanhe as alterações feitas pela equipe.
                </p>
              </div>
              {!trip.history?.length ? (
                <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                  Nenhuma alteração registrada ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.history.map((event) => (
                    <article
                      key={event.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {event.action.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Por {event.user.name} · {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
