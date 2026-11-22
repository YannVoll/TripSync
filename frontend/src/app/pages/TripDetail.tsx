import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  LogOut,
  MailPlus,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import api, { getErrorMessage } from "../../lib/axios";
import WeatherForecast from "./WeatherForecast";

type CollaboratorRole = "COLLABORATOR" | "VIEWER";
type TripTab = "activities" | "checklist" | "collaborators" | "weather" | "history";

interface Collaborator {
  id: number;
  role: CollaboratorRole;
  user: { id: number; name: string; email: string };
}

interface ActivityComment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string };
}

interface Activity {
  id: number;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  createdBy: { id: number; name: string };
  comments: ActivityComment[];
}

interface ActivityForm {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
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
  description?: string | null;
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
    details?: { title?: string; name?: string } | null;
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

const historyLabels: Record<string, string> = {
  TRIP_CREATED: "criou a viagem",
  TRIP_UPDATED: "atualizou os dados da viagem",
  ACTIVITY_ADDED: "adicionou uma atividade",
  ACTIVITY_UPDATED: "editou uma atividade",
  ACTIVITY_DELETED: "removeu uma atividade",
  COLLABORATOR_ADDED: "convidou um colaborador",
  COLLABORATOR_REMOVED: "removeu um colaborador",
  COLLABORATOR_LEFT: "saiu da viagem",
  CHECKLIST_CREATED: "gerou a checklist",
};

const emptyActivity: ActivityForm = { title: "", description: "", startTime: "", endTime: "" };

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function getActivityError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ conflictingActivities?: { title: string }[] }>(error)) {
    const conflicts = error.response?.data?.conflictingActivities;
    if (conflicts?.length) {
      return `Conflito de horário com: ${conflicts.map((activity) => activity.title).join(", ")}`;
    }
  }
  return getErrorMessage(error, fallback);
}

