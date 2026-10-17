const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");

router.get("/", async (req, res) => {
  try {
    const { search, type } = req.query;
    const where = { active: true };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
      ];
    }
    const properties = await prisma.property.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      properties.map(({ reviews, ...property }) => ({
        ...property,
        avgRating:
          reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : null,
        reviewCount: reviews.length,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/my", auth, async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(properties);
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        reviews: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });
    res.json(property);
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { title, description, type, address, city, state, pricePerNight, maxGuests, bedrooms, bathrooms, amenities, imageUrl } = req.body;
    if (!title || !description || !address || !city || !state || !pricePerNight || !maxGuests || !bedrooms || !bathrooms) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }
    const property = await prisma.property.create({
      data: {
        title,
        description,
        type: type || "HOUSE",
        address,
        city,
        state,
        pricePerNight: parseFloat(pricePerNight),
        maxGuests: parseInt(maxGuests),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        amenities: amenities || [],
        imageUrl: imageUrl || null,
        ownerId: req.userId,
      },
    });
    res.status(201).json(property);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });
    if (property.ownerId !== req.userId) return res.status(403).json({ error: "Sem permissão." });

    const updated = await prisma.property.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const property = await prisma.property.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });
    if (property.ownerId !== req.userId) return res.status(403).json({ error: "Sem permissão." });

    await prisma.property.update({ where: { id: parseInt(req.params.id) }, data: { active: false } });
    res.json({ message: "Imóvel removido." });
  } catch (e) {
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;