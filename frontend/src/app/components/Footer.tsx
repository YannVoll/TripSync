import { Plane } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">TripSync</span>
            </div>
            <p className="text-sm text-gray-400">Sua plataforma de hospedagem para viagens inesquecíveis.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Descobrir</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/properties" className="hover:text-white transition-colors">Acomodações</Link></li>
              <li><Link to="/properties/new" className="hover:text-white transition-colors">Anunciar imóvel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Conta</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Entrar</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Criar conta</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Painel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-400">contato@tripsync.com.br</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} TripSync. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
