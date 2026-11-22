const prisma = require("../prisma");
const { sendTestEmail } = require("../services/emailService");
const { getTripAccess, parseId } = require("../lib/tripAccess");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reminderDate(startDate, daysBefore) {
  const date = new Date(startDate);
  date.setDate(date.getDate() - daysBefore);
  return date;
}

async function validateRequest(req, res) {
  const tripId = parseId(req.body.tripId);
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!tripId) {
    res.status(400).json({ error: "Selecione uma viagem válida" });
    return null;
  }
  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Informe um email válido" });
    return null;
  }
  const access = await getTripAccess(tripId, req.userId);
  if (!access) {
    res.status(404).json({ error: "Viagem não encontrada" });
    return null;
  }
  if (!access.canRead) {
    res.status(403).json({ error: "Sem permissão para acessar esta viagem" });
    return null;
  }
  return { trip: access.trip, email };
}

function emailErrorResponse(error) {
  if (error.code === "EMAIL_CONFIGURATION") return [503, error.message];
  if (error.code === "EAUTH" || error.responseCode === 535) {
    return [502, "O Resend recusou a chave de API. Confira RESEND_API_KEY no arquivo backend/.env."];
  }
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(error.code)) {
    return [502, "Não foi possível conectar ao SMTP do Resend. Confira a conexão com a internet."];
  }
  if (error.code === "EENVELOPE" || error.responseCode === 550) {
    return [
      502,
      "O Resend recusou o remetente ou destinatário. Com onboarding@resend.dev, envie somente para o email da sua conta Resend; para outros destinos, configure um domínio verificado em resend.com/domains e defina EMAIL_FROM.",
    ];
  }
  return [502, "O SMTP do Resend não conseguiu enviar o email. Consulte o log do backend para ver o erro."];
}

const sendTestNotification = async (req, res) => {
  try {
    const valid = await validateRequest(req, res);
    if (!valid) return;
    const result = await sendTestEmail(valid.email, valid.trip.title);
    res.json({
      message: "O servidor de email aceitou a mensagem de teste.",
      messageId: result.messageId,
    });
  } catch (error) {
    if (error.code !== "EMAIL_CONFIGURATION") console.error("Erro ao enviar email de teste:", error);
    const [status, message] = emailErrorResponse(error);
    res.status(status).json({ error: message });
  }
};

const scheduleNotification = async (req, res) => {
  try {
    const daysBefore = Number(req.body.daysBefore ?? 1);
    if (!Number.isInteger(daysBefore) || daysBefore < 1 || daysBefore > 30) {
      return res.status(400).json({ error: "Os dias de antecedência devem estar entre 1 e 30" });
    }
    const valid = await validateRequest(req, res);
    if (!valid) return;
    const { trip, email } = valid;

    if (new Date(trip.startDate) <= new Date()) {
      return res.status(400).json({ error: "Esta viagem já começou. Escolha uma viagem futura." });
    }

    const duplicate = await prisma.tripNotification.findFirst({
      where: { tripId: trip.id, userId: req.userId, email, daysBefore, sentAt: null },
    });
    if (duplicate) {
      return res.status(409).json({ error: "Você já agendou este lembrete." });
    }

    const notification = await prisma.tripNotification.create({
      data: { tripId: trip.id, userId: req.userId, email, daysBefore },
      include: { trip: { select: { id: true, title: true, startDate: true } } },
    });

    const sendAt = reminderDate(trip.startDate, daysBefore);
    res.status(201).json({
      notification,
      message:
        sendAt <= new Date()
          ? "Lembrete agendado! Como a data já chegou, ele será enviado no próximo minuto."
          : `Lembrete agendado para ${sendAt.toLocaleDateString("pt-BR")}.`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao agendar notificação" });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.tripNotification.findMany({
      where: { userId: req.userId },
      include: { trip: { select: { id: true, title: true, startDate: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      notifications.map((notification) => ({
        ...notification,
        sendAt: reminderDate(notification.trip.startDate, notification.daysBefore),
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const notification = id ? await prisma.tripNotification.findUnique({ where: { id } }) : null;
    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }
    await prisma.tripNotification.delete({ where: { id: notification.id } });
    res.json({ message: "Lembrete removido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao remover lembrete" });
  }
};

module.exports = { scheduleNotification, getMyNotifications, sendTestNotification, deleteNotification };
