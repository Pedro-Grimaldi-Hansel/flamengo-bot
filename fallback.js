export function fallbackNextGame() {
  const emoji = "🔴⚫";
  const emoji2 = "⚠";
  const emoji3 = "🏆";

  const message = [
    `Saudações Rubro Negras!`,
    "Infelizmente a tabela da nova temporada ainda não está disponivel na API-Football.",
    "Fica tranquilo: assim que sair a oficial, voltaremos a atualizar você com data, horário e adversário antes dos jogos.",
    "Nós, por nós, pelos nossos!",
    "-Bot do Flamengo.",
    `${emoji}`,
  ].join("\n\n");

  return {
    message,
    fixture: null,
    emoji
  };
}
