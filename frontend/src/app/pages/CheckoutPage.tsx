import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CreditCard, QrCode, FileText, CheckCircle, XCircle, Copy, ArrowLeft, Lock } from "lucide-react";
import Header from "../components/Header";
import api from "../../lib/axios";
import { toast } from "sonner";

interface Booking {
  id: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  paymentStatus: string;
  property: { title: string; city: string };
}

type Method = "credit_card" | "pix" | "boleto";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<Method>("credit_card");
  const [step, setStep] = useState<"payment" | "success" | "failed">("payment");
  const [pixCode, setPixCode] = useState("");
  const [boletoCode, setBoletoCode] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  useEffect(() => {
    api.get(`/payments/booking/${bookingId}`).then((res) => {
      if (res.data.paymentStatus === "PAID") {
        toast.success("Esta reserva já está paga!");
        navigate("/dashboard");
        return;
      }
      setBooking(res.data);
    }).catch(() => {
      toast.error("Reserva não encontrada.");
      navigate("/dashboard");
    }).finally(() => setLoading(false));
  }, [bookingId]);

  const nights = booking
    ? Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)
    : 0;

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (v: string) =>
    v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

  const handlePay = async () => {
    if (method === "credit_card") {
      if (!card.number || !card.name || !card.expiry || !card.cvv) {
        toast.error("Preencha todos os dados do cartão.");
        return;
      }
    }
    setProcessing(true);
    try {
      const res = await api.post("/payments/process", {
        bookingId,
        method,
        cardData: method === "credit_card" ? card : undefined,
      });
      setSuccessMsg(res.data.message);
      if (res.data.pixCode) setPixCode(res.data.pixCode);
      if (res.data.boletoCode) setBoletoCode(res.data.boletoCode);
      setStep("success");
    } catch (err: any) {
      if (err.response?.status === 402) {
        setStep("failed");
        toast.error(err.response.data.error);
      } else {
        toast.error("Erro ao processar pagamento.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar ao painel
          </Link>

          {booking && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">Resumo da reserva</h2>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{booking.property.title}</span>
                <span>{booking.property.city}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-3">
                <span>{new Date(booking.checkIn).toLocaleDateString("pt-BR")} → {new Date(booking.checkOut).toLocaleDateString("pt-BR")}</span>
                <span>{nights} noite{nights > 1 ? "s" : ""}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-blue-600">R$ {booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-500">Pagamento seguro e simulado</span>
              </div>

              <h2 className="font-semibold text-gray-900 mb-4">Escolha a forma de pagamento</h2>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {([
                  { id: "credit_card" as Method, icon: CreditCard, label: "Cartão" },
                  { id: "pix" as Method, icon: QrCode, label: "PIX" },
                  { id: "boleto" as Method, icon: FileText, label: "Boleto" },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      method === id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {method === "credit_card" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número do cartão</label>
                    <input
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome no cartão</label>
                    <input
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="NOME COMPLETO"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                      <input
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="000"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">💡 Para simular recusa, use um cartão terminado em 0000.</p>
                </div>
              )}

              {method === "pix" && (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <QrCode className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800 font-medium">QR Code PIX será gerado após confirmar</p>
                  <p className="text-xs text-green-600 mt-1">Válido por 30 minutos após a geração</p>
                </div>
              )}

              {method === "boleto" && (
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <FileText className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                  <p className="text-sm text-orange-800 font-medium">Boleto será gerado após confirmar</p>
                  <p className="text-xs text-orange-600 mt-1">Vencimento em 3 dias úteis</p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all disabled:opacity-50 text-lg"
              >
                {processing ? "Processando..." : `Pagar R$ ${booking?.totalPrice.toFixed(2)}`}
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {method === "credit_card" ? "Pagamento aprovado!" : method === "pix" ? "PIX gerado!" : "Boleto gerado!"}
              </h2>
              <p className="text-gray-500 mb-6">{successMsg}</p>

              {pixCode && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs font-medium text-gray-600 mb-2">Código PIX Copia e Cola:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-700 break-all flex-1">{pixCode}</code>
                    <button onClick={() => copy(pixCode)} className="flex-shrink-0 p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {boletoCode && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs font-medium text-gray-600 mb-2">Linha digitável do boleto:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-700 break-all flex-1">{boletoCode}</code>
                    <button onClick={() => copy(boletoCode)} className="flex-shrink-0 p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <Link to="/dashboard" className="inline-block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all">
                Ver minhas reservas
              </Link>
            </div>
          )}

          {step === "failed" && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento recusado</h2>
              <p className="text-gray-500 mb-6">Verifique os dados do cartão e tente novamente.</p>
              <button
                onClick={() => setStep("payment")}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}