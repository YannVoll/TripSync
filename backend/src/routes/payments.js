const crypto = require("crypto");
const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");

// POST /api/payments/process
router.post("/process", auth, async (req, res) => {
  try {
    const { bookingId, method, cardData } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { property: { select: { title: true } } },
    });

    if (!booking) return res.status(404).json({ error: "Reserva não encontrada." });
    if (booking.guestId !== req.userId) return res.status(403).json({ error: "Sem permissão." });
    if (booking.paymentStatus === "PAID") return res.status(400).json({ error: "Reserva já paga." });

    await new Promise((r) => setTimeout(r, 1500));

    if (method === "credit_card" && cardData?.number?.replace(/\s/g, "").endsWith("0000")) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "FAILED" },
      });
      return res.status(402).json({ error: "Pagamento recusado. Verifique os dados do cartão." });
    }

    let paymentData = {};
    let pixCode = null;
    let boletoCode = null;

    if (method === "pix") {
      pixCode = `00020126580014BR.GOV.BCB.PIX0136${crypto.randomUUID()}520400005303986540${booking.totalPrice.toFixed(2).replace(".", "")}5802BR5924TRIPSYNC6009SAO PAULO62070503***6304`;
      paymentData = { pixCode, expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
    } else if (method === "boleto") {
      boletoCode = `23793.38128 60007.827136 95000.063305 1 ${Math.floor(Date.now() / 1000)}`;
      paymentData = { boletoCode, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) };
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentMethod: method,
        paymentStatus: method === "credit_card" ? "PAID" : "PENDING",
        status: method === "credit_card" ? "CONFIRMED" : "PENDING",
        paymentData,
      },
    });

    res.json({
      success: true,
      booking: updated,
      pixCode,
      boletoCode,
      message:
        method === "credit_card"
          ? "Pagamento aprovado! Reserva confirmada."
          : method === "pix"
          ? "PIX gerado! Pague em até 30 minutos."
          : "Boleto gerado! Vence em 3 dias úteis.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao processar pagamento." });
  }
});

// GET /api/payments/booking/:id
router.get("/booking/:id", auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { property: { select: { title: true, city: true } } },
    });
    if (!booking) return res.status(404).json({ error: "Reserva não encontrada." });
    if (booking.guestId !== req.userId) return res.status(403).json({ error: "Sem permissão." });
    res.json(booking);
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;