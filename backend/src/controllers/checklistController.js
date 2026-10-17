const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const checklistTemplates = {
  BEACH: {
    name: "Viagem de Praia",
    items: [
      "Maiô/Sunga", "Óculos de Sol", "Protetor Solar (SPF 30+)", "Repelente",
      "Toalha", "Chinelo/Sandália", "Camiseta UV", "Shorts/Saia",
      "Roupas Noturnas", "Roupas para Atividades", "Documentos (RG, CPF)",
      "Cartão de Crédito/Dinheiro", "Hidratante para pele", "Medicamentos básicos",
      "Mala/Bolsa",
    ],
  },
  CITY_TOUR: {
    name: "City Tour",
    items: [
      "Documentos (RG, CPF)", "Cartão de Crédito/Dinheiro", "Roupas Confortáveis",
      "Sapatos Confortáveis", "Roupas Formais (se necessário)", "Óculos de Sol",
      "Protetor Solar", "Mapa/Guia Turístico", "Câmera/Celular", "Carregador",
      "Mochila/Bolsa", "Repelente", "Medicamentos", "Roupas para Clima Variável",
    ],
  },
  FLIGHT: {
    name: "Viagem de Avião",
    items: [
      "Passaporte/RG", "Documentos de Viagem", "Cartão de Embarque",
      "Medicamentos Prescritos", "Líquidos em Frascos até 100ml",
      "Eletrônicos (Carregadores)", "Roupas Confortáveis", "Sapatos para Viagem",
      "Pijama", "Roupa de Cama (se necessário)", "Almofada Cervical",
      "Máscara de Dormir", "Fone de Ouvido", "Mala/Mochila", "Documentos de Seguro",
    ],
  },
  MOUNTAIN: {
    name: "Viagem de Montanha",
    items: [
      "Roupas em Camadas", "Jaqueta à Prova de Vento", "Casaco Impermeável",
      "Botas de Trilha", "Meia de Trilha", "Calça de Trilha", "Luvas",
      "Chapéu/Gorro", "Óculos de Sol", "Protetor Solar", "Mochila 40-60L",
      "Garrafa Térmica", "Comida Liofilizada", "Lanterna Frontal",
      "Mapa e Bússola", "Medicamentos", "Documentos",
    ],
  },
  BUSINESS: {
    name: "Viagem de Negócios",
    items: [
      "Documentos Profissionais", "Laptop/Tablet", "Carregadores", "Canetas e Blocos",
      "Terno/Blazer", "Calças Formais", "Camisas/Blusas", "Sapatos Formais",
      "Meias", "Gravata/Lenço", "Roupas Casuais", "Pijama", "Higiene Pessoal",
      "Medicamentos", "Cartões de Visita", "Passaporte/RG", "Cartão de Crédito",
      "Mala Executiva",
    ],
  },
  BACKPACKING: {
    name: "Mochilão",
    items: [
      "Mochila 60-80L", "Saco de Dormir", "Barraca", "Colchonete Inflável",
      "Roupas Versáteis", "Roupas Térmicas", "Sapatos Confortáveis", "Sandálias",
      "Capa de Chuva", "Casaco", "Lanterna Frontal", "Bateria Portátil",
      "Passaporte", "Cartão de Crédito", "Dinheiro", "Kit Higiene Básico",
      "Medicamentos", "Documentos de Reserva", "Cadeado", "Corda de Nylon",
    ],
  },
  TREKKING: {
    name: "Trekking",
    items: [
      "Mochila 40-60L", "Sapato de Trilha Impermeável", "Meia de Trilha",
      "Roupas Técnicas (2-3 dias)", "Casaco Impermeável", "Cantil 1-2L",
      "Protetor Solar", "Repelente", "Kit Primeiro Socorro", "Lanterna Frontal",
      "Mapas/GPS", "Comida Liofilizada", "Barraca", "Saco de Dormir",
      "Colchonete Inflável", "Luvas", "Chapéu/Gorro", "Óculos de Sol",
      "Documentos", "Documentos de Emergência",
    ],
  },
  CUSTOM: {
    name: "Checklist de viagem",
    items: [
      "Documentos pessoais", "Passagens e reservas", "Dinheiro e cartões",
      "Roupas adequadas ao destino", "Itens de higiene pessoal",
      "Medicamentos de uso contínuo", "Celular e carregador",
    ],
  },
};

