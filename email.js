import nodemailer from "nodemailer";

function parseDestinatarios(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr.map((e) => String(e).trim()).filter(Boolean);
      }
    } catch {
      // JSON inválido tratado no modo tolerante abaixo
    }
  }

  return trimmed
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((e) => e.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

export async function sendEmail(subject, html) {
  const destinatarios = parseDestinatarios(process.env.EMAIL_TO);
  if (destinatarios.length === 0) {
    console.error("❌ EMAIL_TO vazio — nenhum destinatário configurado.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Bot Flamenguista 🔴⚫" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_FROM,
      bcc: destinatarios,
      subject,
      html,
    });

    console.log(
      `📧 Email enviado para ${destinatarios.length} destinatário(s)! ID:`,
      info.messageId
    );
  } catch (err) {
    console.error("❌ ERRO AO ENVIAR EMAIL:", err);
  }
}
