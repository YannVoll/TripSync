const prisma = require("../prisma");
const { withRating } = require("../lib/ratings");

const propertyInclude = {
  owner: { select: { id: true, name: true } },
  reviews: { select: { rating: true } },
};

function cityFromDestination(destination) {
  return destination.split(/[,\-–]/)[0].trim();
}

const getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);

    const upcomingTrips = await prisma.trip.findMany({
      where: {
        endDate: { gte: new Date() },
        destination: { not: null },
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      select: { id: true, title: true, destination: true, startDate: true },
      orderBy: { startDate: "asc" },
    });

    const seen = new Set();
    const items = [];

    for (const trip of upcomingTrips) {
      const city = cityFromDestination(trip.destination);
      if (!city) continue;
      const properties = await prisma.property.findMany({
        where: {
          active: true,
          ownerId: { not: userId },
          city: { contains: city, mode: "insensitive" },
        },
        include: propertyInclude,
        take: limit,
      });
      for (const property of properties) {
        if (seen.has(property.id)) continue;
        seen.add(property.id);
        items.push({
          ...withRating(property),
          reason: "trip",
          trip: { id: trip.id, title: trip.title, startDate: trip.startDate },
        });
      }
    }

    if (items.length < limit) {
      const popular = await prisma.property.findMany({
        where: { active: true, ownerId: { not: userId }, id: { notIn: [...seen] } },
        include: propertyInclude,
      });
      popular
        .map(withRating)
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.reviewCount - a.reviewCount)
        .slice(0, limit - items.length)
        .forEach((property) => items.push({ ...property, reason: "popular" }));
    }

    res.json({
      destinations: [...new Set(upcomingTrips.map((trip) => trip.destination))],
      items: items.slice(0, limit),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar recomendações" });
  }
};

module.exports = { getRecommendations };
