const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");
const { parseId } = require("../lib/tripAccess");

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

router.get("/my", auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { guestId: req.userId, status: { not: "CANCELLED" } },
      include: { property: { select: { id: true, title: true, city: true } } },
      orderBy: { checkIn: "asc" },
    });
    res.json(bookings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { checkIn, checkOut } = req.body;
    const propertyId = parseId(req.body.propertyId);
    if (!propertyId || !checkIn || !checkOut)
      return res.status(400).json({ error: "Preencha todos os campos." });

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !property.active) return res.status(404).json({ error: "Imóvel não encontrado." });
    if (property.ownerId === req.userId)
      return res.status(400).json({ error: "Você não pode reservar seu próprio imóvel." });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()))
      return res.status(400).json({ error: "Datas inválidas." });
    if (checkInDate < startOfToday())
      return res.status(400).json({ error: "O check-in não pode ser no passado." });
    const nights = Math.round((checkOutDate - checkInDate) / 86400000);
    if (nights <= 0) return res.status(400).json({ error: "O check-out deve ser depois do check-in." });

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          propertyId,
          status: { not: "CANCELLED" },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      });
      if (conflict) return null;
      return tx.booking.create({
        data: {
          propertyId,
          guestId: req.userId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalPrice: property.pricePerNight * nights,
        },
        include: { property: { select: { id: true, title: true, city: true } } },
      });
    }, { isolationLevel: "Serializable" });

    if (!booking) return res.status(409).json({ error: "Datas indisponíveis." });
    res.status(201).json(booking);
  } catch (e) {
    if (e.code === "P2034") return res.status(409).json({ error: "Datas indisponíveis." });
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const booking = id ? await prisma.booking.findUnique({ where: { id } }) : null;
    if (!booking) return res.status(404).json({ error: "Reserva não encontrada." });
    if (booking.guestId !== req.userId) return res.status(403).json({ error: "Sem permissão." });
    if (booking.status === "CANCELLED") return res.status(400).json({ error: "Reserva já cancelada." });

    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    res.json({ message: "Reserva cancelada." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;
