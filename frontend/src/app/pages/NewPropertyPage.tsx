import { Home, ArrowLeft, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import api from "../../lib/axios";
import { toast } from "sonner";

export default function NewPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "HOUSE",
    address: "",
    city: "",
    state: "",
    pricePerNight: "",
    maxGuests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: "",
    imageUrl: "",
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      set("imageUrl", result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        pricePerNight: parseFloat(form.pricePerNight),
        maxGuests: parseInt(form.maxGuests),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
        amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await api.post("/properties", payload);
      toast.success("Imóvel cadastrado com sucesso!");
      navigate(`/properties/${res.data.id}`);
    } catch {
      toast.error("Erro ao cadastrar imóvel.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Você precisa estar logado para anunciar um imóvel.</p>
          <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Entrar</Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <Link to="/properties" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar para acomodações
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Anunciar imóvel</h1>
              <p className="text-gray-500 text-sm">Preencha as informações do seu hotel ou casa</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
            <div>
              <label className={labelCls}>Tipo de imóvel *</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls} required>
                <option value="HOTEL">Hotel</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
                <option value="POUSADA">Pousada</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Título do anúncio *</label>
              <input type="text" required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="Ex: Casa aconchegante com vista para o mar" />
            </div>

            <div>
              <label className={labelCls}>Descrição *</label>
              <textarea required value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className={inputCls} placeholder="Descreva seu imóvel, diferenciais, regras..." />
            </div>

            <div>
              <label className={labelCls}>Endereço *</label>
              <input type="text" required value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} placeholder="Rua, número, bairro" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cidade *</label>
                <input type="text" required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} placeholder="Ex: Florianópolis" />
              </div>
              <div>
                <label className={labelCls}>Estado *</label>
                <input type="text" required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className={inputCls} placeholder="SC" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Preço / noite (R$) *</label>
                <input type="number" required min="1" step="0.01" value={form.pricePerNight} onChange={(e) => set("pricePerNight", e.target.value)} className={inputCls} placeholder="250.00" />
              </div>
              <div>
                <label className={labelCls}>Máx. hóspedes *</label>
                <input type="number" required min="1" value={form.maxGuests} onChange={(e) => set("maxGuests", e.target.value)} className={inputCls} placeholder="6" />
              </div>
              <div>
                <label className={labelCls}>Quartos *</label>
                <input type="number" required min="1" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={inputCls} placeholder="3" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Banheiros *</label>
              <input type="number" required min="1" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className={inputCls} placeholder="2" />
            </div>

            <div>
              <label className={labelCls}>Foto do imóvel (opcional)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(""); set("imageUrl", ""); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600"
                    >✕</button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 py-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Clique para selecionar uma imagem</span>
                    <span className="text-xs text-gray-400">PNG, JPG até 5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Comodidades (separadas por vírgula)</label>
              <input type="text" value={form.amenities} onChange={(e) => set("amenities", e.target.value)} className={inputCls} placeholder="Wi-Fi, Piscina, Estacionamento, Ar-condicionado" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all disabled:opacity-50 text-lg"
            >
              {loading ? "Publicando anúncio..." : "Publicar anúncio"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}