function toDateTimeLocal(date: string) {
  const value = new Date(date);
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
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
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [activeTab, setActiveTab] = useState<TripTab>("activities");
  const [newActivity, setNewActivity] = useState<ActivityForm>(emptyActivity);
  const [editingTrip, setEditingTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    title: "",
    description: "",
    destination: "",
    tripType: "CUSTOM",
    startDate: "",
    endDate: "",
  });
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivity);
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
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

  const myCollaborator = trip?.collaborators.find(
    (collaborator) => collaborator.user.id === user?.id
  );
  const currentRole = myCollaborator?.role;
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
      setNewActivity(emptyActivity);
      await fetchTrip();
    } catch (error) {
      toast.error(getActivityError(error, "Não foi possível criar a atividade."));
    } finally {
      setSavingActivity(false);
    }
  };

  const startEditingTrip = () => {
    if (!trip) return;
    setTripForm({
      title: trip.title,
      description: trip.description ?? "",
      destination: trip.destination ?? "",
      tripType: trip.tripType,
      startDate: toDateTimeLocal(trip.startDate),
      endDate: toDateTimeLocal(trip.endDate),
    });
    setEditingTrip(true);
  };

  const handleUpdateTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (new Date(tripForm.endDate) <= new Date(tripForm.startDate)) {
      toast.error("A data de término deve ser posterior à data de início.");
      return;
    }
    setSavingTrip(true);
    try {
      await api.put(`/trips/${tripId}`, tripForm);
      toast.success("Viagem atualizada.");
      setEditingTrip(false);
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível atualizar a viagem."));
    } finally {
      setSavingTrip(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!confirm("Excluir esta viagem? Atividades, checklist e histórico também serão apagados.")) return;
    try {
      await api.delete(`/trips/${tripId}`);
      toast.success("Viagem excluída.");
      navigate("/trips");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível excluir a viagem."));
    }
  };

  const startEditingActivity = (activity: Activity) => {
    setEditingActivityId(activity.id);
    setActivityForm({
      title: activity.title,
      description: activity.description ?? "",
      startTime: toDateTimeLocal(activity.startTime),
      endTime: toDateTimeLocal(activity.endTime),
    });
  };

  const handleUpdateActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (new Date(activityForm.endTime) <= new Date(activityForm.startTime)) {
      toast.error("O término da atividade deve ser depois do início.");
      return;
    }
    setSavingActivity(true);
    try {
      await api.put(`/trips/${tripId}/activities/${editingActivityId}`, activityForm);
      toast.success("Atividade atualizada.");
      setEditingActivityId(null);
      await fetchTrip();
    } catch (error) {
      toast.error(getActivityError(error, "Não foi possível atualizar a atividade."));
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    if (!confirm(`Remover a atividade "${activity.title}"?`)) return;
    try {
      await api.delete(`/trips/${tripId}/activities/${activity.id}`);
      toast.success("Atividade removida.");
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover a atividade."));
    }
  };

  const toggleComments = (activityId: number) => {
    setOpenComments((current) => {
      const next = new Set(current);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  };

  const handleAddComment = async (event: FormEvent<HTMLFormElement>, activityId: number) => {
    event.preventDefault();
    const content = commentDrafts[activityId]?.trim();
    if (!content) return;
    try {
      await api.post(`/trips/${tripId}/activities/${activityId}/comments`, { content });
      setCommentDrafts((drafts) => ({ ...drafts, [activityId]: "" }));
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível comentar."));
    }
  };

  const handleDeleteComment = async (activityId: number, commentId: number) => {
    try {
      await api.delete(`/trips/${tripId}/activities/${activityId}/comments/${commentId}`);
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o comentário."));
    }
  };

  const handleDeleteChecklistItem = async (itemId: number) => {
    try {
      await api.delete(`/trips/${tripId}/checklist/items/${itemId}`);
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o item."));
    }
  };

  const handleRemoveCollaborator = async (collaborator: Collaborator) => {
    const isSelf = collaborator.user.id === user?.id;
    const question = isSelf
      ? "Sair desta viagem? Você perderá o acesso a ela."
      : `Remover ${collaborator.user.name} da viagem?`;
    if (!confirm(question)) return;
    try {
      await api.delete(`/trips/${tripId}/collaborators/${collaborator.user.id}`);
      if (isSelf) {
        toast.success("Você saiu da viagem.");
        navigate("/trips");
        return;
      }
      toast.success("Colaborador removido.");
      await fetchTrip();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o colaborador."));
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
                  {tripTypes[trip.tripType] ?? trip.tripType}
                </span>
                <h1 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  {trip.title}
                </h1>
                {trip.description && (
                  <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-blue-50">
                    {trip.description}
                  </p>
                )}
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
                  <p className="mt-1 text-xs text-blue-100">{trip.activities.length === 1 ? "atividade" : "atividades"}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4" />
                    {trip.collaborators.length + 1}
                  </div>
                  <p className="mt-1 text-xs text-blue-100">{trip.collaborators.length === 0 ? "participante" : "participantes"}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-5">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={startEditingTrip}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/25"
                  >
                    <Pencil className="h-4 w-4" /> Editar viagem
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTrip}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/40"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm text-blue-50">
                    Você é {currentRole === "COLLABORATOR" ? "colaborador(a)" : "visualizador(a)"} · organizada por {trip.owner.name}
                  </span>
                  {myCollaborator && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(myCollaborator)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/40"
                    >
                      <LogOut className="h-4 w-4" /> Sair da viagem
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {editingTrip && (
            <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Editar viagem</h2>
                <button
                  type="button"
                  onClick={() => setEditingTrip(false)}
                  aria-label="Fechar edição"
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateTrip} className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Nome da viagem</span>
                  <input
                    type="text"
                    value={tripForm.title}
                    onChange={(event) => setTripForm({ ...tripForm, title: event.target.value })}
                    className={inputClassName}
                    maxLength={100}
                    required
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Descrição <span className="font-normal text-gray-400">(opcional)</span>
                  </span>
                  <textarea
                    value={tripForm.description}
                    onChange={(event) => setTripForm({ ...tripForm, description: event.target.value })}
                    className={`${inputClassName} min-h-20 resize-y`}
                    rows={2}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Destino</span>
                  <input
                    type="text"
                    value={tripForm.destination}
                    onChange={(event) => setTripForm({ ...tripForm, destination: event.target.value })}
                    className={inputClassName}
                    maxLength={100}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Tipo de viagem</span>
                  <select
                    value={tripForm.tripType}
                    onChange={(event) => setTripForm({ ...tripForm, tripType: event.target.value })}
                    className={inputClassName}
                  >
                    {Object.entries(tripTypes).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Início</span>
                  <input
                    type="datetime-local"
                    value={tripForm.startDate}
                    onChange={(event) => setTripForm({ ...tripForm, startDate: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Término</span>
                  <input
                    type="datetime-local"
                    value={tripForm.endDate}
                    onChange={(event) => setTripForm({ ...tripForm, endDate: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>
                <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingTrip(false)}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTrip}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingTrip && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Salvar alterações
                  </button>
                </div>
              </form>
            </section>
          )}

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
                    {trip.activities.map((activity) =>
                      editingActivityId === activity.id ? (
                        <form
                          key={activity.id}
                          onSubmit={handleUpdateActivity}
                          className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-2"
                        >
                          <input
                            type="text"
                            value={activityForm.title}
                            onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })}
                            className={`${inputClassName} sm:col-span-2`}
                            maxLength={120}
                            required
                          />
                          <textarea
                            value={activityForm.description}
                            onChange={(event) =>
                              setActivityForm({ ...activityForm, description: event.target.value })
                            }
                            placeholder="Observações"
                            className={`${inputClassName} min-h-16 resize-y sm:col-span-2`}
                            rows={2}
                          />
                          <input
                            type="datetime-local"
                            value={activityForm.startTime}
                            onChange={(event) =>
                              setActivityForm({ ...activityForm, startTime: event.target.value })
                            }
                            className={inputClassName}
                            required
                          />
                          <input
                            type="datetime-local"
                            value={activityForm.endTime}
                            onChange={(event) => setActivityForm({ ...activityForm, endTime: event.target.value })}
                            className={inputClassName}
                            required
                          />
                          <div className="flex justify-end gap-2 sm:col-span-2">
                            <button
                              type="button"
                              onClick={() => setEditingActivityId(null)}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={savingActivity}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {savingActivity && <LoaderCircle className="h-4 w-4 animate-spin" />}
                              Salvar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <article
                          key={activity.id}
                          className="rounded-xl border border-gray-100 p-4 transition hover:border-blue-100 hover:bg-blue-50/30"
                        >
                          <div className="flex gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Clock3 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                                {canEdit && (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditingActivity(activity)}
                                      aria-label="Editar atividade"
                                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-blue-600"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(activity)}
                                      aria-label="Remover atividade"
                                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                {formatDateTime(activity.startTime)} – {formatDateTime(activity.endTime)}
                              </p>
                              {activity.description && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                                  {activity.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <p className="text-xs text-gray-400">Adicionada por {activity.createdBy.name}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleComments(activity.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {activity.comments.length
                                    ? `${activity.comments.length} comentário${activity.comments.length > 1 ? "s" : ""}`
                                    : "Comentar"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {openComments.has(activity.id) && (
                            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 sm:ml-14">
                              {activity.comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                    {comment.author.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2">
                                    <p className="text-xs text-gray-500">
                                      <span className="font-semibold text-gray-700">{comment.author.name}</span>
                                      {" · "}
                                      {formatDateTime(comment.createdAt)}
                                    </p>
                                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                                  </div>
                                  {(comment.author.id === user?.id || isOwner) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(activity.id, comment.id)}
                                      aria-label="Remover comentário"
                                      className="p-1 text-gray-300 transition hover:text-red-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {canEdit ? (
                                <form
                                  onSubmit={(event) => handleAddComment(event, activity.id)}
                                  className="flex gap-2"
                                >
                                  <input
                                    type="text"
                                    value={commentDrafts[activity.id] ?? ""}
                                    onChange={(event) =>
                                      setCommentDrafts((drafts) => ({
                                        ...drafts,
                                        [activity.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="Escreva um comentário..."
                                    className={`${inputClassName} py-2`}
                                    maxLength={1000}
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Enviar comentário"
                                    className="shrink-0 rounded-xl bg-blue-600 px-3 text-white transition hover:bg-blue-700"
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                </form>
                              ) : (
                                !activity.comments.length && (
                                  <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
                                )
                              )}
                            </div>
                          )}
                        </article>
                      )
                    )}
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
                        <div
                          key={item.id}
                          className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            canEdit
                              ? "border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/40"
                              : "border-gray-100"
                          }`}
                        >
                          <label className={`flex flex-1 items-center gap-3 ${canEdit ? "cursor-pointer" : ""}`}>
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled={!canEdit}
                              onChange={() => void handleToggleChecklistItem(item.id)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-default"
                            />
                            <span
                              className={`text-sm ${
                                item.completed ? "text-gray-400 line-through" : "text-gray-700"
                              }`}
                            >
                              {item.title}
                            </span>
                          </label>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              aria-label={`Remover ${item.title}`}
                              className="p-1 text-gray-300 opacity-100 transition hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(collaborator)}
                          aria-label={`Remover ${collaborator.user.name}`}
                          className="p-1 text-gray-300 transition hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{event.user.name}</span>{" "}
                          {historyLabels[event.action] ?? event.action.replace(/_/g, " ").toLowerCase()}
                          {event.details?.title && (
                            <span className="text-gray-600"> · “{event.details.title}”</span>
                          )}
                          {event.details?.name && (
                            <span className="text-gray-600"> · {event.details.name}</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(event.createdAt)}</p>
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
