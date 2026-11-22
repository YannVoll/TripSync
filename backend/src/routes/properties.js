const router = require("express").Router();
const auth = require("../middleware/auth");
const prisma = require("../prisma");
const { parseId } = require("../lib/tripAccess");
const { withRating } = require("../lib/ratings");
const { isUploadedFile, removeUploadedFile } = require("../lib/uploads");

const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "STUDIO", "VILLA", "TOWNHOUSE", "HOTEL", "POUSADA"];
const TEXT_FIELDS = ["title", "description", "address", "city", "state"];
const NUMBER_FIELDS = {
  pricePerNight: { parse: parseFloat, min: 1, label: "Preço por noite" },
  maxGuests: { parse: (v) => parseInt(v, 10), min: 1, label: "Hóspedes" },
  bedrooms: { parse: (v) => parseInt(v, 10), min: 0, label: "Quartos" },
  bathrooms: { parse: (v) => parseInt(v, 10), min: 0, label: "Banheiros" },
};

function buildPropertyData(body, { partial }) {
  const data = {};

  for (const field of TEXT_FIELDS) {
    if (body[field] === undefined && partial) continue;
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value) return { error: "Preencha todos os campos obrigatórios." };
    data[field] = value;
  }

  for (const [field, { parse, min, label }] of Object.entries(NUMBER_FIELDS)) {
    if (body[field] === undefined && partial) continue;
    const value = parse(body[field]);
    if (!Number.isFinite(value) || value < min) {
      return { error: `${label} inválido.` };
    }
    data[field] = value;
  }

  if (body.type !== undefined || !partial) {
    const type = body.type || "HOUSE";
    if (!PROPERTY_TYPES.includes(type)) return { error: "Tipo de imóvel inválido." };
    data.type = type;
  }

  if (body.amenities !== undefined || !partial) {
    const amenities = Array.isArray(body.amenities) ? body.amenities : [];
    data.amenities = amenities
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  }

  if (body.imageUrl !== undefined || !partial) {
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (imageUrl && !isUploadedFile(imageUrl) && !/^https?:\/\//.test(imageUrl)) {
      return { error: "Imagem inválida. Envie a foto pelo formulário." };
    }
    data.imageUrl = imageUrl || null;
  }

  return { data };
}

router.get("/", async (req, res) => {
  try {
    const { search, type } = req.query;
    const where = { active: true };
    if (type && PROPERTY_TYPES.includes(type)) where.type = type;
    if (typeof search === "string" && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { state: { contains: term, mode: "insensitive" } },
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
    res.json(properties.map(withRating));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/my", auth, async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { ownerId: req.userId, active: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(properties);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const property = id
      ? await prisma.property.findUnique({
          where: { id },
          include: {
            owner: { select: { id: true, name: true } },
            reviews: {
              include: { author: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        })
      : null;
    if (!property) return res.status(404).json({ error: "Imóvel não encontrado." });
    res.json(property);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { data, error } = buildPropertyData(req.body, { partial: false });
    if (error) return res.status(400).json({ error });
    const property = await prisma.property.create({
      data: { ...data, ownerId: req.userId },
    });
    res.status(201).json(property);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

async function findOwnedProperty(req, res) {
  const id = parseId(req.params.id);
  const property = id ? await prisma.property.findUnique({ where: { id } }) : null;
  if (!property || !property.active) {
    res.status(404).json({ error: "Imóvel não encontrado." });
    return null;
  }
  if (property.ownerId !== req.userId) {
    res.status(403).json({ error: "Sem permissão." });
    return null;
  }
  return property;
}

router.put("/:id", auth, async (req, res) => {
  try {
    const property = await findOwnedProperty(req, res);
    if (!property) return;
    const { data, error } = buildPropertyData(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    const updated = await prisma.property.update({ where: { id: property.id }, data });
    if (data.imageUrl !== undefined && data.imageUrl !== property.imageUrl) {
      removeUploadedFile(property.imageUrl);
    }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const property = await findOwnedProperty(req, res);
    if (!property) return;
    await prisma.property.update({ where: { id: property.id }, data: { active: false } });
    res.json({ message: "Imóvel removido." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;
