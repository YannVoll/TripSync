const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Templates de checklists por tipo de viagem
const checklistTemplates = {
  BEACH: {
    name: "Viagem de Praia",
    items: [
      "Maiô/Sunga",
      "Óculos de Sol",
      "Protetor Solar (SPF 30+)",
      "Repelente",
      "Toalha",
      "Chinelo/Sandália",
      "Camiseta UV",
      "Shorts/Saia",
      "Roupas Noturnas",
      "Roupa para Atividades",
      "Documentos (RG, CPF)",
      "Cartão de Crédito/Dinheiro",
      "Hidratante para pele",
      "Medicamentos básicos",
      "Mala/Bolsa",
    ],
  },
  CITY_TOUR: {
    name: "City Tour",
    items: [
      "Documentos (RG, CPF)",
      "Cartão de Crédito/Dinheiro",
      "Roupas Confortáveis",
      "Sapatos Confortáveis",
      "Roupas Formais (se necessário)",
      "Óculos de Sol",
      "Protetor Solar",
      "Mapa/Guia Turístico",
      "Câmera/Celular",
      "Carregador",
      "Mochila/Bolsa",
      "Repelente",
      "Medicamentos",
      "Roupas para Clima Variável",
    ],
  },
  FLIGHT: {
    name: "Viagem de Avião",
    items: [
      "Passaporte/RG",
      "Documentos de Viagem",
      "Cartão de Embarque",
      "Medicamentos Prescritos",
      "Líquidos em Frascos até 100ml",
      "Eletrônicos (Carregadores)",
      "Roupas Confortáveis",
      "Sapatos para Viagem",
      "Pijama",
      "Roupa de Cama (se necessário)",
      "Almofada Cervical",
      "Máscara de Dormir",
      "Fone de Ouvido",
      "Mala/Mochila",
      "Documentos de Seguro",
    ],
  },
  MOUNTAIN: {
    name: "Viagem de Montanha",
    items: [
      "Roupas em Camadas",
      "Jaqueta à Prova de Vento",
      "Casaco Impermeável",
      "Botas de Trilha",
      "Meia de Trilha",
      "Calça de Trilha",
      "Luvas",
      "Chapéu/Gorro",
      "Óculos de Sol",
      "Protetor Solar",
      "Mochila 40-60L",
      "Garrafa Térmica",
      "Comida Liofilizada",
      "Lanterna Frontal",
      "Mapa e Bússola",
      "Medicamentos",
      "Documentos",
    ],
  },
  BUSINESS: {
    name: "Viagem de Negócios",
    items: [
      "Documentos Profissionais",
      "Laptop/Tablet",
      "Carregadores",
      "Pens e Blocos",
      "Terno/Blazer",
      "Calça Formais",
      "Camisas/Blusas",
      "Sapatos Formais",
      "Meias",
      "Gravata/Lenço",
      "Roupas Casuais",
      "Pijama",
      "Higiene Pessoal",
      "Medicamentos",
      "Cartões de Visita",
      "Passaporte/RG",
      "Cartão de Crédito",
      "Mala Executiva",
    ],
  },
  BACKPACKING: {
    name: "Mochilão",
    items: [
      "Mochila 60-80L",
      "Saco de Dormir",
      "Barraca",
      "Colchonete Inflável",
      "Roupas Versáteis",
      "Roupas Térmicas",
      "Sapatos Confortáveis",
      "Sandálias",
      "Capa de Chuva",
      "Casaco",
      "Lanterno Frontal",
      "Bateria Portátil",
      "Passaporte",
      "Cartão de Crédito",
      "Dinheiro",
      "Kit Higiene Básico",
      "Medicamentos",
      "Documentos de Reserva",
      "Cadeado",
      "Corda Nylon",
    ],
  },
  TREKKING: {
    name: "Trekking",
    items: [
      "Mochila 40-60L",
      "Sapato de Trilha Waterproof",
      "Meia de Trilha",
      "Roupas Técnicas (2-3 dias)",
      "Casaco Impermeável",
      "Cantil 1-2L",
      "Protetor Solar",
      "Repelente",
      "Kit Primeiro Socorro",
      "Lanterna Frontal",
      "Mapas/GPS",
      "Comida Liofilizada",
      "Barraca",
      "Saco de Dormir",
      "Colchonete Inflável",
      "Luvas",
      "Chapéu/Gorro",
      "Óculos de Sol",
      "Documentos",
      "Documentos de Emergência",
    ],
  },
};

// Inicializar templates no banco de dados (roda uma vez)
exports.initializeTemplates = async (req, res) => {
  try {
    const templates = [];

    for (const [tripType, template] of Object.entries(checklistTemplates)) {
      const existing = await prisma.checklistTemplate.findUnique({
        where: { tripType },
      });

      if (!existing) {
        const created = await prisma.checklistTemplate.create({
          data: {
            tripType,
            name: template.name,
            items: template.items,
          },
        });
        templates.push(created);
      }
    }

    res.json({
      message: "Templates inicializados com sucesso",
      created: templates.length,
    });
  } catch (error) {
    console.error("Erro ao inicializar templates:", error);
    res.status(500).json({ error: "Erro ao inicializar templates" });
  }
};

