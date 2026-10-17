const prisma = require("../prisma");
const { sendTestEmail } = require("../services/emailService");

const sendTestNotification = async (req, res) => {
  try {
    const tripId = Number(req.body.tripId);
    const { email } = req.body;
    const userId = req.userId;

    if (!Number.isInteger(tripId) || tripId <= 0) {
      return res.status(400).json({ error: "Selecione uma viagem válida" });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Informe um email válido" });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { collaborators: true },
    });
    if (!trip) {
      return res.status(404).json({ error: "Viagem não encontrada" });
    }

    const hasAccess =
      trip.ownerId === userId ||
      trip.collaborators.some((collaborator) => collaborator.userId === userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Sem permissão para acessar esta viagem" });
    }

    const result = await sendTestEmail(email, trip.title);
    res.json({
      message: "O servidor de email aceitou a mensagem de teste.",
      messageId: result.messageId,
    });
  } catch (error) {
    if (error.code === "EMAIL_CONFIGURATION") {
      return res.status(503).json({ error: error.message });
    }
    console.error("Erro ao enviar email de teste:", error);
    if (error.code === "EAUTH" || error.responseCode === 535) {
      return res.status(502).json({
        error: "O Resend recusou a chave de API. Confira RESEND_API_KEY no arquivo backend/.env.",
      });
    }
    if (error.code === "ETIMEDOUT" || error.code === "ECONNECTION" || error.code === "ESOCKET") {
      return res.status(502).json({
        error: "Não foi possível conectar ao SMTP do Resend. Confira a conexão com a internet.",
      });
    }
    if (error.code === "EENVELOPE" || error.responseCode === 550) {
      return res.status(502).json({
        error:
          "O Resend recusou o remetente ou destinatário. Com onboarding@resend.dev, envie somente para o email da sua conta Resend; para outros destinos, configure um domínio verificado em resend.com/domains e defina EMAIL_FROM.",
      });
    }
    res.status(502).json({
      error: "O SMTP do Resend não conseguiu enviar o email. Consulte o log do backend para ver o erro.",
    });
  }
};

const scheduleNotification = async (req, res) => {
  try {
    const tripId = Number(req.body.tripId);
    const { email } = req.body;
    const daysBefore = Number(req.body.daysBefore ?? req.body.daysBeforeTrip ?? 1);
    const userId = req.userId;

    if (!Number.isInteger(tripId) || tripId <= 0) {
      return res.status(400).json({ error: "Selecione uma viagem válida" });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Informe um email válido" });
    }
    if (!Number.isInteger(daysBefore) || daysBefore < 1 || daysBefore > 30) {
      return res.status(400).json({ error: "Os dias de antecedência devem estar entre 1 e 30" });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { collaborators: true }
    });

    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });

    const isOwner = trip.ownerId === userId;
    const isCollaborator = trip.collaborators.some(c => c.userId === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Sem permissão" });
    }

    const tripStartDate = new Date(trip.startDate);
    const notificationDate = new Date(tripStartDate);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);

    const notification = await prisma.tripNotification.create({
      data: {
        tripId,
        userId,
        email,
        daysBefore
      }
    });

    res.status(201).json({
      notification,
      message: `Notificação agendada para ${notificationDate.toLocaleDateString('pt-BR')}`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao agendar notificação" });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await prisma.tripNotification.findMany({
      where: { userId },
      include: { trip: true },
      orderBy: { createdAt: "asc" }
    });

    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
};

module.exports = { scheduleNotification, getMyNotifications, sendTestNotification };
