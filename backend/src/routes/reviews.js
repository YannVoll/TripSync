const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");

// GET /api/reviews/property/:id — avaliações de um imóvel (público)
router.get("/property/:id", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { propertyId: parseInt(req.params.id) },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/reviews — criar avaliação (auth)
router.post("/", auth, async (req, res) => {
  try {
    const { propertyId, rating, comment } = req.body;

    if (!propertyId || !rating || !comment)
      return res.status(400).json({ error: "Preencha nota e comentário." });

    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5)
      return res.status(400).json({ error: "A nota deve ser entre 1 e 5." });

    const property = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) },
    });
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });

    if (property.ownerId === req.userId)
      return res.status(400).json({ error: "Você não pode avaliar o próprio imóvel." });

    // Só permite avaliar quem já reservou o imóvel
    const hasBooking = await prisma.booking.findFirst({
      where: {
        propertyId: property.id,
        guestId: req.userId,
        status: { not: "CANCELLED" },
      },
    });
    if (!hasBooking)
      return res
        .status(403)
        .json({ error: "Você só pode avaliar imóveis que reservou." });

    // Evita avaliação duplicada do mesmo usuário no mesmo imóvel
    const existing = await prisma.review.findFirst({
      where: { propertyId: property.id, authorId: req.userId },
    });
    if (existing)
      return res.status(409).json({ error: "Você já avaliou este imóvel." });

    const review = await prisma.review.create({
      data: {
        rating: numericRating,
        comment,
        propertyId: property.id,
        authorId: req.userId,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    res.status(201).json(review);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

// DELETE /api/reviews/:id — remover avaliação própria (auth)
router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!review) return res.status(404).json({ error: "Avaliação não encontrada." });
    if (review.authorId !== req.userId)
      return res.status(403).json({ error: "Sem permissão." });

    await prisma.review.delete({ where: { id: review.id } });
    res.json({ message: "Avaliação removida." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;
