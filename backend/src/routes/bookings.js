const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");


router.get("/my", auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { guestId: req.userId, status: { not: "CANCELLED" } },
      include: { property: { select: { id: true, title: true, city: true } } },
      orderBy: { checkIn: "asc" },
    });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});


router.post("/", auth, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.body;
    if (!propertyId || !checkIn || !checkOut)
      return res.status(400).json({ error: "Preencha todos os campos." });

    const property = await prisma.property.findUnique({ where: { id: parseInt(propertyId) } });
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });
    if (property.ownerId === req.userId)
      return res.status(400).json({ error: "Você não pode reservar seu próprio imóvel." });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.round((checkOutDate - checkInDate) / 86400000);
    if (nights <= 0) return res.status(400).json({ error: "Datas inválidas." });


    const conflict = await prisma.booking.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        status: { not: "CANCELLED" },
        OR: [
          { checkIn: { lt: checkOutDate }, checkOut: { gt: checkInDate } },
        ],
      },
    });
    if (conflict) return res.status(409).json({ error: "Datas indisponíveis." });

    const booking = await prisma.booking.create({
      data: {
        propertyId: parseInt(propertyId),
        guestId: req.userId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: property.pricePerNight * nights,
      },
      include: { property: { select: { id: true, title: true, city: true } } },
    });
    res.status(201).json(booking);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});


router.delete("/:id", auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!booking) return res.status(404).json({ error: "Reserva não encontrada." });
    if (booking.guestId !== req.userId) return res.status(403).json({ error: "Sem permissão." });

    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    res.json({ message: "Reserva cancelada." });
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;
