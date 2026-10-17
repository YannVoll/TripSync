import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import api from "../../lib/axios";

interface Trip {
  id: number;
  title: string;
  startDate: string;
}

type Feedback = { type: "success" | "error"; text: string };

export default function NotificationSettingsCompleto() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState("");
  const [daysBefore, setDaysBefore] = useState(1);
  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "");
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await api.get<Trip[]>("/trips");
        setTrips(response.data);
      } catch (error) {
        console.error("Erro ao carregar viagens:", error);
        setMessage({ type: "error", text: "Erro ao carregar viagens." });
      }
    };

    void fetchTrips();
  }, []);

  const validateForm = () => {
    if (!tripId || !email.trim()) {
      setMessage({ type: "error", text: "Selecione uma viagem e informe um email." });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post<{ message: string }>("/notifications/schedule", {
        tripId: Number(tripId),
        daysBefore,
        email: email.trim(),
      });
      setMessage({ type: "success", text: response.data.message });
    } catch (error: unknown) {
      const text = axios.isAxiosError(error)
        ? error.response?.data?.error || "Erro ao agendar notificação."
        : "Erro ao agendar notificação.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!validateForm()) return;

    setTestingEmail(true);
    setMessage(null);
    try {
      const response = await api.post<{ message: string }>("/notifications/test", {
        tripId: Number(tripId),
        email: email.trim(),
      });
      setMessage({ type: "success", text: response.data.message });
    } catch (error: unknown) {
      const text = axios.isAxiosError(error)
        ? error.response?.data?.error || "Não foi possível enviar o email de teste."
        : "Não foi possível enviar o email de teste.";
      setMessage({ type: "error", text });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <Link
          to="/"
          className="inline-block mb-5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          ← Voltar ao menu
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📧 Notificações</h1>
        <p className="text-gray-600 mb-6">Receba lembretes antes de suas viagens</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="tripId" className="block text-sm font-medium text-gray-700 mb-2">
              Qual viagem?
            </label>
            <select
              id="tripId"
              value={tripId}
              onChange={(event) => setTripId(event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={trips.length === 0}
              required
            >
              <option value="">Selecione uma viagem...</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} ({new Date(trip.startDate).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>
            {trips.length === 0 && (
              <p className="text-red-500 text-sm mt-1">
                Nenhuma viagem encontrada. Crie uma primeiro!
              </p>
            )}
          </div>

          <div>
            <label htmlFor="daysBefore" className="block text-sm font-medium text-gray-700 mb-2">
              Quantos dias antes?
            </label>
            <div className="flex items-center gap-4">
              <input
                id="daysBefore"
                type="range"
                min="1"
                max="30"
                value={daysBefore}
                onChange={(event) => setDaysBefore(Number(event.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-lg font-bold text-blue-600 min-w-12">{daysBefore}d</span>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email para notificação
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || testingEmail || trips.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            {loading ? "Agendando..." : "✉️ Agendar Notificação"}
          </button>
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={loading || testingEmail || trips.length === 0}
            className="w-full border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 rounded-lg py-3 font-semibold transition duration-200"
          >
            {testingEmail ? "Enviando teste..." : "Enviar email agora (teste)"}
          </button>
        </form>

        {message && (
          <div
            role="status"
            className={`mt-4 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Você receberá um email {daysBefore} dia(s) antes da data de
            início da viagem.
          </p>
        </div>
      </div>
    </div>
  );
}
