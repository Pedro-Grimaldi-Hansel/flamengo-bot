import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { fetchNextGame } from "./api.js";
import { fallbackNextGame } from "./fallback.js";
import { sendEmail } from "./email.js";

export default function startScheduler() {
  async function taskNoon() {
    console.log("⏰ Checando jogos…");

    let jogo = await fetchNextGame();
    if (!jogo) jogo = fallbackNextGame();

    if (!jogo.fixture) {
      await sendEmail(
        `⚠ Flamengo — jogos não disponíveis`,
        `<p>${jogo.message.replace(/\n\n/g, "</p><p>")}</p>`
      );
      return;
    }

    const horario = new Date(jogo.fixture.date);
    const hora = horario.getHours();

    if (hora >= 12) {
      await enviarResumo(jogo);
    }
  }

  async function taskEvening() {
    console.log("⏰ Checando jogos da manhã…");

    let jogo = await fetchNextGame();
    if (!jogo) return;

    const horario = new Date(jogo.fixture.date);
    const hora = horario.getHours();

    if (hora < 12) {
      await enviarResumo(jogo);
    }
  }

  cron.schedule("0 12 * * *", taskNoon);
  cron.schedule("0 20 * * *", taskEvening);

  // Run both checks once immediately on startup (configurable via RUN_ON_START)
  const runOnStart = process.env.RUN_ON_START !== "false";
  if (runOnStart) {
    taskNoon();
    taskEvening();
  }
}

async function enviarResumo(jogo) {
  const adversario =
    jogo.teams.home.id === process.env.FLAMENGO_TEAM_ID
      ? jogo.teams.away.name
      : jogo.teams.home.name;

  const estadio = jogo.fixture.venue.name;

  const html = `
    <h2>🔥 Próximo jogo do Flamengo</h2>
    <p><b>Adversário:</b> ${adversario}</p>
    <p><b>Data:</b> ${jogo.fixture.date}</p>
    <p><b>Local:</b> ${estadio}</p>
  `;

  await sendEmail("Próximo jogo do Flamengo 🔴⚫", html);
}
