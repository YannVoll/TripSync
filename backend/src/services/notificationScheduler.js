const prisma = require("../prisma");
const { sendTripReminder } = require("./emailService");

const RETRY_DELAY = 30 * 60 * 1000;
const retryAfter = new Map();
let isRunning = false;

async function processScheduledNotifications() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const pendingNotifications = await prisma.tripNotification.findMany({
      where: { sentAt: null, trip: { startDate: { gt: now } } },
      include: { trip: { select: { title: true, startDate: true } } },
    });

    for (const notification of pendingNotifications) {
      const scheduledDate = new Date(notification.trip.startDate);
      scheduledDate.setDate(scheduledDate.getDate() - notification.daysBefore);
      if (scheduledDate > now) continue;
      if ((retryAfter.get(notification.id) ?? 0) > now.getTime()) continue;

      const daysLeft = Math.max(
        1,
        Math.ceil((new Date(notification.trip.startDate) - now) / 86400000)
      );

      try {
        await sendTripReminder(notification.email, notification.trip.title, daysLeft);
        await prisma.tripNotification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
        retryAfter.delete(notification.id);
      } catch (error) {
        retryAfter.set(notification.id, now.getTime() + RETRY_DELAY);
        console.error(
          `Erro ao enviar notificação ${notification.id} (nova tentativa em 30 min):`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Erro ao processar notificações agendadas:", error);
  } finally {
    isRunning = false;
  }
}

function startNotificationScheduler() {
  processScheduledNotifications();
  setInterval(processScheduledNotifications, 60_000);
}

module.exports = { startNotificationScheduler, processScheduledNotifications };
