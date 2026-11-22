const prisma = require("../prisma");
const { parseId } = require("../lib/tripAccess");

const activityInclude = {
  createdBy: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
};

function validPeriod(start, end) {
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
}

function insideTrip(trip, start, end) {
  const tripEnd = new Date(trip.endDate);
  tripEnd.setHours(23, 59, 59, 999);
  const tripStart = new Date(trip.startDate);
  tripStart.setHours(0, 0, 0, 0);
  return start >= tripStart && end <= tripEnd;
}

async function findConflicts(tripId, start, end, excludedId) {
  return prisma.tripActivity.findMany({
    where: {
      tripId,
      ...(excludedId ? { id: { not: excludedId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true, title: true, startTime: true, endTime: true },
  });
}

async function findActivity(tripId, activityId) {
  const id = parseId(activityId);
  if (!id) return null;
  return prisma.tripActivity.findFirst({ where: { id, tripId } });
}

async function validateSchedule(res, trip, start, end, excludedId) {
  if (!validPeriod(start, end)) {
    res.status(400).json({ error: "Informe um período válido para a atividade" });
    return false;
  }
  if (!insideTrip(trip, start, end)) {
    res.status(400).json({ error: "A atividade precisa acontecer dentro do período da viagem" });
    return false;
  }
  const conflicts = await findConflicts(trip.id, start, end, excludedId);
  if (conflicts.length) {
    res.status(400).json({
      error: "Conflito de horário detectado",
      conflictingActivities: conflicts,
    });
    return false;
  }
  return true;
}

exports.createActivity = async (req, res) => {
  try {
    const { trip, userId } = req;
    const { title, description, startTime, endTime } = req.body;
    if (typeof title !== "string" || !title.trim() || !startTime || !endTime) {
      return res.status(400).json({ error: "Título, hora de início e fim são obrigatórios" });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!(await validateSchedule(res, trip, start, end))) return;

    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.tripActivity.create({
        data: {
          tripId: trip.id,
          title: title.trim(),
          description: typeof description === "string" ? description.trim() || null : null,
          startTime: start,
          endTime: end,
          createdById: userId,
        },
        include: activityInclude,
      });
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          userId,
          action: "ACTIVITY_ADDED",
          details: { activityId: created.id, title: created.title },
        },
      });
      return created;
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    res.status(500).json({ error: "Erro ao criar atividade" });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const activities = await prisma.tripActivity.findMany({
      where: { tripId: req.trip.id },
      include: activityInclude,
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
    const { trip, userId } = req;
    const activity = await findActivity(trip.id, req.params.activityId);
    if (!activity) return res.status(404).json({ error: "Atividade não encontrada nesta viagem" });

    const start = req.body.startTime ? new Date(req.body.startTime) : activity.startTime;
    const end = req.body.endTime ? new Date(req.body.endTime) : activity.endTime;
    if (!(await validateSchedule(res, trip, start, end, activity.id))) return;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.tripActivity.update({
        where: { id: activity.id },
        data: {
          title:
            typeof req.body.title === "string" && req.body.title.trim()
              ? req.body.title.trim()
              : activity.title,
          description:
            typeof req.body.description === "string"
              ? req.body.description.trim() || null
              : activity.description,
          startTime: start,
          endTime: end,
        },
        include: activityInclude,
      });
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          userId,
          action: "ACTIVITY_UPDATED",
          details: { activityId: result.id, title: result.title },
        },
      });
      return result;
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar atividade:", error);
    res.status(500).json({ error: "Erro ao atualizar atividade" });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const { trip, userId } = req;
    const activity = await findActivity(trip.id, req.params.activityId);
    if (!activity) return res.status(404).json({ error: "Atividade não encontrada nesta viagem" });
    await prisma.$transaction([
      prisma.tripActivity.delete({ where: { id: activity.id } }),
      prisma.tripHistory.create({
        data: {
          tripId: trip.id,
          userId,
          action: "ACTIVITY_DELETED",
          details: { activityId: activity.id, title: activity.title },
        },
      }),
    ]);
    res.json({ message: "Atividade deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar atividade:", error);
    res.status(500).json({ error: "Erro ao deletar atividade" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ error: "Comentário não pode estar vazio" });
    if (content.length > 1000) {
      return res.status(400).json({ error: "Comentário pode ter no máximo 1000 caracteres" });
    }
    const activity = await findActivity(req.trip.id, req.params.activityId);
    if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });
    const comment = await prisma.comment.create({
      data: { activityId: activity.id, authorId: req.userId, content },
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
    const activity = await findActivity(req.trip.id, req.params.activityId);
    if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });
    const comments = await prisma.comment.findMany({
      where: { activityId: activity.id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (error) {
    console.error("Erro ao listar comentários:", error);
    res.status(500).json({ error: "Erro ao listar comentários" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const activity = await findActivity(req.trip.id, req.params.activityId);
    if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });
    const commentId = parseId(req.params.commentId);
    const comment = commentId
      ? await prisma.comment.findFirst({ where: { id: commentId, activityId: activity.id } })
      : null;
    if (!comment) return res.status(404).json({ error: "Comentário não encontrado" });
    if (comment.authorId !== req.userId && !req.tripAccess.isOwner) {
      return res.status(403).json({ error: "Você não pode deletar o comentário de outro usuário" });
    }
    await prisma.comment.delete({ where: { id: comment.id } });
    res.json({ message: "Comentário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar comentário:", error);
    res.status(500).json({ error: "Erro ao deletar comentário" });
  }
};
