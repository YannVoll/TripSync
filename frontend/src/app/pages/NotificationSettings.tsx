import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Trip {
  id: number;
  title: string;
  startDate: string;
}

export default function NotificationSettingsCompleto() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [formData, setFormData] = useState({
    tripId: '',
    daysBefore: 1,
    email: localStorage.getItem('userEmail') || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/trips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips(response.data.trips || response.data);
    } catch (error) {
      console.error('Erro ao carregar trips:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar viagens' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'daysBefore' || name === 'tripId' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tripId || !formData.email) {
      setMessage({ type: 'error', text: 'Preencha todos os campos!' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/notifications/schedule',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ 
        type: 'success', 
        text: `✅ Notificação agendada! Email será enviado ${formData.daysBefore} dia(s) antes da viagem.` 
      });

      setFormData(prev => ({
        ...prev,
        tripId: '',
        daysBefore: 1,
      }));

      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Erro ao agendar notificação' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📧 Notificações</h1>
        <p className="text-gray-600 mb-6">Receba lembretes antes de suas viagens</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual viagem?
            </label>
            <select
              name="tripId"
              value={formData.tripId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={trips.length === 0}
            >
              <option value="">Selecione uma viagem...</option>
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} ({new Date(trip.startDate).toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
            {trips.length === 0 && (
              <p className="text-red-500 text-sm mt-1">Nenhuma viagem encontrada. Crie uma primeiro!</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantos dias antes?
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                name="daysBefore"
                min="1"
                max="30"
                value={formData.daysBefore}
                onChange={handleInputChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-lg font-bold text-blue-600 min-w-12">
                {formData.daysBefore}d
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email para notificação
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || trips.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Agendando...' : '✉️ Agendar Notificação'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Você receberá um email {formData.daysBefore} dia(s) antes da data de início da viagem.
          </p>
        </div>
      </div>
    </div>
  );
}