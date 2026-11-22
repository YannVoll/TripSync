const prisma = require("../prisma");
const checklistTemplates = require("../data/checklistTemplates");
const { parseId } = require("../lib/tripAccess");

function withProgress(checklist) {
  const completedCount = checklist.items.filter((item) => item.completed).length;
  const totalCount = checklist.items.length;
  return {
    ...checklist,
    completedCount,
    totalCount,
    progress: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

async function findChecklistItem(tripId, itemId) {
  const id = parseId(itemId);
  if (!id) return null;
  return prisma.checklistItem.findFirst({
    where: { id, checklist: { tripId } },
  });
}

exports.createChecklist = async (req, res) => {
  try {
    const { trip } = req;
    const existing = await prisma.tripChecklist.findUnique({ where: { tripId: trip.id } });
    if (existing) {
      return res.status(409).json({ error: "Esta viagem já possui uma checklist" });
    }
    const template = await prisma.checklistTemplate.findUnique({
      where: { tripType: trip.tripType },
    });
    const items =
      template?.items ??
      checklistTemplates[trip.tripType]?.items ??
      checklistTemplates.CUSTOM.items;
    const [checklist] = await prisma.$transaction([
      prisma.tripChecklist.create({
        data: {
          tripId: trip.id,
          items: { create: items.map((title) => ({ title, category: "general" })) },
        },
        include: { items: { orderBy: { id: "asc" } } },
      }),
      prisma.tripHistory.create({
        data: {
          tripId: trip.id,
          userId: req.userId,
          action: "CHECKLIST_CREATED",
          details: { itemCount: items.length },
        },
      }),
    ]);
    res.status(201).json(withProgress(checklist));
  } catch (error) {
    console.error("Erro ao criar checklist:", error);
    res.status(500).json({ error: "Erro ao criar checklist" });
  }
};

exports.getChecklist = async (req, res) => {
  try {
    const checklist = await prisma.tripChecklist.findUnique({
      where: { tripId: req.trip.id },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!checklist) return res.status(404).json({ error: "Checklist não encontrada" });
    res.json(withProgress(checklist));
  } catch (error) {
    console.error("Erro ao obter checklist:", error);
    res.status(500).json({ error: "Erro ao obter checklist" });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ error: "Título do item é obrigatório" });
    const checklist = await prisma.tripChecklist.findUnique({ where: { tripId: req.trip.id } });
    if (!checklist) return res.status(404).json({ error: "Checklist não encontrada" });
    const item = await prisma.checklistItem.create({
      data: {
        checklistId: checklist.id,
        title,
        category: typeof req.body.category === "string" ? req.body.category : "other",
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res.status(500).json({ error: "Erro ao adicionar item" });
  }
};

exports.toggleChecklistItem = async (req, res) => {
  try {
    const item = await findChecklistItem(req.trip.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item não encontrado nesta checklist" });
    const updated = await prisma.checklistItem.update({
      where: { id: item.id },
      data: { completed: !item.completed },
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const item = await findChecklistItem(req.trip.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item não encontrado nesta checklist" });
    await prisma.checklistItem.delete({ where: { id: item.id } });
    res.json({ message: "Item deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    res.status(500).json({ error: "Erro ao deletar item" });
  }
};

exports.getTemplates = (_req, res) => {
  res.json(
    Object.entries(checklistTemplates).map(([tripType, template]) => ({
      tripType,
      ...template,
    }))
  );
};
