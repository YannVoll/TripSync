require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/prisma");
const checklistTemplates = require("../src/data/checklistTemplates");

const DEMO_PASSWORD = "tripsync123";

function daysFromNow(days, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function upsertUser(name, email, password) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, password },
  });
}

async function seedTemplates() {
  for (const [tripType, template] of Object.entries(checklistTemplates)) {
    await prisma.checklistTemplate.upsert({
      where: { tripType },
      update: { name: template.name, items: template.items },
      create: { tripType, name: template.name, items: template.items },
    });
  }
}

async function seedProperties(bruno, carla) {
  if (await prisma.property.count({ where: { ownerId: { in: [bruno.id, carla.id] } } })) {
    return prisma.property.findMany({ where: { ownerId: { in: [bruno.id, carla.id] } } });
  }
  const data = [
    {
      title: "Pousada Pé na Areia",
      description: "Pousada aconchegante a 50 metros da praia da Joaquina, com café da manhã incluso.",
      type: "POUSADA",
      address: "Rua das Gaivotas, 120",
      city: "Florianópolis",
      state: "SC",
      pricePerNight: 280,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Café da manhã", "Estacionamento"],
      imageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800",
      ownerId: bruno.id,
    },
    {
      title: "Apartamento vista mar na Lagoa",
      description: "Apartamento moderno com varanda e vista para a Lagoa da Conceição.",
      type: "APARTMENT",
      address: "Av. das Rendeiras, 1500",
      city: "Florianópolis",
      state: "SC",
      pricePerNight: 350,
      maxGuests: 3,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha"],
      imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      ownerId: carla.id,
    },
    {
      title: "Chalé com lareira em Gramado",
      description: "Chalé romântico no meio da serra, com lareira e hidromassagem.",
      type: "HOUSE",
      address: "Rua Serra Azul, 45",
      city: "Gramado",
      state: "RS",
      pricePerNight: 520,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["Lareira", "Hidromassagem", "Wi-Fi"],
      imageUrl: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800",
      ownerId: bruno.id,
    },
    {
      title: "Hotel Central Paulista",
      description: "Hotel executivo a duas quadras da Avenida Paulista.",
      type: "HOTEL",
      address: "Rua Augusta, 900",
      city: "São Paulo",
      state: "SP",
      pricePerNight: 410,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Academia", "Café da manhã"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      ownerId: carla.id,
    },
    {
      title: "Casa colonial em Paraty",
      description: "Casa histórica no centro de Paraty, perto dos passeios de barco.",
      type: "HOUSE",
      address: "Rua do Comércio, 30",
      city: "Paraty",
      state: "RJ",
      pricePerNight: 460,
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ["Wi-Fi", "Piscina", "Churrasqueira"],
      imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      ownerId: bruno.id,
    },
  ];
  await prisma.property.createMany({ data });
  return prisma.property.findMany({ where: { ownerId: { in: [bruno.id, carla.id] } } });
}

async function seedReviews(ana, properties) {
  if (await prisma.review.count({ where: { authorId: ana.id } })) return;
  const reviews = [
    { title: "Pousada Pé na Areia", rating: 5, comment: "Atendimento impecável e café da manhã delicioso!" },
    { title: "Chalé com lareira em Gramado", rating: 4, comment: "Lugar lindo e confortável, só achei um pouco frio à noite." },
  ];
  for (const review of reviews) {
    const property = properties.find((p) => p.title === review.title);
    if (!property) continue;
    await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestId: ana.id,
        checkIn: daysFromNow(-40),
        checkOut: daysFromNow(-37),
        totalPrice: property.pricePerNight * 3,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: "credit_card",
      },
    });
    await prisma.review.create({
      data: { propertyId: property.id, authorId: ana.id, rating: review.rating, comment: review.comment },
    });
  }
}

