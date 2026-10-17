import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Search, Filter } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../../lib/axios";

interface Property {
  id: number;
  title: string;
  type: string;
  city: string;
  state: string;
  pricePerNight: number;
  maxGuests: number;
  imageUrl: string | null;
  owner: { name: string };

  avgRating?: number | null;
  reviewCount?: number;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    api.get("/properties", { params: { search, type } }).then((res) => {
      setProperties(res.data);
    }).finally(() => setLoading(false));
  }, [search, type]);

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cidade ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos os tipos</option>
                <option value="HOTEL">Hotel</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
                <option value="POUSADA">Pousada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">Nenhuma acomodação encontrada.</p>
              <Link to="/properties/new" className="mt-4 inline-block text-blue-600 hover:underline">Seja o primeiro a anunciar!</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <Link key={p.id} to={`/properties/${p.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 relative overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-300">
                        <MapPin className="w-16 h-16" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                      {p.type === "HOTEL" ? "Hotel" : p.type === "HOUSE" ? "Casa" : p.type === "APARTMENT" ? "Apto" : "Pousada"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">{p.title}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      {p.city}, {p.state}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-blue-600 font-bold text-lg">R$ {p.pricePerNight.toFixed(2)}</span>
                        <span className="text-gray-400 text-sm"> / noite</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {p.avgRating != null ? (
                          <>
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{p.avgRating.toFixed(1)} ({p.reviewCount})</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Novo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );

}
