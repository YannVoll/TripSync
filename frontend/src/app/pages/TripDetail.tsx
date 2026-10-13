import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface Trip {
  id: number;
  title: string;
  tripType: string;
  startDate: string;
  endDate: string;
  owner: { name: string };
  collaborators: any[];
  activities: any[];
  checklist?: any;
  history?: any[];
}

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activities" | "checklist" | "collaborators" | "history">("activities");
  const [newActivity, setNewActivity] = useState({
    title: "",
    startTime: "",
    endTime: "",
  });
  const [newCollaborator, setNewCollaborator] = useState({ email: "", role: "COLLABORATOR" });

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newActivity),
      });

      if (res.ok) {
        alert("✅ Atividade criada!");
        setNewActivity({ title: "", startTime: "", endTime: "" });
        fetchTrip();
      } else {
        const error = await res.json();
        alert(`❌ ${error.error}`);
      }
    } catch (error) {
      alert("❌ Erro ao criar atividade");
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/trips/${tripId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCollaborator),
      });

      if (res.ok) {
        alert("✅ Colaborador convidado!");
        setNewCollaborator({ email: "", role: "COLLABORATOR" });
        fetchTrip();
      } else {
        alert("❌ Erro ao convidar colaborador");
      }
    } catch (error) {
      alert("❌ Erro");
    }
  };

  const handleCreateChecklist = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/trips/${tripId}/checklist`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("✅ Checklist criada!");
        fetchTrip();
      }
    } catch (error) {
      alert("❌ Erro");
    }
  };

  const handleToggleChecklistItem = async (itemId: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/api/trips/${tripId}/checklist/items/${itemId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchTrip();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!trip) return <div className="p-8">Viagem não encontrada</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate("/trips")} className="mb-4 text-blue-600 hover:underline">
        ← Voltar
      </button>

      <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
      <p className="text-gray-600 mb-6">
        {new Date(trip.startDate).toLocaleDateString()} até {new Date(trip.endDate).toLocaleDateString()}
      </p>

      {/* TABS */}
      <div className="flex gap-4 mb-6 border-b">
        {(["activities", "checklist", "collaborators", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold ${
              activeTab === tab ? "border-b-2 border-blue-600" : "text-gray-600"
            }`}
          >
            {tab === "activities" && "✓ Atividades"}
            {tab === "checklist" && "✅ Checklist"}
            {tab === "collaborators" && "👥 Colaboradores"}
            {tab === "history" && "📜 Histórico"}
          </button>
        ))}
      </div>

      {/* ATIVIDADES */}
      {activeTab === "activities" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Atividades</h2>
          <form onSubmit={handleAddActivity} className="bg-white p-4 rounded-lg mb-6">
            <input
              type="text"
              placeholder="Título da atividade"
              value={newActivity.title}
              onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              required
            />
            <input
              type="datetime-local"
              value={newActivity.startTime}
              onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              required
            />
            <input
              type="datetime-local"
              value={newActivity.endTime}
              onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Adicionar Atividade
            </button>
          </form>

          <div className="space-y-4">
            {trip.activities.map((activity) => (
              <div key={activity.id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold">{activity.title}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(activity.startTime).toLocaleString()} até{" "}
                  {new Date(activity.endTime).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Criado por: {activity.createdBy.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHECKLIST */}
      {activeTab === "checklist" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Checklist</h2>
          {!trip.checklist ? (
            <button
              onClick={handleCreateChecklist}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Gerar Checklist ({trip.tripType})
            </button>
          ) : (
            <div>
              <div className="mb-4">
                <p className="text-lg font-bold">
                  Progresso: {trip.checklist.completedCount || 0} de {trip.checklist.totalCount || 0} (
                  {Math.round(((trip.checklist.completedCount || 0) / (trip.checklist.totalCount || 1)) * 100)}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${Math.round(
                        ((trip.checklist.completedCount || 0) / (trip.checklist.totalCount || 1)) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                {trip.checklist.items?.map((item: any) => (
                  <label key={item.id} className="flex items-center p-2 bg-white rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="mr-3 w-5 h-5"
                    />
                    <span className={item.completed ? "line-through text-gray-400" : ""}>{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COLABORADORES */}
      {activeTab === "collaborators" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Colaboradores</h2>
          <form onSubmit={handleAddCollaborator} className="bg-white p-4 rounded-lg mb-6">
            <input
              type="email"
              placeholder="Email do colaborador"
              value={newCollaborator.email}
              onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
              className="w-full p-2 border rounded mb-2"
              required
            />
            <select
              value={newCollaborator.role}
              onChange={(e) => setNewCollaborator({ ...newCollaborator, role: e.target.value })}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="COLLABORATOR">Colaborador (editar)</option>
              <option value="VIEWER">Visualizador (ler)</option>
            </select>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Convidar Colaborador
            </button>
          </form>

          <div className="space-y-2">
            {trip.collaborators.map((colab) => (
              <div key={colab.id} className="bg-white p-4 rounded-lg">
                <p className="font-bold">{colab.user.name}</p>
                <p className="text-sm text-gray-600">{colab.user.email}</p>
                <p className="text-xs text-gray-500">Papel: {colab.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {activeTab === "history" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Histórico</h2>
          <div className="space-y-2">
            {trip.history?.map((event) => (
              <div key={event.id} className="bg-white p-4 rounded-lg text-sm">
                <p className="font-bold">{event.action}</p>
                <p className="text-gray-600">Por: {event.user.name}</p>
                <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