// Criar checklist para uma viagem (usando template)
exports.createChecklist = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    // Verificar se a viagem existe e é do usuário
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para criar checklist" });
    }

    // Verificar se já existe checklist
    const existingChecklist = await prisma.tripChecklist.findUnique({
      where: { tripId: parseInt(tripId) },
    });

    if (existingChecklist) {
      return res
        .status(400)
        .json({ error: "Esta viagem já possui uma checklist" });
    }

    // Obter template baseado no tipo de viagem
    const template = await prisma.checklistTemplate.findUnique({
      where: { tripType: trip.tripType },
    });

    // Criar checklist
    const checklist = await prisma.tripChecklist.create({
      data: {
        tripId: parseInt(tripId),
      },
    });

    // Criar items baseado no template
    let items = [];
    if (template) {
      items = await prisma.checklistItem.createMany({
        data: template.items.map((item) => ({
          checklistId: checklist.id,
          title: item,
          category: "general",
        })),
      });
    }

    const populatedChecklist = await prisma.tripChecklist.findUnique({
      where: { id: checklist.id },
      include: { items: { orderBy: { category: "asc" } } },
    });

    res.status(201).json(populatedChecklist);
  } catch (error) {
    console.error("Erro ao criar checklist:", error);
    res.status(500).json({ error: "Erro ao criar checklist" });
  }
};

// Obter checklist de uma viagem
exports.getChecklist = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

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

    const checklist = await prisma.tripChecklist.findUnique({
      where: { tripId: parseInt(tripId) },
      include: { items: { orderBy: { category: "asc" } } },
    });

    if (!checklist) {
      return res.status(404).json({ error: "Checklist não encontrada" });
    }

    // Calcular progresso
    const completed = checklist.items.filter((i) => i.completed).length;
    const progress = checklist.items.length
      ? Math.round((completed / checklist.items.length) * 100)
      : 0;

    res.json({
      ...checklist,
      progress,
      completedCount: completed,
      totalCount: checklist.items.length,
    });
  } catch (error) {
    console.error("Erro ao obter checklist:", error);
    res.status(500).json({ error: "Erro ao obter checklist" });
  }
};

// Adicionar item à checklist
exports.addChecklistItem = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, category } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: "Título do item é obrigatório" });
    }

    // Verificar se tem permissão
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(tripId) },
    });

    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    if (trip.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para editar a checklist" });
    }

    // Obter checklist
    const checklist = await prisma.tripChecklist.findUnique({
      where: { tripId: parseInt(tripId) },
    });

    if (!checklist) {
      return res.status(404).json({ error: "Checklist não encontrada" });
    }

    // Adicionar item
    const item = await prisma.checklistItem.create({
      data: {
        checklistId: checklist.id,
        title,
        category: category || "other",
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res.status(500).json({ error: "Erro ao adicionar item" });
  }
};

// Marcar item como completo/incompleto
exports.toggleChecklistItem = async (req, res) => {
  try {
    const { tripId, itemId } = req.params;
    const userId = req.user.id;

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
        .json({ error: "Você não tem permissão para editar a checklist" });
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id: parseInt(itemId) },
    });

    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    // Verificar se pertence a essa viagem
    const checklist = await prisma.tripChecklist.findUnique({
      where: { id: item.checklistId },
    });

    if (checklist.tripId !== parseInt(tripId)) {
      return res
        .status(400)
        .json({ error: "Item não pertence a esta viagem" });
    }

    const updatedItem = await prisma.checklistItem.update({
      where: { id: parseInt(itemId) },
      data: { completed: !item.completed },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
};

// Deletar item da checklist
exports.deleteChecklistItem = async (req, res) => {
  try {
    const { tripId, itemId } = req.params;
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
        .json({ error: "Você não tem permissão para editar a checklist" });
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id: parseInt(itemId) },
    });

    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    // Verificar se pertence a essa viagem
    const checklist = await prisma.tripChecklist.findUnique({
      where: { id: item.checklistId },
    });

    if (checklist.tripId !== parseInt(tripId)) {
      return res
        .status(400)
        .json({ error: "Item não pertence a esta viagem" });
    }

    await prisma.checklistItem.delete({
      where: { id: parseInt(itemId) },
    });

    res.json({ message: "Item deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    res.status(500).json({ error: "Erro ao deletar item" });
  }
};

// Obter todos os templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = await prisma.checklistTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error("Erro ao obter templates:", error);
    res.status(500).json({ error: "Erro ao obter templates" });
  }
};