async function findTrip(tripId, userId) {
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

exports.initializeTemplates = async (_req, res) => {
  try {
    const templates = await Promise.all(
      Object.entries(checklistTemplates).map(([tripType, template]) =>
        prisma.checklistTemplate.upsert({
          where: { tripType },
          update: { name: template.name, items: template.items },
          create: { tripType, name: template.name, items: template.items },
        })
      )
    );
    res.json({
      message: "Templates inicializados com sucesso",
      created: templates.length,
    });
  } catch (error) {
    console.error("Erro ao inicializar templates:", error);
    res.status(500).json({ error: "Erro ao inicializar templates" });
  }
};

exports.createChecklist = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const trip = await findTrip(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para criar checklist" });
    }
    const existing = await prisma.tripChecklist.findUnique({ where: { tripId } });
    if (existing) {
      return res.status(409).json({ error: "Esta viagem já possui uma checklist" });
    }
    const template = await prisma.checklistTemplate.findUnique({
      where: { tripType: trip.tripType },
    });
    const items = template?.items ?? checklistTemplates[trip.tripType]?.items ?? checklistTemplates.CUSTOM.items;
    const checklist = await prisma.tripChecklist.create({
      data: {
        tripId,
        items: { create: items.map((title) => ({ title, category: "general" })) },
      },
      include: { items: { orderBy: { category: "asc" } } },
    });
    await prisma.tripHistory.create({
      data: {
        tripId,
        userId,
        action: "CHECKLIST_CREATED",
        details: { itemCount: checklist.items.length },
      },
    });
    res.status(201).json({
      ...checklist,
      progress: 0,
      completedCount: 0,
      totalCount: checklist.items.length,
    });
  } catch (error) {
    console.error("Erro ao criar checklist:", error);
    res.status(500).json({ error: "Erro ao criar checklist" });
  }
};

exports.getChecklist = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const trip = await findTrip(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canRead(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para acessar esta viagem" });
    }
    const checklist = await prisma.tripChecklist.findUnique({
      where: { tripId },
      include: { items: { orderBy: { category: "asc" } } },
    });
    if (!checklist) return res.status(404).json({ error: "Checklist não encontrada" });
    const completedCount = checklist.items.filter((item) => item.completed).length;
    const totalCount = checklist.items.length;
    res.json({
      ...checklist,
      completedCount,
      totalCount,
      progress: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    console.error("Erro ao obter checklist:", error);
    res.status(500).json({ error: "Erro ao obter checklist" });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ error: "Título do item é obrigatório" });
    const trip = await findTrip(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para editar a checklist" });
    }
    const checklist = await prisma.tripChecklist.findUnique({ where: { tripId } });
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

async function findChecklistItem(tripId, itemId) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: Number(itemId) },
  });
  if (!item) return null;
  const checklist = await prisma.tripChecklist.findUnique({
    where: { id: item.checklistId },
  });
  return checklist?.tripId === Number(tripId) ? { item, checklist } : null;
}

exports.toggleChecklistItem = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const trip = await findTrip(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para editar a checklist" });
    }
    const result = await findChecklistItem(tripId, req.params.itemId);
    if (!result) return res.status(404).json({ error: "Item não encontrado nesta checklist" });
    const item = await prisma.checklistItem.update({
      where: { id: result.item.id },
      data: { completed: !result.item.completed },
    });
    res.json(item);
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const userId = req.userId;
    const trip = await findTrip(tripId, userId);
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    if (!canEdit(trip, userId)) {
      return res.status(403).json({ error: "Você não tem permissão para editar a checklist" });
    }
    const result = await findChecklistItem(tripId, req.params.itemId);
    if (!result) return res.status(404).json({ error: "Item não encontrado nesta checklist" });
    await prisma.checklistItem.delete({ where: { id: result.item.id } });
    res.json({ message: "Item deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    res.status(500).json({ error: "Erro ao deletar item" });
  }
};

exports.getTemplates = async (_req, res) => {
  try {
    const templates = await prisma.checklistTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error("Erro ao obter templates:", error);
    res.status(500).json({ error: "Erro ao obter templates" });
  }
};
