import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Users, BedDouble, Bath, Wifi, Star, ArrowLeft, Trash2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface Property {
  id: number;
  title: string;
  description: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  imageUrl: string | null;
  owner: { id: number; name: string; email: string };
  reviews?: Review[];
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  author: { id: number; name: string };
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [booking, setBooking] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = () => {
    api.get(`/reviews/property/${id}`).then((res) => setReviews(res.data)).catch(() => {});
  };

  useEffect(() => {
    api.get(`/properties/${id}`).then((res) => setProperty(res.data)).finally(() => setLoading(false));
    loadReviews();
  }, [id]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handleSubmitReview = async () => {
    if (!user) { navigate("/login"); return; }
    if (!comment.trim()) { toast.error("Escreva um comentário."); return; }
    setSubmittingReview(true);
    try {
      await api.post("/reviews", { propertyId: property!.id, rating, comment });
      toast.success("Avaliação enviada!");
      setComment("");
      setRating(5);
      loadReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao enviar avaliação.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0;

  const handleBook = async () => {
  if (!user) { navigate("/login"); return; }
  if (!checkIn || !checkOut || nights <= 0) { toast.error("Selecione datas válidas."); return; }
  setBooking(true);
  try {
    const res = await api.post("/bookings", { propertyId: property!.id, checkIn, checkOut });
    toast.success("Reserva criada! Finalize o pagamento.");
    navigate(`/checkout/${res.data.id}`);
  } catch (err: any) {
    const msg = err.response?.data?.error || "Erro ao realizar reserva.";
    toast.error(msg);
  } finally {
    setBooking(false);
  }
  
};
  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja remover este anúncio?")) return;
    try {
      await api.delete(`/properties/${id}`);
      toast.success("Anúncio removido.");
      navigate("/properties");
    } catch {
      toast.error("Erro ao remover anúncio.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center text-gray-500">Imóvel não encontrado.</div>;

  const typeLabel = { HOTEL: "Hotel", HOUSE: "Casa", APARTMENT: "Apartamento", POUSADA: "Pousada" }[property.type] ?? property.type;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gray-50 pb-16">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link to="/properties" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar para acomodações
          </Link>

          <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200 mb-8">
            {property.imageUrl ? (
              <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-300">
                <MapPin className="w-24 h-24" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">{typeLabel}</span>
                  <div className="flex items-center gap-1 text-sm text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" /> {avgRating ?? "Novo"}
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
                <div className="flex items-center gap-1 text-gray-500 mt-2">
                  <MapPin className="w-4 h-4" /> {property.address}, {property.city} — {property.state}
                </div>
              </div>

              <div className="flex gap-6 py-4 border-y border-gray-100">
                <div className="flex items-center gap-2 text-gray-600"><Users className="w-5 h-5 text-blue-500" /> {property.maxGuests} hóspedes</div>
                <div className="flex items-center gap-2 text-gray-600"><BedDouble className="w-5 h-5 text-blue-500" /> {property.bedrooms} quartos</div>
                <div className="flex items-center gap-2 text-gray-600"><Bath className="w-5 h-5 text-blue-500" /> {property.bathrooms} banheiros</div>
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Sobre o imóvel</h2>
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              </div>

              {property.amenities.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">Comodidades</h2>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((a) => (
                      <span key={a} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                        <Wifi className="w-3 h-3" /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Anunciado por <span className="font-medium text-gray-800">{property.owner.name}</span></p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  Avaliações
                  {avgRating && (
                    <span className="flex items-center gap-1 text-sm text-yellow-500">
                      <Star className="w-4 h-4 fill-yellow-400" /> {avgRating} ({reviews.length})
                    </span>
                  )}
                </h2>

                {reviews.length === 0 ? (
                  <p className="text-sm text-gray-400 mb-4">Este imóvel ainda não tem avaliações.</p>
                ) : (
                  <div className="space-y-4 mb-6">
                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800 text-sm">{r.author.name}</span>
                          <span className="flex items-center gap-0.5 text-yellow-500 text-sm">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400" />
                            ))}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {user && user.id !== property.owner.id && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <h3 className="font-medium text-gray-800 text-sm mb-3">Deixe sua avaliação</h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className="p-0.5"
                          aria-label={`${n} estrelas`}
                        >
                          <Star className={`w-6 h-6 ${n <= rating ? "fill-yellow-400 text-yellow-500" : "text-gray-300"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte como foi sua experiência..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    />
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {submittingReview ? "Enviando..." : "Enviar avaliação"}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Você só pode avaliar imóveis que já reservou.</p>
                  </div>
                )}
              </div>

              {user?.id === property.owner.id && (
                <button onClick={handleDelete} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm mt-2">
                  <Trash2 className="w-4 h-4" /> Remover anúncio
                </button>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
                <div className="mb-4">
                  <span className="text-2xl font-bold text-blue-600">R$ {property.pricePerNight.toFixed(2)}</span>
                  <span className="text-gray-400"> / noite</span>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Check-in</label>
                    <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Check-out</label>
                    <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {nights > 0 && (
                  <div className="border-t border-gray-100 py-3 mb-4 text-sm text-gray-600 flex justify-between">
                    <span>R$ {property.pricePerNight.toFixed(2)} × {nights} noites</span>
                    <span className="font-bold text-gray-900">R$ {(property.pricePerNight * nights).toFixed(2)}</span>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all disabled:opacity-50"
                >
                  {booking ? "Reservando..." : user ? "Reservar agora" : "Entrar para reservar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
