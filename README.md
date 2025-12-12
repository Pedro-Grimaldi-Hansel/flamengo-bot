# flamengo-bot

Bot que avisa por e-mail sobre o próximo jogo do Clube de Regatas do Flamengo.

**Resumo**
- Envia um e-mail antes de cada jogo do Flamengo:
	- Se o jogo for à tarde/noite → envia ao meio-dia do dia do jogo.
	- Se o jogo for de manhã → envia às 20h do dia anterior.

**O e-mail inclui**
- Adversário
- Data e horário
- Local (estádio)

**Status do projeto**
- Código funcional para uso local e testes com Gmail (via `nodemailer`).

**Configuração de comportamento**
- `RUN_ON_START`: quando não definida ou diferente de `false`, o bot executa as checagens uma vez ao iniciar (útil para testes/primeira execução). Defina `RUN_ON_START=false` para evitar a execução imediata em ambientes de produção.

**Como funciona (visão técnica)**
- `api.js` consulta a API de futebol (API-Football) para encontrar o próximo jogo do time (ID do Flamengo no serviço).
- `schedule.js` agenda duas checagens via `node-cron` (meio-dia e 20:00) e envia um resumo com `sendEmail`.
- `email.js` usa `nodemailer` para enviar e-mails via SMTP/Gmail.