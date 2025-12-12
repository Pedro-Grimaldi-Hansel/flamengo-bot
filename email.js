import nodemailer from "nodemailer";

export async function sendEmail(subject, html) {
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
      to: process.env.EMAIL_TO,
      subject,
      html,
    });

    console.log("📧 Email enviado! ID:", info.messageId);

  } catch (err) {
    console.error("❌ ERRO AO ENVIAR EMAIL:", err);
  }
}
