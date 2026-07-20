import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Fonte de dados: football-data.org (plano gratuito)
// Docs: https://docs.football-data.org/general/v4/team.html
const BASE_URL = "https://api.football-data.org/v4";
const COMPETICAO = "BSA"; // Brasileirão Série A
const LIBERTADORES = "CLI"; // Copa Libertadores

// GET genérico com autenticação e log de uso
async function apiGet(path, params = {}) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN não definido no .env.");

  const { data, headers } = await axios.get(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    params,
  });

  const restantes = headers["x-requests-available-minute"];
  if (restantes !== undefined) {
    console.log(`ℹ️ football-data.org: ${restantes} requisições restantes neste minuto.`);
  }
  return data;
}

function explicarErro(err, contexto) {
  const status = err.response?.status;
  if (status === 429) {
    console.error(`❌ ${contexto}: limite de requisições excedido (429). Tente mais tarde.`);
  } else if (status === 403) {
    console.error(`❌ ${contexto}: acesso negado (403). Verifique o token ou a cobertura do plano.`);
  } else {
    console.error(`❌ ${contexto}:`, err.response?.data || err.message || err);
  }
}

function normalizarJogo(match) {
  return {
    id: match.id,
    fixture: {
      date: match.utcDate, // ISO em UTC, ex: "2026-03-15T21:30:00Z"
      venue: { name: match.venue ?? null },
    },
    teams: {
      home: { id: match.homeTeam.id, name: match.homeTeam.name },
      away: { id: match.awayTeam.id, name: match.awayTeam.name },
    },
    competicao: match.competition?.name ?? null,
    competicaoCode: match.competition?.code ?? null,
    stage: match.stage ?? null,
  };
}

export async function fetchNextGame(code = null) {
  const teamId = process.env.FLAMENGO_TEAM_ID;
  try {
    const to = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // +180 dias
    const fmt = (d) => d.toISOString().slice(0, 10);

    const data = await apiGet(`/teams/${teamId}/matches`, {
      status: "SCHEDULED",
      dateFrom: fmt(new Date()),
      dateTo: fmt(to),
      limit: 100,
    });

    let jogos = data.matches || [];
    if (code) jogos = jogos.filter((m) => m.competition?.code === code);

    if (jogos.length === 0) {
      console.log("ℹ️ Nenhum jogo agendado encontrado para o time.");
      return null;
    }

    jogos.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    return normalizarJogo(jogos[0]);
  } catch (err) {
    explicarErro(err, "próximo jogo");
    return null;
  }
}

export async function fetchClassificacao(teamId = process.env.FLAMENGO_TEAM_ID) {
  try {
    const data = await apiGet(`/competitions/${COMPETICAO}/standings`);
    const total = data.standings?.find((s) => s.type === "TOTAL");
    const linha = total?.table.find((t) => t.team.id === Number(teamId));
    if (!linha) return null;
    return {
      posicao: linha.position,
      pontos: linha.points,
      jogos: linha.playedGames,
      vitorias: linha.won,
      empates: linha.draw,
      derrotas: linha.lost,
      golsPro: linha.goalsFor,
      golsContra: linha.goalsAgainst,
      saldo: linha.goalDifference,
    };
  } catch (err) {
    explicarErro(err, "classificação");
    return null;
  }
}

export async function fetchArtilheiros(
  limit = 5,
  teamId = process.env.FLAMENGO_TEAM_ID,
  code = COMPETICAO
) {
  try {
    const data = await apiGet(`/competitions/${code}/scorers`, { limit });
    return (data.scorers || []).map((s) => ({
      nome: s.player?.name ?? "—",
      time: s.team?.name ?? "—",
      gols: s.goals ?? 0,
      assistencias: s.assists ?? 0,
      doFlamengo: s.team?.id === Number(teamId),
    }));
  } catch (err) {
    explicarErro(err, "artilheiros");
    return null;
  }
}

export async function fetchGrupoLiberta(teamId = process.env.FLAMENGO_TEAM_ID) {
  try {
    const data = await apiGet(`/competitions/${LIBERTADORES}/standings`);
    for (const bloco of data.standings || []) {
      const linha = bloco.table?.find((t) => t.team.id === Number(teamId));
      if (linha) {
        return {
          grupo: bloco.group ?? bloco.stage ?? "—",
          posicao: linha.position,
          pontos: linha.points,
          jogos: linha.playedGames,
          vitorias: linha.won,
          empates: linha.draw,
          derrotas: linha.lost,
          saldo: linha.goalDifference,
        };
      }
    }
    return null;
  } catch (err) {
    explicarErro(err, "grupo Libertadores");
    return null;
  }
}

// Busca a janela máxima permitida no plano gratuito (~2 anos; o limite da API é 750 dias e temporadas antigas são bloqueadas)
export async function fetchJogosFinalizados(
  teamId = process.env.FLAMENGO_TEAM_ID,
  dias = 745
) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - dias * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD

    const data = await apiGet(`/teams/${teamId}/matches`, {
      status: "FINISHED",
      dateFrom: fmt(from),
      dateTo: fmt(to),
      limit: 200,
    });
    return (data.matches || [])
      .slice()
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
  } catch (err) {
    explicarErro(err, "jogos finalizados");
    return null;
  }
}
