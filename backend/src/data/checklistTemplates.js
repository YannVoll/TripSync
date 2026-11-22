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

module.exports = checklistTemplates;
