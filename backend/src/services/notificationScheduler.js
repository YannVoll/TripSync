const prisma = require("../prisma");
const { sendTripReminder } = require("./emailService");

let isRunning = false;

async function processScheduledNotifications() {
  if (isRunning) return;
  isRunning = true;

  try {
    const pendingNotifications = await prisma.tripNotification.findMany({
      where: { sentAt: null },
      include: { trip: true },
    });
    const now = new Date();

    for (const notification of pendingNotifications) {
      const scheduledDate = new Date(notification.trip.startDate);
      scheduledDate.setDate(scheduledDate.getDate() - notification.daysBefore);

      if (scheduledDate > now) continue;

      try {
        await sendTripReminder(
          notification.email,
          notification.trip.title,
          notification.daysBefore
        );
        await prisma.tripNotification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
      } catch (error) {
        console.error(`Erro ao enviar notificação ${notification.id}:`, error);
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

module.exports = { startNotificationScheduler };
