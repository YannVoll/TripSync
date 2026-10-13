import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Página não encontrada.</p>
        <Link to="/" className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Voltar ao início</Link>
      </div>
    </div>
  );
}
