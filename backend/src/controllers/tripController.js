const prisma = require("../prisma");
const { TRIP_TYPES, parseId } = require("../lib/tripAccess");

const userSelect = { select: { id: true, name: true, email: true } };

const tripInclude = {
  owner: userSelect,
  collaborators: { include: { user: userSelect } },
  activities: {
    include: {
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startTime: "asc" },
  },
  checklist: { include: { items: { orderBy: { id: "asc" } } } },
  history: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  },
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

function validPeriod(start, end) {
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
}

exports.createTrip = async (req, res) => {
  try {
    const { title, description, destination, tripType, startDate, endDate } = req.body;
    const userId = req.userId;

    if (typeof title !== "string" || !title.trim() || !startDate || !endDate) {
      return res.status(400).json({ error: "Título, data de início e fim são obrigatórios" });
    }
    if (tripType && !TRIP_TYPES.includes(tripType)) {
      return res.status(400).json({ error: "Tipo de viagem inválido" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!validPeriod(start, end)) {
      return res.status(400).json({ error: "Informe um período válido para a viagem" });
    }

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          title: title.trim(),
          description: cleanText(description),
          destination: cleanText(destination),
          tripType: tripType || "CUSTOM",
          startDate: start,
          endDate: end,
          ownerId: userId,
        },
        include: { collaborators: { include: { user: userSelect } } },
      });
      await tx.tripHistory.create({
        data: {
          tripId: created.id,
          userId,
          action: "TRIP_CREATED",
          details: { title: created.title, tripType: created.tripType },
        },
      });
      return created;
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
      where: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] },
      include: {
        owner: userSelect,
        collaborators: { include: { user: userSelect } },
        activities: { select: { id: true, title: true, startTime: true } },
        checklist: { select: { id: true, items: { select: { id: true, completed: true } } } },
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
    const trip = await prisma.trip.findUnique({
      where: { id: req.trip.id },
      include: tripInclude,
    });
    res.json({ ...trip, myRole: req.tripAccess.role });
  } catch (error) {
    console.error("Erro ao obter viagem:", error);
    res.status(500).json({ error: "Erro ao obter viagem" });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const { trip, userId } = req;
    const { title, description, destination, tripType, startDate, endDate } = req.body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({ error: "O título não pode ficar vazio" });
    }
    if (tripType !== undefined && !TRIP_TYPES.includes(tripType)) {
      return res.status(400).json({ error: "Tipo de viagem inválido" });
    }
    const start = startDate ? new Date(startDate) : trip.startDate;
    const end = endDate ? new Date(endDate) : trip.endDate;
    if (!validPeriod(start, end)) {
      return res.status(400).json({ error: "Informe um período válido para a viagem" });
    }

    const data = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: cleanText(description) }),
      ...(destination !== undefined && { destination: cleanText(destination) }),
      ...(tripType !== undefined && { tripType }),
      startDate: start,
      endDate: end,
    };
    const changedFields = Object.keys(data).filter(
      (key) => String(data[key]) !== String(trip[key])
    );

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.trip.update({
        where: { id: trip.id },
        data,
        include: { collaborators: { include: { user: userSelect } } },
      });
      if (changedFields.length) {
        await tx.tripHistory.create({
          data: {
            tripId: trip.id,
            userId,
            action: "TRIP_UPDATED",
            details: { changedFields },
          },
        });
      }
      return result;
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar viagem:", error);
    res.status(500).json({ error: "Erro ao atualizar viagem" });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    await prisma.trip.delete({ where: { id: req.trip.id } });
    res.json({ message: "Viagem deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar viagem:", error);
    res.status(500).json({ error: "Erro ao deletar viagem" });
  }
};

exports.inviteCollaborator = async (req, res) => {
  try {
    const { trip, userId } = req;
    const requestedEmail = req.body.email;
    const role = req.body.role || "COLLABORATOR";
    if (typeof requestedEmail !== "string" || !requestedEmail.trim()) {
      return res.status(400).json({ error: "Informe o e-mail do colaborador" });
    }
    if (!["COLLABORATOR", "VIEWER"].includes(role)) {
      return res.status(400).json({ error: "Papel de colaborador inválido" });
    }
    const email = requestedEmail.trim().toLowerCase();
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ error: "Não existe uma conta TripSync com este e-mail" });
    }
    if (invitedUser.id === userId) {
      return res.status(400).json({ error: "Você já é o proprietário desta viagem" });
    }
    const existing = await prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId: trip.id, userId: invitedUser.id } },
    });
    if (existing) {
      return res.status(409).json({ error: "Este usuário já participa desta viagem" });
    }
    const collaborator = await prisma.$transaction(async (tx) => {
      const created = await tx.tripCollaborator.create({
        data: { tripId: trip.id, userId: invitedUser.id, role },
        include: { user: userSelect },
      });
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          userId,
          action: "COLLABORATOR_ADDED",
          details: { collaboratorId: invitedUser.id, name: invitedUser.name, role },
        },
      });
      return created;
    });
    res.status(201).json(collaborator);
  } catch (error) {
    console.error("Erro ao convidar colaborador:", error);
    res.status(500).json({ error: "Erro ao convidar colaborador" });
  }
};

exports.listCollaborators = async (req, res) => {
  try {
    const collaborators = await prisma.tripCollaborator.findMany({
      where: { tripId: req.trip.id },
      include: { user: userSelect },
    });
    res.json(collaborators);
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    res.status(500).json({ error: "Erro ao listar colaboradores" });
  }
};

exports.removeCollaborator = async (req, res) => {
  try {
    const { trip, userId } = req;
    const targetUserId = parseId(req.params.collaboratorId);
    const isSelf = targetUserId === userId;
    if (!req.tripAccess.isOwner && !isSelf) {
      return res.status(403).json({ error: "Apenas o proprietário pode remover colaboradores" });
    }
    const collaborator = targetUserId
      ? await prisma.tripCollaborator.findUnique({
          where: { tripId_userId: { tripId: trip.id, userId: targetUserId } },
          include: { user: { select: { name: true } } },
        })
      : null;
    if (!collaborator) {
      return res.status(404).json({ error: "Colaborador não encontrado nesta viagem" });
    }
    await prisma.$transaction([
      prisma.tripCollaborator.delete({ where: { id: collaborator.id } }),
      prisma.tripHistory.create({
        data: {
          tripId: trip.id,
          userId,
          action: isSelf ? "COLLABORATOR_LEFT" : "COLLABORATOR_REMOVED",
          details: { removedUserId: targetUserId, name: collaborator.user.name },
        },
      }),
    ]);
    res.json({ message: isSelf ? "Você saiu da viagem" : "Colaborador removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    res.status(500).json({ error: "Erro ao remover colaborador" });
  }
};

exports.getTripHistory = async (req, res) => {
  try {
    const history = await prisma.tripHistory.findMany({
      where: { tripId: req.trip.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(history);
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    res.status(500).json({ error: "Erro ao obter histórico" });
  }
};
