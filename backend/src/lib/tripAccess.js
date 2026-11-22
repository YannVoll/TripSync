const prisma = require("../prisma");

const TRIP_TYPES = [
  "BEACH",
  "CITY_TOUR",
  "FLIGHT",
  "MOUNTAIN",
  "BUSINESS",
  "BACKPACKING",
  "TREKKING",
  "CUSTOM",
];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getTripAccess(tripId, userId) {
  const id = parseId(tripId);
  if (!id) return null;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { collaborators: { where: { userId }, select: { role: true } } },
  });
  if (!trip) return null;
  const role = trip.ownerId === userId ? "OWNER" : trip.collaborators[0]?.role ?? null;
  return {
    trip,
    role,
    isOwner: role === "OWNER",
    canRead: role !== null,
    canEdit: role === "OWNER" || role === "COLLABORATOR",
  };
}

function loadTrip(permission) {
  return async (req, res, next) => {
    try {
      const access = await getTripAccess(req.params.tripId, req.userId);
      if (!access) return res.status(404).json({ error: "Viagem não encontrada" });
      if (!access[permission]) {
        return res.status(403).json({ error: "Você não tem permissão para esta ação nesta viagem" });
      }
      req.trip = access.trip;
      req.tripAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  TRIP_TYPES,
  parseId,
  getTripAccess,
  canReadTrip: loadTrip("canRead"),
  canEditTrip: loadTrip("canEdit"),
  ownsTrip: loadTrip("isOwner"),
};
