const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===== TRIPS CRUD =====

// Criar nova viagem
exports.createTrip = async (req, res) => {
  try {
    const { title, description, tripType, startDate, endDate } = req.body;
    const userId = req.user.id;

    if (!title || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Título, data de início e fim são obrigatórios" });
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        description,
        tripType: tripType || "CUSTOM",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ownerId: userId,
      },
      include: {
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: trip.id,
        userId,
        action: "TRIP_CREATED",
        details: { title, tripType },
      },
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error("Erro ao criar viagem:", error);
    res.status(500).json({ error: "Erro ao criar viagem" });
  }
};

// Listar todas as viagens do usuário (como owner ou collaborator)
exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.user.id;

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

// Obter detalhes de uma viagem específica
exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: {
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
        checklist: {
          include: { items: { orderBy: { category: "asc" } } },
        },
        history: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    // Verificar permissão
    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.some(
      (c) => c.userId === userId
    );

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para acessar esta viagem" });
    }

    res.json(trip);
  } catch (error) {
    console.error("Erro ao obter viagem:", error);
    res.status(500).json({ error: "Erro ao obter viagem" });
  }
};

// Atualizar viagem
exports.updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, description, tripType, startDate, endDate } = req.body;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Apenas o owner pode atualizar a viagem" });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: parseInt(tripId) },
      data: {
        title: title || trip.title,
        description: description !== undefined ? description : trip.description,
        tripType: tripType || trip.tripType,
        startDate: startDate ? new Date(startDate) : trip.startDate,
        endDate: endDate ? new Date(endDate) : trip.endDate,
      },
      include: {
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "TRIP_UPDATED",
        details: { updatedFields: { title, description, tripType } },
      },
    });

    res.json(updatedTrip);
  } catch (error) {
    console.error("Erro ao atualizar viagem:", error);
    res.status(500).json({ error: "Erro ao atualizar viagem" });
  }
};

// Deletar viagem (apenas owner)
exports.deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Apenas o owner pode deletar a viagem" });
    }

    await prisma.trip.delete({
      where: { id: parseInt(tripId) },
    });

    res.json({ message: "Viagem deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar viagem:", error);
    res.status(500).json({ error: "Erro ao deletar viagem" });
  }
};

// ===== COLABORAÇÃO =====

// Convidar colaborador
exports.inviteCollaborator = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Apenas o owner pode convidar colaboradores" });
    }

    // Encontrar o usuário pelo email
    const collaboratorUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!collaboratorUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (collaboratorUser.id === userId) {
      return res.status(400).json({ error: "Você é o owner desta viagem" });
    }

    // Verificar se já é colaborador
    const existingCollaborator = await prisma.tripCollaborator.findUnique({
      where: {
        tripId_userId: {
          tripId: parseInt(tripId),
          userId: collaboratorUser.id,
        },
      },
    });

    if (existingCollaborator) {
      return res
        .status(400)
        .json({ error: "Este usuário já é colaborador desta viagem" });
    }

    const collaborator = await prisma.tripCollaborator.create({
      data: {
        tripId: parseInt(tripId),
        userId: collaboratorUser.id,
        role: role || "COLLABORATOR",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "COLLABORATOR_ADDED",
        details: { collaboratorId: collaboratorUser.id, email, role },
      },
    });

    res.status(201).json(collaborator);
  } catch (error) {
    console.error("Erro ao convidar colaborador:", error);
    res.status(500).json({ error: "Erro ao convidar colaborador" });
  }
};

// Listar colaboradores de uma viagem
exports.listCollaborators = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = await prisma.tripCollaborator.findUnique({
      where: {
        tripId_userId: { tripId: parseInt(tripId), userId },
      },
    });

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para acessar esta viagem" });
    }

    const collaborators = await prisma.tripCollaborator.findMany({
      where: { tripId: parseInt(tripId) },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(collaborators);
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    res.status(500).json({ error: "Erro ao listar colaboradores" });
  }
};

// Remover colaborador
exports.removeCollaborator = async (req, res) => {
  try {
    const { tripId, collaboratorId } = req.params;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Apenas o owner pode remover colaboradores" });
    }

    const collaborator = await prisma.tripCollaborator.findUnique({
      where: {
        tripId_userId: {
          tripId: parseInt(tripId),
          userId: parseInt(collaboratorId),
        },
      },
    });

    if (!collaborator) {
      return res
        .status(404)
        .json({ error: "Colaborador não encontrado nesta viagem" });
    }

    await prisma.tripCollaborator.delete({
      where: {
        tripId_userId: {
          tripId: parseInt(tripId),
          userId: parseInt(collaboratorId),
        },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "COLLABORATOR_REMOVED",
        details: { removedUserId: parseInt(collaboratorId) },
      },
    });

    res.json({ message: "Colaborador removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    res.status(500).json({ error: "Erro ao remover colaborador" });
  }
};

// Obter histórico da viagem
exports.getTripHistory = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = await prisma.tripCollaborator.findUnique({
      where: {
        tripId_userId: { tripId: parseInt(tripId), userId },
      },
    });

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para acessar esta viagem" });
    }

    const history = await prisma.tripHistory.findMany({
      where: { tripId: parseInt(tripId) },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(history);
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    res.status(500).json({ error: "Erro ao obter histórico" });
  }
};