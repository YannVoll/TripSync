const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar atividade
exports.createActivity = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, description, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!title || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Título, hora de início e fim são obrigatórios" });
    }

    // Verificar se a viagem existe e o usuário tem permissão
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: { collaborators: { where: { userId } } },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.length > 0;

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para acessar esta viagem" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res
        .status(400)
        .json({ error: "Hora de início deve ser antes da hora de fim" });
    }

    // Verificar conflitos de horário
    const conflicts = await prisma.tripActivity.findMany({
      where: {
        tripId: parseInt(tripId),
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: "Conflito de horário detectado",
        conflictingActivities: conflicts.map((a) => ({
          id: a.id,
          title: a.title,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }

    const activity = await prisma.tripActivity.create({
      data: {
        tripId: parseInt(tripId),
        title,
        description,
        startTime: start,
        endTime: end,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "ACTIVITY_ADDED",
        details: { activityId: activity.id, title },
      },
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    res.status(500).json({ error: "Erro ao criar atividade" });
  }
};

// Listar atividades de uma viagem
exports.getActivities = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    // Verificar se o usuário tem acesso
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: { collaborators: { where: { userId } } },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.length > 0;

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para acessar esta viagem" });
    }

    const activities = await prisma.tripActivity.findMany({
      where: { tripId: parseInt(tripId) },
      include: {
        createdBy: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { startTime: "asc" },
    });

    res.json(activities);
  } catch (error) {
    console.error("Erro ao listar atividades:", error);
    res.status(500).json({ error: "Erro ao listar atividades" });
  }
};

// Atualizar atividade
exports.updateActivity = async (req, res) => {
  try {
    const { tripId, activityId } = req.params;
    const { title, description, startTime, endTime } = req.body;
    const userId = req.user.id;

    // Verificar se o usuário tem acesso
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: { collaborators: { where: { userId } } },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.some(
      (c) => c.role === "COLLABORATOR" || c.role === "OWNER"
    );

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para atualizar atividades" });
    }

    const activity = await prisma.tripActivity.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    if (activity.tripId !== parseInt(tripId)) {
      return res
        .status(400)
        .json({ error: "Atividade não pertence a esta viagem" });
    }

    const start = startTime ? new Date(startTime) : activity.startTime;
    const end = endTime ? new Date(endTime) : activity.endTime;

    if (start >= end) {
      return res
        .status(400)
        .json({ error: "Hora de início deve ser antes da hora de fim" });
    }

    // Verificar conflitos (excluindo a atividade atual)
    const conflicts = await prisma.tripActivity.findMany({
      where: {
        tripId: parseInt(tripId),
        id: { not: parseInt(activityId) },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: "Conflito de horário detectado",
        conflictingActivities: conflicts.map((a) => ({
          id: a.id,
          title: a.title,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }

    const updatedActivity = await prisma.tripActivity.update({
      where: { id: parseInt(activityId) },
      data: {
        title: title || activity.title,
        description: description !== undefined ? description : activity.description,
        startTime: start,
        endTime: end,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "ACTIVITY_UPDATED",
        details: { activityId: parseInt(activityId), title },
      },
    });

    res.json(updatedActivity);
  } catch (error) {
    console.error("Erro ao atualizar atividade:", error);
    res.status(500).json({ error: "Erro ao atualizar atividade" });
  }
};

// Deletar atividade
exports.deleteActivity = async (req, res) => {
  try {
    const { tripId, activityId } = req.params;
    const userId = req.user.id;

    // Verificar se o usuário tem acesso
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: { collaborators: { where: { userId } } },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.some(
      (c) => c.role === "COLLABORATOR" || c.role === "OWNER"
    );

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para deletar atividades" });
    }

    const activity = await prisma.tripActivity.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    if (activity.tripId !== parseInt(tripId)) {
      return res
        .status(400)
        .json({ error: "Atividade não pertence a esta viagem" });
    }

    await prisma.tripActivity.delete({
      where: { id: parseInt(activityId) },
    });

    // Registrar no histórico
    await prisma.tripHistory.create({
      data: {
        tripId: parseInt(tripId),
        userId,
        action: "ACTIVITY_DELETED",
        details: { activityId: parseInt(activityId) },
      },
    });

    res.json({ message: "Atividade deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar atividade:", error);
    res.status(500).json({ error: "Erro ao deletar atividade" });
  }
};

// ===== COMENTÁRIOS =====

// Adicionar comentário à atividade
exports.addComment = async (req, res) => {
  try {
    const { tripId, activityId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "Comentário não pode estar vazio" });
    }

    // Verificar se a atividade existe
    const activity = await prisma.tripActivity.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity || activity.tripId !== parseInt(tripId)) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    // Verificar acesso
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
      include: { collaborators: { where: { userId } } },
    });

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.length > 0;

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para comentar" });
    }

    const comment = await prisma.comment.create({
      data: {
        activityId: parseInt(activityId),
        authorId: userId,
        content,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ error: "Erro ao adicionar comentário" });
  }
};

// Listar comentários de uma atividade
exports.getComments = async (req, res) => {
  try {
    const { tripId, activityId } = req.params;

    const activity = await prisma.tripActivity.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity || activity.tripId !== parseInt(tripId)) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    const comments = await prisma.comment.findMany({
      where: { activityId: parseInt(activityId) },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(comments);
  } catch (error) {
    console.error("Erro ao listar comentários:", error);
    res.status(500).json({ error: "Erro ao listar comentários" });
  }
};

// Deletar comentário
exports.deleteComment = async (req, res) => {
  try {
    const { tripId, activityId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comentário não encontrado" });
    }

    if (comment.authorId !== userId) {
      return res
        .status(403)
        .json({ error: "Você não pode deletar o comentário de outro usuário" });
    }

    await prisma.comment.delete({
      where: { id: parseInt(commentId) },
    });

    res.json({ message: "Comentário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar comentário:", error);
    res.status(500).json({ error: "Erro ao deletar comentário" });
  }
};