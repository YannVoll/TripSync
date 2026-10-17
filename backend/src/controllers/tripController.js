const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const tripInclude = {
  owner: { select: { id: true, name: true, email: true } },
  collaborators: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  activities: {
    include: {
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { startTime: "asc" },
  },
  checklist: { include: { items: { orderBy: { category: "asc" } } } },
  history: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  },
};

async function findTripAccess(tripId, userId) {
  const id = Number(tripId);
  if (!Number.isInteger(id) || id < 1) return null;
  return prisma.trip.findUnique({
    where: { id },
    include: { collaborators: { where: { userId }, select: { role: true } } },
  });
}

function canReadTrip(trip, userId) {
  return trip.ownerId === userId || trip.collaborators.length > 0;
}

exports.createTrip = async (req, res) => {
  try {
    const { title, description, destination, tripType, startDate, endDate } = req.body;
    const userId = req.userId;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !startDate ||
      !endDate
    ) {
      return res
        .status(400)
        .json({ error: "Título, data de início e fim são obrigatórios" });
    }
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({ error: "Informe um período válido para a viagem" });
    }

    const trip = await prisma.trip.create({
      data: {
        title: title.trim(),
        description,
        destination: typeof destination === "string" && destination.trim() ? destination.trim() : null,
        tripType: tripType || "CUSTOM",
        startDate: start,
        endDate: end,
        ownerId: userId,
      },
      include: {
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    await prisma.tripHistory.create({
      data: {
        tripId: trip.id,
        userId,
        action: "TRIP_CREATED",
        details: { title: trip.title, tripType: trip.tripType },
      },
    });
    res.status(201).json(trip);
  } catch (error) {
    console.error("Erro ao criar viagem:", error);
    res.status(500).json({ error: "Erro ao criar viagem" });
  }
};

exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.userId;
    const trips = await prisma.trip.findMany({
      where: {
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        activities: { select: { id: true, title: true, startTime: true } },
        checklist: { select: { id: true, items: { select: { id: true } } } },
      },
      orderBy: { startDate: "asc" },
    });
    res.json(trips);
  } catch (error) {
    console.error("Erro ao listar viagens:", error);
    res.status(500).json({ error: "Erro ao listar viagens" });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const userId = req.userId;
    const trip = await prisma.trip.findUnique({
      where: { id: Number(req.params.tripId) },
      include: tripInclude,
    });
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (trip.ownerId !== userId && !trip.collaborators.some((c) => c.userId === userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    res.json(trip);
  } catch (error) {
    console.error("Erro ao obter viagem:", error);
    res.status(500).json({ error: "Erro ao obter viagem" });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (trip.ownerId !== userId) {
      return res.status(403).json({ error: "Apenas o proprietário pode atualizar a viagem" });
    }

    const startDate = req.body.startDate ? new Date(req.body.startDate) : trip.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : trip.endDate;
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({ error: "Informe um período válido para a viagem" });
    }
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        title: req.body.title?.trim() || trip.title,
        description: req.body.description !== undefined ? req.body.description : trip.description,
        destination:
          req.body.destination !== undefined
            ? req.body.destination?.trim() || null
            : trip.destination,
        tripType: req.body.tripType || trip.tripType,
        startDate,
        endDate,
      },
      include: {
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId,
        action: "TRIP_UPDATED",
        details: { updatedFields: req.body },
      },
    });
    res.json(updatedTrip);
  } catch (error) {
    console.error("Erro ao atualizar viagem:", error);
    res.status(500).json({ error: "Erro ao atualizar viagem" });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (trip.ownerId !== req.userId) {
      return res.status(403).json({ error: "Apenas o proprietário pode excluir a viagem" });
    }
    await prisma.trip.delete({ where: { id: tripId } });
    res.json({ message: "Viagem deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar viagem:", error);
    res.status(500).json({ error: "Erro ao deletar viagem" });
  }
};

exports.inviteCollaborator = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const requestedEmail = req.body.email;
    const role = req.body.role || "COLLABORATOR";
    if (typeof requestedEmail !== "string" || !requestedEmail.trim()) {
      return res.status(400).json({ error: "Informe o e-mail do colaborador" });
    }
    if (!["COLLABORATOR", "VIEWER"].includes(role)) {
      return res.status(400).json({ error: "Papel de colaborador inválido" });
    }
    const email = requestedEmail.trim().toLowerCase();
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (trip.ownerId !== userId) {
      return res.status(403).json({ error: "Apenas o proprietário pode convidar colaboradores" });
    }
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ error: "Não existe uma conta TripSync com este e-mail" });
    }
    if (invitedUser.id === userId) {
      return res.status(400).json({ error: "Você já é o proprietário desta viagem" });
    }
    const existing = await prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId, userId: invitedUser.id } },
    });
    if (existing) {
      return res.status(409).json({ error: "Este usuário já participa desta viagem" });
    }
    const collaborator = await prisma.tripCollaborator.create({
      data: { tripId, userId: invitedUser.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId,
        action: "COLLABORATOR_ADDED",
        details: { collaboratorId: invitedUser.id, email, role },
      },
    });
    res.status(201).json(collaborator);
  } catch (error) {
    console.error("Erro ao convidar colaborador:", error);
    res.status(500).json({ error: "Erro ao convidar colaborador" });
  }
};

exports.listCollaborators = async (req, res) => {
  try {
    const trip = await findTripAccess(req.params.tripId, req.userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canReadTrip(trip, req.userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    const collaborators = await prisma.tripCollaborator.findMany({
      where: { tripId: Number(req.params.tripId) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(collaborators);
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    res.status(500).json({ error: "Erro ao listar colaboradores" });
  }
};

exports.removeCollaborator = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const targetUserId = Number(req.params.collaboratorId);
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (trip.ownerId !== req.userId) {
      return res.status(403).json({ error: "Apenas o proprietário pode remover colaboradores" });
    }
    const collaborator = await prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId, userId: targetUserId } },
    });
    if (!collaborator) {
      return res.status(404).json({ error: "Colaborador não encontrado nesta viagem" });
    }
    await prisma.tripCollaborator.delete({
      where: { tripId_userId: { tripId, userId: targetUserId } },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId: req.userId,
        action: "COLLABORATOR_REMOVED",
        details: { removedUserId: targetUserId },
      },
    });
    res.json({ message: "Colaborador removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    res.status(500).json({ error: "Erro ao remover colaborador" });
  }
};

exports.getTripHistory = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const trip = await findTripAccess(tripId, req.userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canReadTrip(trip, req.userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    const history = await prisma.tripHistory.findMany({
      where: { tripId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(history);
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    res.status(500).json({ error: "Erro ao obter histórico" });
  }
};
