import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Home, Calendar, Trash2, MapPin, Pencil, Plane } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";


interface Property {
  id: number; title: string; city: string; state: string; pricePerNight: number; type: string; imageUrl: string | null;
}
interface Booking {
  id: number; checkIn: string; checkOut: string; totalPrice: number;
  property: { id: number; title: string; city: string };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    Promise.all([
      api.get("/properties/my").then((r) => setProperties(r.data)),
      api.get("/bookings/my").then((r) => setBookings(r.data)),
    ]).finally(() => setLoading(false));
  }, [user]);

  const deleteProperty = async (id: number) => {
    if (!confirm("Remover este anúncio?")) return;
    await api.delete(`/properties/${id}`);
    setProperties((p) => p.filter((x) => x.id !== id));
    toast.success("Anúncio removido.");
  };

  const cancelBooking = async (id: number) => {
    if (!confirm("Cancelar esta reserva?")) return;
    await api.delete(`/bookings/${id}`);
    setBookings((b) => b.filter((x) => x.id !== id));
    toast.success("Reserva cancelada.");
  };

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Olá, {user.name.split(" ")[0]}!</h1>
              <p className="text-gray-500 text-sm">Gerencie seus anúncios e reservas</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/trips" className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 text-sm font-medium">
                <Plane className="w-4 h-4" /> Minhas viagens
              </Link>
              <Link to="/properties/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 text-sm font-medium">
                <Plus className="w-4 h-4" /> Novo anúncio
              </Link>
            </div>
          </div>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Home className="w-5 h-5 text-blue-600" /> Meus imóveis</h2>
            {loading ? <div className="h-32 bg-white rounded-2xl animate-pulse" /> : properties.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                <p className="mb-3">Você ainda não tem imóveis cadastrados.</p>
                <Link to="/properties/new" className="text-blue-600 hover:underline text-sm">Anunciar agora →</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {properties.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-16 h-16 rounded-xl bg-blue-100 flex-shrink-0 overflow-hidden">
                      {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-6 h-6 text-blue-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">{p.title}</Link>
                      <p className="text-sm text-gray-500">{p.city}, {p.state}</p>
                      <p className="text-blue-600 text-sm font-semibold">R$ {p.pricePerNight.toFixed(2)}/noite</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/properties/${p.id}/edit`}
                        className="text-gray-500 hover:text-red-600 transition-colors p-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteProperty(p.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Minhas reservas</h2>
            {loading ? <div className="h-32 bg-white rounded-2xl animate-pulse" /> : bookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                <p className="mb-3">Nenhuma reserva ainda.</p>
                <Link to="/properties" className="text-blue-600 hover:underline text-sm">Explorar acomodações →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <Link to={`/properties/${b.property.id}`} className="font-medium text-gray-900 hover:text-blue-600">{b.property.title}</Link>
                      <p className="text-sm text-gray-500">{b.property.city}</p>
                      <p className="text-sm text-gray-400">{new Date(b.checkIn).toLocaleDateString("pt-BR")} → {new Date(b.checkOut).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">R$ {b.totalPrice.toFixed(2)}</p>
                      <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-400 hover:text-red-600 mt-1">Cancelar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