async function createTrip({ owner, title, destination, tripType, start, nights, collaborators, activities, withChecklist }) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        title,
        destination,
        tripType,
        ownerId: owner.id,
        startDate: daysFromNow(start, 8),
        endDate: daysFromNow(start + nights, 18),
      },
    });
    await tx.tripHistory.create({
      data: { tripId: trip.id, userId: owner.id, action: "TRIP_CREATED", details: { title, tripType } },
    });
    for (const { user, role } of collaborators) {
      await tx.tripCollaborator.create({ data: { tripId: trip.id, userId: user.id, role } });
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          userId: owner.id,
          action: "COLLABORATOR_ADDED",
          details: { collaboratorId: user.id, name: user.name, role },
        },
      });
    }
    for (const activity of activities) {
      const created = await tx.tripActivity.create({
        data: {
          tripId: trip.id,
          title: activity.title,
          description: activity.description,
          startTime: daysFromNow(start + activity.day, activity.from),
          endTime: daysFromNow(start + activity.day, activity.to),
          createdById: activity.by.id,
        },
      });
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          userId: activity.by.id,
          action: "ACTIVITY_ADDED",
          details: { activityId: created.id, title: created.title },
        },
      });
      for (const comment of activity.comments ?? []) {
        await tx.comment.create({
          data: { activityId: created.id, authorId: comment.by.id, content: comment.text },
        });
      }
    }
    if (withChecklist) {
      const items = checklistTemplates[tripType].items;
      await tx.tripChecklist.create({
        data: {
          tripId: trip.id,
          items: {
            create: items.map((itemTitle, index) => ({
              title: itemTitle,
              category: "general",
              completed: index < Math.floor(items.length / 3),
            })),
          },
        },
      });
      await tx.tripHistory.create({
        data: { tripId: trip.id, userId: owner.id, action: "CHECKLIST_CREATED", details: { itemCount: items.length } },
      });
    }
    return trip;
  });
}

async function seedTrips(ana, bruno, carla) {
  if (await prisma.trip.count({ where: { ownerId: { in: [ana.id, bruno.id] } } })) return;

  const floripa = await createTrip({
    owner: ana,
    title: "Férias em Florianópolis",
    destination: "Florianópolis",
    tripType: "BEACH",
    start: 3,
    nights: 5,
    collaborators: [
      { user: bruno, role: "COLLABORATOR" },
      { user: carla, role: "VIEWER" },
    ],
    withChecklist: true,
    activities: [
      {
        title: "Trilha da Lagoinha do Leste",
        description: "Levar água e protetor. Saída do Pântano do Sul.",
        day: 1,
        from: 8,
        to: 12,
        by: ana,
        comments: [
          { by: bruno, text: "Bora! Eu levo os lanches 🥪" },
          { by: ana, text: "Perfeito, eu levo a água." },
        ],
      },
      {
        title: "Almoço no Ribeirão da Ilha",
        description: "Ostras frescas no restaurante Ostradamus.",
        day: 1,
        from: 13,
        to: 15,
        by: bruno,
      },
      {
        title: "Pôr do sol na Lagoa da Conceição",
        day: 2,
        from: 17,
        to: 19,
        by: ana,
        comments: [{ by: bruno, text: "Chegar cedo pra pegar lugar no mirante." }],
      },
    ],
  });

  await createTrip({
    owner: ana,
    title: "Inverno em Gramado",
    destination: "Gramado",
    tripType: "MOUNTAIN",
    start: 45,
    nights: 4,
    collaborators: [{ user: carla, role: "COLLABORATOR" }],
    withChecklist: false,
    activities: [
      { title: "Passeio no Lago Negro", day: 1, from: 10, to: 12, by: ana },
      { title: "Fondue no centro", day: 1, from: 20, to: 22, by: carla },
    ],
  });

  await createTrip({
    owner: bruno,
    title: "Congresso de Tecnologia",
    destination: "São Paulo",
    tripType: "BUSINESS",
    start: 20,
    nights: 2,
    collaborators: [{ user: ana, role: "VIEWER" }],
    withChecklist: true,
    activities: [{ title: "Palestra de abertura", day: 0, from: 9, to: 11, by: bruno }],
  });

  return floripa;
}

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ana = await upsertUser("Ana Souza", "ana@tripsync.dev", password);
  const bruno = await upsertUser("Bruno Lima", "bruno@tripsync.dev", password);
  const carla = await upsertUser("Carla Mendes", "carla@tripsync.dev", password);

  await seedTemplates();
  const properties = await seedProperties(bruno, carla);
  await seedReviews(ana, properties);
  await seedTrips(ana, bruno, carla);

  console.log("✅ Seed concluído. Contas de demonstração (senha: tripsync123):");
  console.log("   ana@tripsync.dev  · bruno@tripsync.dev  · carla@tripsync.dev");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
