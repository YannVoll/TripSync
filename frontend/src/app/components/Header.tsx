import { Plane, Menu, X, User, LogOut, Plus, Home } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              TripSync
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/properties" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" /> Acomodações
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Meu Painel
                </Link>
                <Link to="/properties/new" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Anunciar
                </Link>
              </>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-medium">Olá, {user.name.split(" ")[0]}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300">
                  <User className="w-4 h-4" /> Entrar
                </Link>
                <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all">
                  Cadastrar
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-6 space-y-4">
          <Link to="/properties" className="block text-gray-700 hover:text-blue-600 py-2" onClick={() => setMobileMenuOpen(false)}>
            Acomodações
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block text-gray-700 hover:text-blue-600 py-2" onClick={() => setMobileMenuOpen(false)}>Meu Painel</Link>
              <Link to="/properties/new" className="block text-blue-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>+ Anunciar imóvel</Link>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block w-full text-left text-red-500 py-2">Sair</button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link to="/login" className="block w-full text-center border border-gray-200 rounded-lg py-2 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Entrar</Link>
              <Link to="/signup" className="block w-full text-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg py-2" onClick={() => setMobileMenuOpen(false)}>Cadastrar</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
