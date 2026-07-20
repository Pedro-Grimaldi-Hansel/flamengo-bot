import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import {
  fetchNextGame,
  fetchClassificacao,
  fetchArtilheiros,
  fetchGrupoLiberta,
  fetchJogosFinalizados,
} from "./api.js";
import { fallbackNextGame } from "./fallback.js";
import { sendEmail } from "./email.js";
import {
  horaBrasilia,
  dataBrasilISO,
  calcularForma,
  confrontoDireto,
  historicoNaCompeticao,
  buildResumoHtml,
  buildResultadoHtml,
} from "./format.js";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Datas de referência no fuso do Brasil
function hojeISO() {
  return dataBrasilISO(new Date());
}
function amanhaISO() {
  return dataBrasilISO(new Date(Date.now() + UM_DIA_MS));
}
function ontemISO() {
  return dataBrasilISO(new Date(Date.now() - UM_DIA_MS));
}

// Checagem do meio-dia: envia o resumo se o jogo é HOJE e à tarde/noite
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

  const ehHoje = dataBrasilISO(jogo.fixture.date) === hojeISO();
  if (ehHoje && horaBrasilia(jogo.fixture.date) >= 12) {
    await enviarResumo(jogo);
  } else {
    console.log("↪ Nenhum jogo à tarde/noite hoje.");
  }
}

// Checagem da noite: envia o resumo se o jogo é AMANHÃ de manhã
async function taskEvening() {
  console.log("⏰ Checando jogos da manhã…");

  const jogo = await fetchNextGame();
  if (!jogo) return;

  const ehAmanha = dataBrasilISO(jogo.fixture.date) === amanhaISO();
  if (ehAmanha && horaBrasilia(jogo.fixture.date) < 12) {
    await enviarResumo(jogo);
  } else {
    console.log("↪ Nenhum jogo de manhã amanhã.");
  }
}

// Checagem de resultado: envia o placar de todo jogo cuja data (Brasília) foi ONTEM
async function taskResultado() {
  console.log("⏰ Checando resultado do jogo de ontem…");

  const matches = await fetchJogosFinalizados();
  if (!matches || matches.length === 0) return;

  const ontem = ontemISO();
  const deOntem = matches.filter((m) => dataBrasilISO(m.utcDate) === ontem);

  if (deOntem.length === 0) {
    console.log("↪ Nenhum jogo do Flamengo ontem.");
    return;
  }
  for (const m of deOntem) {
    await enviarResultado(m);
  }
}

// Execução única: checa e envia uma vez, sem manter o processo vivo, usada pelo GitHub Actions / cron do SO (ver runOnce.js)
export async function runOnce() {
  await taskResultado();
  await taskNoon();
  await taskEvening();
}

// Modo "sempre ligado": mantém o processo vivo com node-cron
export default function startScheduler() {
  cron.schedule("0 9 * * *", taskResultado);
  cron.schedule("0 12 * * *", taskNoon);
  cron.schedule("0 20 * * *", taskEvening);

  // Executa as checagens uma vez ao iniciar (configurável via RUN_ON_START)
  const runOnStart = process.env.RUN_ON_START !== "false";
  if (runOnStart) {
    runOnce();
  }
}

// Monta o HTML do pré-jogo, adaptando as seções específicas à competição do jogo (Brasileirão x Libertadores)
// Separado do envio para permitir pré-visualização em testes
export async function montarResumoHtml(jogo) {
  const flamengoId = process.env.FLAMENGO_TEAM_ID;
  const flamengoEmCasa = jogo.teams.home.id === Number(flamengoId);
  const adversarioId = flamengoEmCasa
    ? jogo.teams.away.id
    : jogo.teams.home.id;

  const ehLiberta = jogo.competicaoCode === "CLI";
  const code = ehLiberta ? "CLI" : "BSA";
  const label = ehLiberta ? "Libertadores" : "Brasileirão";

  const [tabela, artilheiros, finalizados] = await Promise.all([
    ehLiberta ? fetchGrupoLiberta(flamengoId) : fetchClassificacao(flamengoId),
    fetchArtilheiros(5, flamengoId, code),
    fetchJogosFinalizados(flamengoId),
  ]);

  const forma = calcularForma(finalizados, flamengoId, 5);
  const h2h = confrontoDireto(finalizados, adversarioId, 5);
  const historico = historicoNaCompeticao(finalizados, flamengoId, code, 5);

  return buildResumoHtml({
    jogo,
    flamengoId,
    classificacao: ehLiberta ? null : tabela,
    liberta: ehLiberta && tabela ? { ...tabela, stage: jogo.stage } : null,
    forma,
    artilheiros,
    artilheirosLabel: label,
    h2h,
    historico,
    historicoLabel: label,
  });
}

// E-mail de pré-jogo
export async function enviarResumo(jogo) {
  const html = await montarResumoHtml(jogo);
  await sendEmail("Próximo jogo do Flamengo:", html);
}

// E-mail de placar pós-jogo
export async function enviarResultado(match) {
  const flamengoId = process.env.FLAMENGO_TEAM_ID;
  const placar = match.score.fullTime;
  const subject = `Resultado: ${match.homeTeam.name} ${placar.home} x ${placar.away} ${match.awayTeam.name}`;
  const html = buildResultadoHtml(match, flamengoId);
  await sendEmail(subject, html);
}
