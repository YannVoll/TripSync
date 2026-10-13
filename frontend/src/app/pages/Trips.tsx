import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    tripType: "BEACH",
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (error) {
      console.error("Erro ao buscar viagens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("✅ Viagem criada com sucesso!");
        setFormData({ title: "", tripType: "BEACH", startDate: "", endDate: "" });
        setShowForm(false);
        fetchTrips();
      }
    } catch (error) {
      alert("❌ Erro ao criar viagem");
      console.error(error);
    }
  };

  if (loading)
    return <div className="p-8 text-center">Carregando viagens...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🧳 Minhas Viagens</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nova Viagem
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-4">Criar Nova Viagem</h2>
          <form onSubmit={handleCreateTrip}>
            <input
              type="text"
              placeholder="Título da viagem"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
              required
            />
            <select
              value={formData.tripType}
              onChange={(e) =>
                setFormData({ ...formData, tripType: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
            >
              <option value="BEACH">🏖️ Praia</option>
              <option value="CITY_TOUR">🏙️ City Tour</option>
              <option value="FLIGHT">✈️ Avião</option>
              <option value="MOUNTAIN">⛰️ Montanha</option>
              <option value="BUSINESS">💼 Business</option>
              <option value="BACKPACKING">🎒 Mochilão</option>
              <option value="TREKKING">🥾 Trekking</option>
              <option value="CUSTOM">📌 Customizado</option>
            </select>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
              required
            />
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
              required
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Criar Viagem
            </button>
          </form>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="text-center text-gray-500">
          Nenhuma viagem criada ainda. Comece criando uma! 🌍
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trips/${trip.id}`)}
              className="bg-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition"
            >
              <h3 className="text-xl font-bold mb-2">{trip.title}</h3>
              <p className="text-gray-600 mb-2">Tipo: {trip.tripType}</p>
              <p className="text-sm text-gray-500">
                {new Date(trip.startDate).toLocaleDateString()} até{" "}
                {new Date(trip.endDate).toLocaleDateString()}
              </p>
              <p className="text-sm mt-2">
                👥 Colaboradores: {trip.collaborators.length}
              </p>
              <p className="text-sm">
                ✓ Atividades: {trip.activities.length}
              </p>
              {trip.checklist && (
                <p className="text-sm text-green-600 mt-2">
                  ✅ Checklist: {trip.checklist.items?.length || 0} itens
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
