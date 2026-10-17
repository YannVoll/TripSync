import { Link } from "react-router-dom";
import { Search, Star, Shield, Home, Plane } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  const features = [
    { icon: Search, title: "Encontre o ideal", desc: "Busque entre centenas de acomodações únicas." },
    { icon: Shield, title: "Segurança total", desc: "Pagamentos e reservas protegidos pela plataforma." },
    { icon: Star, title: "Avaliações reais", desc: "Hospedagens avaliadas por viajantes reais." },
    { icon: Home, title: "Anuncie grátis", desc: "Cadastre seu imóvel e comece a receber hóspedes." },
  ];

  return (
    <>
      <Header />
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Plane className="w-4 h-4" /> A nova forma de viajar
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Viaje com{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              TripSync
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Encontre hotéis e casas únicas pelo Brasil. Ou anuncie o seu imóvel e receba viajantes do mundo inteiro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/properties"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg shadow-blue-200"
            >
              Explorar Acomodações
            </Link>
            <Link
              to="/properties/new"
              className="px-8 py-4 border-2 border-blue-200 text-blue-700 font-semibold rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              Anunciar meu imóvel
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Por que escolher a TripSync?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Tem um imóvel para alugar?</h2>
          <p className="text-blue-100 mb-8">Cadastre seu hotel ou casa e comece a receber hóspedes hoje mesmo. É gratuito!</p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          >
            Criar conta e anunciar
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
