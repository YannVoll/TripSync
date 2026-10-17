import { useState, useEffect } from "react";

interface RecommendedTrip {
  id: number;
  title: string;
  tripType: string;
  startDate: string;
  owner: { name: string };
  activities: any[];
}

interface RecommendationData {
  recommendedTypes: string[];
  recommendations: RecommendedTrip[];
}

export default function RecommendedTrips() {
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/recommendations/suggest", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar recomendações:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando recomendações...</div>;
  if (!recommendations) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-bold mb-2">🎯 Recomendações Para Você</h2>
      <p className="text-gray-600 mb-6">Baseado no seu histórico de viagens</p>

      {recommendations.recommendations.length === 0 ? (
        <p className="text-gray-500">Nenhuma recomendação disponível ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.recommendations.map((trip) => (
            <div
              key={trip.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-indigo-500"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{trip.title}</h3>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                  {trip.tripType}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                De: {new Date(trip.startDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Criada por: <strong>{trip.owner.name}</strong>
              </p>
              <p className="text-xs text-gray-400">
                {trip.activities.length} atividades planejadas
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
