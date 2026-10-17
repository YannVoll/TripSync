const prisma = require("../prisma");

const getRecommendations = async (req, res) => {
  try {
    const { type, limit = 5 } = req.query;
    const userId = req.userId;

    const userTrips = await prisma.trip.findMany({
      where: { ownerId: userId },
      select: { tripType: true }
    });

    const tripTypeCounts = {};
    userTrips.forEach(trip => {
      tripTypeCounts[trip.tripType] = (tripTypeCounts[trip.tripType] || 0) + 1;
    });

    let recommendedTypes = Object.entries(tripTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    if (recommendedTypes.length === 0) {
      recommendedTypes = ["BEACH", "CITY_TOUR", "MOUNTAIN"];
    }

    const recommendations = await prisma.trip.findMany({
      where: {
        tripType: { in: recommendedTypes },
        ownerId: { not: userId }
      },
      include: {
        owner: { select: { name: true } },
        activities: { take: 3 }
      },
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    res.json({
      recommendedTypes,
      recommendations,
      message: `Recomendações baseadas no seu histórico de viagens`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar recomendações" });
  }
};

module.exports = { getRecommendations };
