import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Home, Calendar, Trash2, MapPin, Pencil, Plane, CreditCard } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface Property {
  id: number; title: string; city: string; state: string; pricePerNight: number; type: string; imageUrl: string | null;
}
interface Booking {
  id: number; checkIn: string; checkOut: string; totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  paymentMethod: string | null;
  property: { id: number; title: string; city: string };
}

function PaymentBadge({ booking }: { booking: Booking }) {
  if (booking.paymentStatus === "PAID") {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Pago</span>;
  }
  if (booking.paymentStatus === "FAILED") {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">Pagamento recusado</span>;
  }
  if (booking.paymentMethod) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Aguardando {booking.paymentMethod === "pix" ? "PIX" : "boleto"}
      </span>
    );
  }
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Pagamento pendente</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Property[]>("/properties/my").then((r) => setProperties(r.data)),
      api.get<Booking[]>("/bookings/my").then((r) => setBookings(r.data)),
    ])
      .catch((error) => toast.error(getErrorMessage(error, "Não foi possível carregar o painel.")))
      .finally(() => setLoading(false));
  }, []);

  const deleteProperty = async (id: number) => {
    if (!confirm("Remover este anúncio?")) return;
    try {
      await api.delete(`/properties/${id}`);
      setProperties((p) => p.filter((x) => x.id !== id));
      toast.success("Anúncio removido.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o anúncio."));
    }
  };

  const cancelBooking = async (id: number) => {
    if (!confirm("Cancelar esta reserva?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      setBookings((b) => b.filter((x) => x.id !== id));
      toast.success("Reserva cancelada.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível cancelar a reserva."));
    }
  };

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
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
                      {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-6 h-6 text-blue-300" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">{p.title}</Link>
                      <p className="text-sm text-gray-500">{p.city}, {p.state}</p>
                      <p className="text-blue-600 text-sm font-semibold">R$ {p.pricePerNight.toFixed(2)}/noite</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/properties/${p.id}/edit`}
                        aria-label="Editar anúncio"
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteProperty(p.id)}
                        aria-label="Remover anúncio"
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
                  <div key={b.id} className="bg-white rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/properties/${b.property.id}`} className="font-medium text-gray-900 hover:text-blue-600">{b.property.title}</Link>
                        <PaymentBadge booking={b} />
                      </div>
                      <p className="text-sm text-gray-500">{b.property.city}</p>
                      <p className="text-sm text-gray-400">{new Date(b.checkIn).toLocaleDateString("pt-BR")} → {new Date(b.checkOut).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                      <p className="font-bold text-gray-900">R$ {b.totalPrice.toFixed(2)}</p>
                      <div className="flex items-center gap-3">
                        {b.paymentStatus !== "PAID" && (
                          <Link to={`/checkout/${b.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                            <CreditCard className="w-3.5 h-3.5" /> {b.paymentMethod && b.paymentStatus === "PENDING" ? "Ver pagamento" : "Pagar"}
                          </Link>
                        )}
                        <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-400 hover:text-red-600">Cancelar</button>
                      </div>
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
