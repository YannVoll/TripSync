import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plane, Sparkles, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../../lib/axios";

interface RecommendedProperty {
  id: number;
  title: string;
  type: string;
  city: string;
  state: string;
  pricePerNight: number;
  imageUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  reason: "trip" | "popular";
  trip?: { id: number; title: string; startDate: string };
}

interface RecommendationResponse {
  destinations: string[];
  items: RecommendedProperty[];
}

function PropertyCard({ property }: { property: RecommendedProperty }) {
  return (
    <Link
      to={`/properties/${property.id}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-blue-300">
            <MapPin className="h-14 w-14" />
          </div>
        )}
        {property.reason === "trip" && property.trip ? (
          <span className="absolute left-3 top-3 inline-flex max-w-[85%] items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
            <Plane className="h-3 w-3 shrink-0" />
            <span className="truncate">Para “{property.trip.title}”</span>
          </span>
        ) : (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700">
            <TrendingUp className="h-3 w-3" /> Bem avaliado
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-gray-900">{property.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-4 w-4" /> {property.city}, {property.state}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p>
            <span className="text-lg font-bold text-blue-600">R$ {property.pricePerNight.toFixed(2)}</span>
            <span className="text-sm text-gray-400"> / noite</span>
          </p>
          {property.avgRating != null ? (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {property.avgRating.toFixed(1)} ({property.reviewCount})
            </span>
          ) : (
            <span className="text-sm text-gray-400">Novo</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RecommendationResponse>("/recommendations/suggest", { params: { limit: 9 } })
      .then((res) => setData(res.data))
      .catch((error) => toast.error(getErrorMessage(error, "Não foi possível carregar as recomendações.")))
      .finally(() => setLoading(false));
  }, []);

  const forTrips = data?.items.filter((item) => item.reason === "trip") ?? [];
  const popular = data?.items.filter((item) => item.reason === "popular") ?? [];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pb-16 pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Recomendações para você</h1>
              <p className="mt-1 text-sm text-gray-500">
                {data?.destinations.length
                  ? `Hospedagens para os seus próximos destinos: ${data.destinations.join(", ")}.`
                  : "Defina o destino das suas viagens para receber sugestões de hospedagem."}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <p className="font-medium text-gray-700">Ainda não há hospedagens para recomendar.</p>
              <Link to="/trips" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
                Planejar uma viagem →
              </Link>
            </section>
          ) : (
            <div className="space-y-10">
              {forTrips.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Nos destinos das suas viagens</h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {forTrips.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </section>
              )}
              {popular.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    {forTrips.length ? "Outras hospedagens bem avaliadas" : "Hospedagens bem avaliadas"}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {popular.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
