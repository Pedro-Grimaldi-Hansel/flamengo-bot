import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function fetchNextGame() {
  const season = new Date().getFullYear(); // Ex: 2025, 2026…
  try {
    const { data } = await axios.get(
      "https://v3.football.api-sports.io/fixtures",
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY
        },
        params: {
          team: process.env.FLAMENGO_TEAM_ID,
          season: season,
          status: "NS" // Not Started
        }
      }
    );

    const jogos = data.response;

    if (!jogos || jogos.length === 0) {
      return null; // API ainda não tem jogos
    }

    jogos.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    return jogos[0];
  } catch (err) {
    console.error("Erro na API:", err.response?.data || err);
    return null;
  }
}
