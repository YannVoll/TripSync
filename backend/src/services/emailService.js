const nodemailer = require("nodemailer");

const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const emailFrom = process.env.EMAIL_FROM || "TripSync <onboarding@resend.dev>";
const emailPort = Number(process.env.RESEND_SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: emailPort,
  secure: emailPort === 465,
  auth: resendApiKey ? { user: "resend", pass: resendApiKey } : undefined,
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function assertEmailConfigured() {
  if (!resendApiKey || resendApiKey === "re_your_api_key") {
    const error = new Error(
      "Configure RESEND_API_KEY no arquivo backend/.env. Crie uma chave em resend.com/api-keys."
    );
    error.code = "EMAIL_CONFIGURATION";
    throw error;
  }
}

const sendTripReminder = async (userEmail, tripTitle, daysUntilTrip) => {
  assertEmailConfigured();
  const title = escapeHtml(tripTitle);
  const days = daysUntilTrip === 1 ? "1 dia" : `${daysUntilTrip} dias`;
  return transporter.sendMail({
    from: emailFrom,
    to: userEmail,
    subject: `⏰ Lembrete: Sua viagem "${tripTitle}" está chegando!`,
    html: `
      <h2>Olá! 👋</h2>
      <p>Sua viagem <strong>${title}</strong> começa em <strong>${days}</strong>!</p>
      <p>Não se esqueça de:</p>
      <ul>
        <li>Confirmar voos e hospedagem</li>
        <li>Atualizar sua checklist</li>
        <li>Coordenar com colaboradores</li>
        <li>Preparar documentos necessários</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/trips" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Viagem</a></p>
      <p>Ótima viagem! 🌍</p>
    `,
  });
};

const sendTestEmail = async (userEmail, tripTitle) => {
  assertEmailConfigured();
  return transporter.sendMail({
    from: emailFrom,
    to: userEmail,
    subject: "Teste de envio de email - TripSync",
    html: `
      <h2>Teste de envio concluído</h2>
      <p>Este é um email de teste do TripSync para a viagem <strong>${escapeHtml(tripTitle)}</strong>.</p>
      <p>Se você recebeu esta mensagem, a configuração SMTP conseguiu entregar o email ao servidor destinatário.</p>
    `,
  });
};

module.exports = { sendTripReminder, sendTestEmail, escapeHtml };
