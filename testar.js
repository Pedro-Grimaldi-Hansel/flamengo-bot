import dotenv from "dotenv";
dotenv.config();

import { fetchNextGame, fetchJogosFinalizados } from "./api.js";
import { fallbackNextGame } from "./fallback.js";
import { enviarResumo, montarResumoHtml, enviarResultado } from "./schedule.js";
import { sendEmail } from "./email.js";
import { buildResultadoHtml } from "./format.js";

// Arquivo de teste: dispara o e-mail AGORA, ignorando a checagem de
// horário (12h/20h). Útil para validar o funcionamento fora das horas
// programadas.
//
// Uso:
//   node testar.js               -> pré-jogo: busca o jogo real e ENVIA
//   node testar.js --dry         -> pré-jogo: só mostra no console, NÃO envia
//   node testar.js --fallback    -> força a mensagem de fallback (sem jogo)
//   node testar.js --liberta     -> pré-jogo do próximo jogo da Libertadores
//   node testar.js --resultado   -> placar: último jogo finalizado, ENVIA
//   node testar.js --resultado --dry -> placar: só mostra no console

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const forcarFallback = args.includes("--fallback");
const modoResultado = args.includes("--resultado");
const modoLiberta = args.includes("--liberta");

async function testarResultado() {
  const finalizados = await fetchJogosFinalizados();
  if (!finalizados || finalizados.length === 0) {
    console.log("↪ Nenhum jogo finalizado disponível na API.");
    return;
  }
  const match = finalizados[0]; // mais recente
  const placar = match.score.fullTime;
  console.log("Último jogo finalizado:");
  console.log(`  ${match.homeTeam.name} ${placar.home} x ${placar.away} ${match.awayTeam.name}`);
  console.log("  Competição:", match.competition?.name ?? "—");
  console.log("  Data (UTC/API):", match.utcDate);

  if (dryRun) {
    console.log("\n[dry-run] HTML do e-mail de placar:\n");
    console.log(buildResultadoHtml(match, process.env.FLAMENGO_TEAM_ID));
    return;
  }
  await enviarResultado(match);
}

async function main() {
  console.log("🧪 Teste do Bot do Flamengo — envio fora do horário programado");

  if (modoResultado) {
    await testarResultado();
    return;
  }

  let jogo;
  if (forcarFallback) {
    console.log("↪ Forçando fallback (nenhum jogo).");
    jogo = fallbackNextGame();
  } else if (modoLiberta) {
    console.log("↪ Buscando o próximo jogo da Libertadores (CLI).");
    jogo = await fetchNextGame("CLI");
    if (!jogo) {
      console.log("↪ Nenhum jogo da Libertadores agendado.");
      return;
    }
  } else {
    jogo = await fetchNextGame();
    if (!jogo) {
      console.log("↪ API sem jogos; usando fallback.");
      jogo = fallbackNextGame();
    }
  }

  if (!jogo.fixture) {
    const subject = "⚠ Flamengo — jogos não disponíveis (TESTE)";
    const html = `<p>${jogo.message.replace(/\n\n/g, "</p><p>")}</p>`;
    if (dryRun) {
      console.log("[dry-run] Assunto:", subject);
      console.log("[dry-run] HTML:\n" + html);
      return;
    }
    await sendEmail(subject, html);
    return;
  }

  console.log("Próximo jogo encontrado:");
  console.log("  Data (UTC/API):", jogo.fixture.date);
  console.log("  Casa:", jogo.teams.home.name, "(id", jogo.teams.home.id + ")");
  console.log("  Visitante:", jogo.teams.away.name, "(id", jogo.teams.away.id + ")");
  console.log("  Estádio:", jogo.fixture.venue?.name ?? "A definir");

  if (dryRun) {
    console.log("\n[dry-run] HTML do e-mail de pré-jogo:\n");
    console.log(await montarResumoHtml(jogo));
    return;
  }

  await enviarResumo(jogo);
}

main()
  .then(() => {
    console.log("✅ Teste concluído.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro no teste:", err);
    process.exit(1);
  });
