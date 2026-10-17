const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getAccess(tripId, userId) {
  const id = Number(tripId);
  if (!Number.isInteger(id) || id < 1) return null;
  return prisma.trip.findUnique({
    where: { id },
    include: { collaborators: { where: { userId }, select: { role: true } } },
  });
}

function canRead(trip, userId) {
  return trip.ownerId === userId || trip.collaborators.length > 0;
}

function canEdit(trip, userId) {
  return (
    trip.ownerId === userId ||
    trip.collaborators.some((collaborator) => collaborator.role === "COLLABORATOR")
  );
}

function validActivityDates(start, end) {
  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    start < end
  );
}

async function findConflicts(tripId, start, end, excludedId) {
  return prisma.tripActivity.findMany({
    where: {
      tripId,
      ...(excludedId ? { id: { not: excludedId } } : {}),
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  });
}

function sendConflict(res, conflicts) {
  return res.status(400).json({
    error: "Conflito de horário detectado",
    conflictingActivities: conflicts.map(({ id, title, startTime, endTime }) => ({
      id,
      title,
      startTime,
      endTime,
    })),
  });
}

exports.createActivity = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const { title, description, startTime, endTime } = req.body;
    if (typeof title !== "string" || !title.trim() || !startTime || !endTime) {
      return res.status(400).json({
        error: "Título, hora de início e fim são obrigatórios",
      });
    }
    const trip = await getAccess(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para criar atividades" });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!validActivityDates(start, end)) {
      return res.status(400).json({ error: "Informe um período válido para a atividade" });
    }
    const conflicts = await findConflicts(tripId, start, end);
    if (conflicts.length) return sendConflict(res, conflicts);

    const activity = await prisma.tripActivity.create({
      data: {
        tripId,
        title: title.trim(),
        description,
        startTime: start,
        endTime: end,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        comments: { include: { author: { select: { id: true, name: true } } } },
      },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId,
        action: "ACTIVITY_ADDED",
        details: { activityId: activity.id, title: activity.title },
      },
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    res.status(500).json({ error: "Erro ao criar atividade" });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const trip = await getAccess(tripId, req.userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canRead(trip, req.userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    const activities = await prisma.tripActivity.findMany({
      where: { tripId },
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

exports.updateActivity = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const activityId = Number(req.params.activityId);
    const userId = req.userId;
    const trip = await getAccess(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para atualizar atividades" });
    }
    const activity = await prisma.tripActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.tripId !== tripId) {
      return res.status(404).json({ error: "Atividade não encontrada nesta viagem" });
    }
    const start = req.body.startTime ? new Date(req.body.startTime) : activity.startTime;
    const end = req.body.endTime ? new Date(req.body.endTime) : activity.endTime;
    if (!validActivityDates(start, end)) {
      return res.status(400).json({ error: "Informe um período válido para a atividade" });
    }
    const conflicts = await findConflicts(tripId, start, end, activityId);
    if (conflicts.length) return sendConflict(res, conflicts);
    const updatedActivity = await prisma.tripActivity.update({
      where: { id: activityId },
      data: {
        title: typeof req.body.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : activity.title,
        description: req.body.description !== undefined
          ? req.body.description
          : activity.description,
        startTime: start,
        endTime: end,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        comments: { include: { author: { select: { id: true, name: true } } } },
      },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId,
        action: "ACTIVITY_UPDATED",
        details: { activityId, title: updatedActivity.title },
      },
    });
    res.json(updatedActivity);
  } catch (error) {
    console.error("Erro ao atualizar atividade:", error);
    res.status(500).json({ error: "Erro ao atualizar atividade" });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const activityId = Number(req.params.activityId);
    const userId = req.userId;
    const trip = await getAccess(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para excluir atividades" });
    }
    const activity = await prisma.tripActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.tripId !== tripId) {
      return res.status(404).json({ error: "Atividade não encontrada nesta viagem" });
    }
    await prisma.tripActivity.delete({ where: { id: activityId } });
    await prisma.tripHistory.create({
      data: { tripId, userId, action: "ACTIVITY_DELETED", details: { activityId } },
    });
    res.json({ message: "Atividade deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar atividade:", error);
    res.status(500).json({ error: "Erro ao deletar atividade" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const activityId = Number(req.params.activityId);
    const userId = req.userId;
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ error: "Comentário não pode estar vazio" });
    const trip = await getAccess(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para comentar" });
    }
    const activity = await prisma.tripActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.tripId !== tripId) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }
    const comment = await prisma.comment.create({
      data: { activityId, authorId: userId, content },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ error: "Erro ao adicionar comentário" });
  }
};

exports.getComments = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const activityId = Number(req.params.activityId);
    const trip = await getAccess(tripId, req.userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canRead(trip, req.userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    const activity = await prisma.tripActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.tripId !== tripId) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }
    const comments = await prisma.comment.findMany({
      where: { activityId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(comments);
  } catch (error) {
    console.error("Erro ao listar comentários:", error);
    res.status(500).json({ error: "Erro ao listar comentários" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const tripId = Number(req.params.tripId);
    const activityId = Number(req.params.activityId);
    const userId = req.userId;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.activityId !== activityId) {
      return res.status(404).json({ error: "Comentário não encontrado" });
    }
    if (comment.authorId !== userId) {
      return res.status(403).json({ error: "Você não pode deletar o comentário de outro usuário" });
    }
    const activity = await prisma.tripActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.tripId !== tripId) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }
    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ message: "Comentário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar comentário:", error);
    res.status(500).json({ error: "Erro ao deletar comentário" });
  }
};
