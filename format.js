const TZ = "America/Sao_Paulo";

// Hora (0-23) do jogo no fuso do Brasil, independente do fuso do servidor
export function horaBrasilia(dateStr) {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(dateStr));
  return Number(hora);
}

// Data completa, ex: "15/03/2026 às 21:30"
export function dataBrasilia(dateStr) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(dateStr))
    .replace(",", " às");
}

// Data curta, ex: "15/03/2026"
export function dataCurta(dateStr) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Data no formato ISO curto no fuso do Brasil, ex: "2026-03-15"
export function dataBrasilISO(dateStr) {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

// Resultado de um jogo do ponto de vista do time: "V" | "E" | "D"
export function resultadoParaTime(match, teamId) {
  const isHome = match.homeTeam.id === Number(teamId);
  const w = match.score?.winner;
  if (w === "DRAW") return "E";
  if ((w === "HOME_TEAM" && isHome) || (w === "AWAY_TEAM" && !isHome)) return "V";
  return "D";
}

const EMOJI = { V: "🟢", E: "🟡", D: "🔴" };
const BRASILEIRAO_CODE = "BSA";

// Forma recente: os n jogos mais recentes como emojis (matches já vem ordenado do mais recente para o mais antigo). Retorna string, ex: "🟢🟢🟡🔴🟢"
export function calcularForma(matches, teamId, n = 5) {
  if (!matches || matches.length === 0) return null;
  return matches
    .slice(0, n)
    .map((m) => EMOJI[resultadoParaTime(m, teamId)])
    .join("");
}

// Retorna `null` quando os dados não vieram (falha) — para não confundir com "confronto inédito" (que é a lista vazia `[]`)
export function confrontoDireto(matches, adversarioId, n = 5) {
  if (!matches) return null;
  return matches
    .filter(
      (m) =>
        m.homeTeam.id === Number(adversarioId) ||
        m.awayTeam.id === Number(adversarioId)
    )
    .slice(0, n)
    .map((m) => ({
      data: dataCurta(m.utcDate),
      texto: `${m.homeTeam.name} ${m.score.fullTime.home} x ${m.score.fullTime.away} ${m.awayTeam.name}`,
      competicao: m.competition?.name ?? null,
      ehBrasileirao: m.competition?.code === BRASILEIRAO_CODE,
    }));
}

// Histórico numa competição: últimos n jogos do time filtrados pelo código da competição (ex.: "BSA" = Brasileirão, "CLI" = Libertadores)
export function historicoNaCompeticao(matches, teamId, code = BRASILEIRAO_CODE, n = 5) {
  if (!matches) return null;
  return matches
    .filter((m) => m.competition?.code === code)
    .slice(0, n)
    .map((m) => ({
      data: dataCurta(m.utcDate),
      texto: `${m.homeTeam.name} ${m.score.fullTime.home} x ${m.score.fullTime.away} ${m.awayTeam.name}`,
      resultado: resultadoParaTime(m, teamId),
    }));
}

// Tradução das fases (stage) da Copa Libertadores
const STAGE_PT = {
  GROUP_STAGE: "Fase de grupos",
  PLAY_OFFS: "Playoffs (mata-mata)",
  LAST_16: "Oitavas de final",
  QUARTER_FINALS: "Quartas de final",
  SEMI_FINALS: "Semifinal",
  FINAL: "Final",
};
export function traduzirFase(stage) {
  return STAGE_PT[stage] ?? stage ?? "—";
}

function secaoClassificacao(c) {
  if (!c) return "";
  return `
    <h3>📊 Classificação (Brasileirão)</h3>
    <p>
      <b>${c.posicao}º lugar</b> — ${c.pontos} pts em ${c.jogos} jogos<br/>
      ${c.vitorias}V ${c.empates}E ${c.derrotas}D · Saldo: ${c.saldo >= 0 ? "+" : ""}${c.saldo} (${c.golsPro} GP / ${c.golsContra} GC)
    </p>`;
}

function secaoForma(forma) {
  if (!forma) return "";
  return `
    <h3>📈 Forma recente (todas as competições)</h3>
    <p style="font-size:18px;letter-spacing:2px;">${forma}</p>
    <p style="font-size:12px;color:#666;">(mais recente à esquerda · 🟢 vitória 🟡 empate 🔴 derrota)</p>`;
}

function secaoLibertadores(liberta) {
  if (!liberta) return "";
  const { stage, grupo, posicao, pontos, vitorias, empates, derrotas, saldo } =
    liberta;
  const campanha =
    posicao != null
      ? `<p><b>Campanha na fase de grupos (${grupo}):</b> ${posicao}º lugar — ${pontos} pts (${vitorias}V ${empates}E ${derrotas}D · saldo ${saldo >= 0 ? "+" : ""}${saldo})</p>`
      : "";
  return `
    <h3>🏆 Copa Libertadores</h3>
    <p><b>Fase:</b> ${traduzirFase(stage)}</p>
    ${campanha}`;
}

function secaoArtilheiros(artilheiros, label) {
  if (!artilheiros || artilheiros.length === 0) return "";
  const linhas = artilheiros
    .map((a) => {
      const nome = a.doFlamengo ? `<b>${a.nome} 🔴⚫</b>` : a.nome;
      return `<li>${nome} — ${a.gols} gols <span style="color:#666;">(${a.time})</span></li>`;
    })
    .join("");
  return `
    <h3>👟 Artilheiros — ${label}</h3>
    <ol>${linhas}</ol>`;
}

function secaoConfronto(h2h, adversario) {
  if (h2h === null) return "";
  if (h2h.length === 0) {
    return `
    <h3>🆚 Confronto direto com ${adversario}</h3>
    <p><b>Confronto inédito!</b> É a primeira vez (no período disponível) que o Flamengo enfrenta ${adversario}.</p>`;
  }
  const linhas = h2h
    .map((j) => {
      // Ressalva quando o confronto não foi pelo Brasileirão.
      const ressalva = j.ehBrasileirao
        ? ""
        : ` <span style="color:#b8860b;">— ${j.competicao}</span>`;
      return `<li>${j.data} — ${j.texto}${ressalva}</li>`;
    })
    .join("");
  return `
    <h3>🆚 Confronto direto com ${adversario} (últimos ${h2h.length})</h3>
    <ul>${linhas}</ul>`;
}

function secaoHistorico(hist, label) {
  if (!hist || hist.length === 0) return "";
  const linhas = hist
    .map((j) => `<li>${EMOJI[j.resultado]} ${j.data} — ${j.texto}</li>`)
    .join("");
  return `
    <h3>📅 Histórico — ${label} (últimos ${hist.length})</h3>
    <ul>${linhas}</ul>`;
}

// E-mail de pré-jogo
export function buildResumoHtml({
  jogo,
  flamengoId,
  classificacao,
  liberta,
  forma,
  artilheiros,
  artilheirosLabel,
  h2h,
  historico,
  historicoLabel,
}) {
  const flamengoEmCasa = jogo.teams.home.id === Number(flamengoId);
  const adversario = flamengoEmCasa
    ? jogo.teams.away.name
    : jogo.teams.home.name;
  const mando = flamengoEmCasa ? "Casa 🏠" : "Fora ✈️";
  const estadio = jogo.fixture.venue?.name ?? "A definir";
  const competicao = jogo.competicao ?? "—";

  return `
    <h2>🔥 Próximo jogo do Flamengo</h2>
    <p><b>Adversário:</b> ${adversario}</p>
    <p><b>Competição:</b> ${competicao}</p>
    <p><b>Data:</b> ${dataBrasilia(jogo.fixture.date)}</p>
    <p><b>Mando:</b> ${mando}</p>
    <p><b>Local:</b> ${estadio}</p>
    <hr/>
    ${secaoClassificacao(classificacao)}
    ${secaoLibertadores(liberta)}
    ${secaoForma(forma)}
    ${secaoHistorico(historico, historicoLabel)}
    ${secaoConfronto(h2h, adversario)}
    ${secaoArtilheiros(artilheiros, artilheirosLabel)}
  `;
}

// E-mail de placar pós-jogo, `match` é um jogo cru (FINISHED) da API
export function buildResultadoHtml(match, flamengoId) {
  const flamengoEmCasa = match.homeTeam.id === Number(flamengoId);
  const mando = flamengoEmCasa ? "Casa 🏠" : "Fora ✈️";
  const placar = match.score.fullTime;

  const r = resultadoParaTime(match, flamengoId);
  const desfecho =
    r === "V" ? "Vitória do Mengão! 🎉🔴⚫" : r === "E" ? "Empate 😐" : "Derrota 😞";

  return `
    <h2>📣 Resultado do Flamengo</h2>
    <p style="font-size:22px;"><b>${match.homeTeam.name} ${placar.home} x ${placar.away} ${match.awayTeam.name}</b></p>
    <p><b>${desfecho}</b></p>
    <p><b>Competição:</b> ${match.competition?.name ?? "—"}</p>
    <p><b>Data:</b> ${dataBrasilia(match.utcDate)}</p>
    <p><b>Mando:</b> ${mando}</p>
  `;
}
