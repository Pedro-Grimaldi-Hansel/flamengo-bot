import dotenv from "dotenv";
dotenv.config();

import { runOnce } from "./schedule.js";

// Entry para execução única (GitHub Actions / cron do SO): checa os jogos, envia o e-mail se for o caso e encerra o processo
console.log("🔥 Bot do Flamengo — execução única");

runOnce()
  .then(() => {
    console.log("✅ Execução concluída.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro na execução:", err);
    process.exit(1);
  });
