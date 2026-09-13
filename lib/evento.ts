// Dados fixos do Hackathon da Cidadania 2026 (OAB/PR), tirados do Manual de
// Orientações, dos slides "Regras do Jogo" e da programação oficial.
// Horários em America/Sao_Paulo. Fonte: docs/EVENTO.md.

export type Pessoa = { id: "eduardo" | "maria" | "fernando"; nome: string; papel: string; area: string; cor: string };

export const EQUIPE: Pessoa[] = [
  { id: "eduardo", nome: "Eduardo", papel: "Advogado · líder", area: "Cérebro: prompts, base jurídica, leitura de documento (lib/)", cor: "bg-blue-700" },
  { id: "maria", nome: "Maria Fernanda", papel: "Acadêmica", area: "Conteúdo jurídico e entregas: canvas, testes, depoimentos, pitch (docs/)", cor: "bg-emerald-700" },
  { id: "fernando", nome: "Fernando", papel: "Acadêmico", area: "Interface: telas, fluxo da conversa, acessibilidade (app/)", cor: "bg-violet-700" },
];

export type Marco = {
  quando: string;          // ISO com fuso
  titulo: string;
  pontos?: string;
  tipo: "entrega" | "extra" | "evento" | "prazo";
  evidencia?: string;
};

export const MARCOS: Marco[] = [
  { quando: "2026-09-11T19:00:00-03:00", titulo: "Abertura e regras do jogo", tipo: "evento" },
  { quando: "2026-09-11T20:30:00-03:00", titulo: "Happy hour (por conta de cada um)", tipo: "evento" },

  { quando: "2026-09-12T08:30:00-03:00", titulo: "Check-in dos três (vale até 9h05)", pontos: "até 10", tipo: "extra", evidencia: "presença; equipe com menos de 5 e 100% presente = máximo" },
  { quando: "2026-09-12T08:30:00-03:00", titulo: "Oficina de IA (José Alves)", tipo: "evento" },
  { quando: "2026-09-12T09:00:00-03:00", titulo: "Workshop Canvas de IA (Heloisa Karina)", tipo: "evento" },
  { quando: "2026-09-12T10:00:00-03:00", titulo: "Prazo: print da foto no banner no repositório", pontos: "15", tipo: "prazo", evidencia: "foto com alguém da organização, #hackathonoabpr" },
  { quando: "2026-09-12T12:00:00-03:00", titulo: "Entrega 1 — Canvas preenchido", pontos: "100", tipo: "entrega", evidencia: "apresentação do canvas" },
  { quando: "2026-09-12T12:00:00-03:00", titulo: "Almoço alternado por equipe", tipo: "evento" },
  { quando: "2026-09-12T15:00:00-03:00", titulo: "Prazo: print da foto da equipe nas redes", pontos: "5", tipo: "prazo", evidencia: "#hackathonoabpr, print no repositório" },
  { quando: "2026-09-12T15:30:00-03:00", titulo: "Entrega 2 — V1 com testes internos", pontos: "100", tipo: "entrega", evidencia: "apresentação dos testes que nós fizemos" },
  { quando: "2026-09-12T15:40:00-03:00", titulo: "Refresh das orientações (Rhodrigo Deda)", tipo: "evento" },
  { quando: "2026-09-12T17:30:00-03:00", titulo: "Entrega 3 — V2 com testes externos", pontos: "100", tipo: "entrega", evidencia: "depoimentos de usuários em redes sociais, link no repositório" },
  { quando: "2026-09-12T19:00:00-03:00", titulo: "Encerramento do dia", tipo: "evento" },

  { quando: "2026-09-13T08:30:00-03:00", titulo: "Check-in dos três (vale até 9h05)", pontos: "até 10", tipo: "extra" },
  { quando: "2026-09-13T09:05:00-03:00", titulo: "Oficina de pitch", tipo: "evento" },
  { quando: "2026-09-13T10:30:00-03:00", titulo: "Entrega 4 — Produto: documentação + dados de teste", pontos: "100", tipo: "entrega", evidencia: "pasta da equipe no repositório; laptop à disposição do auditor" },
  { quando: "2026-09-13T10:30:00-03:00", titulo: "Auditoria técnica (até 14h30)", pontos: "0–300", tipo: "entrega", evidencia: "4 auditores, nota por consenso, 3 dimensões" },
  { quando: "2026-09-13T14:30:00-03:00", titulo: "Entrega 5 — Slides do pitch de 2 min", pontos: "50", tipo: "entrega", evidencia: "deck na pasta da equipe" },
  { quando: "2026-09-13T15:00:00-03:00", titulo: "Prazo: foto da equipe e live/vídeo com a organização", pontos: "5 + 15", tipo: "prazo", evidencia: "prints e link no repositório" },
  { quando: "2026-09-13T16:30:00-03:00", titulo: "Banca de Inovação Aberta (só as mais pontuadas)", pontos: "até 25/jurado", tipo: "entrega", evidencia: "pitch de 2 minutos: problema → solução → demo → impacto" },
  { quando: "2026-09-13T19:00:00-03:00", titulo: "Resultado e premiação", tipo: "evento" },
];

export const AUDITORIA = [
  {
    dimensao: "Confiabilidade",
    nota5: "Respostas testadas e validadas com controle explícito de alucinação (agente inteligente, verificação de fontes).",
    nota3: "Corretas em geral, mas com possíveis alucinações em casos específicos.",
    nosso: "Fonte fechada em docs/juridico, citação obrigatória por artigo e revisão em segunda passada.",
  },
  {
    dimensao: "Usabilidade",
    nota5: "Altamente intuitivo. Experiência orientada a leigos, com acessibilidade inclusiva.",
    nota3: "Uso razoável, com curva de aprendizado moderada.",
    nosso: "Voz, linguagem simples, fonte grande, contraste, rótulos para leitor de tela.",
  },
  {
    dimensao: "Sofisticação técnica",
    nota5: "Técnicas avançadas como RAG e sistemas de prompts.",
    nota3: "Estrutura clara, com ajustes de tom e persona.",
    nosso: "Cadeia extrair → buscar na lei (RAG) → analisar citando → verificar.",
  },
];

export const PITCH = [
  { criterio: "Clareza", nota5: "Oratória excelente, narrativa bem construída, domínio total do tempo." },
  { criterio: "Relevância jurídica", nota5: "Alto impacto prático com potencial real de transformação no ecossistema jurídico." },
  { criterio: "Inovação", nota5: "Ideia disruptiva ou novo modelo de aplicação jurídica da IA." },
  { criterio: "Viabilidade", nota5: "Solução madura, validada, com plano claro de implementação e manutenção." },
  { criterio: "Escalabilidade", nota5: "Agente replicável, baixo custo, aplicável a diferentes ramos do Direito." },
];

export const REGRAS = [
  { titulo: "Presença", texto: "Mínimo de 50% da equipe na sede o tempo todo. Somos 3: dois sempre lá. Menos que isso desclassifica." },
  { titulo: "Pessoa líder", texto: "Definida e comunicada à organização. Obrigatório para receber prêmio." },
  { titulo: "Licença MIT", texto: "Tudo publicado no repositório oficial da OAB/PR, aberto. Nada proprietário." },
  { titulo: "Evidência no prazo", texto: "\"Sem evidência, o checkpoint não existe.\" Cada entrega precisa estar na pasta da equipe no Drive (HabeasTITAS_Cidadania) antes da hora." },
  { titulo: "Ferramentas", texto: "IA de mercado permitida (Claude, GPT, Gemini, Copilot). APIs e frameworks externos: permitidos, desde que referenciados." },
  { titulo: "Auditor testa sozinho", texto: "Documentação e dados de teste têm que deixar o auditor rodar no nosso laptop sem ajuda." },
];

export const PREMIOS = ["1º lugar: R$ 10.000", "2º lugar: R$ 5.000", "3º lugar: R$ 3.000"];

// Pasta da equipe no Drive da OAB/PR: é o repositório oficial do evento. Toda
// entrega, print e atividade sobe lá; docs/entregas/ é a cópia no git.
export const DRIVE = { nome: "HabeasTITAS_Cidadania", url: "https://drive.google.com/drive/folders/1Gi9xWrC9v3ia5M2JJHLKsvi1SpZswOfO" };

export const LINKS = [
  { nome: "Demo ao vivo", url: "https://escritoriodativo.eduardomila.adv.br", desc: "acompanha main, atualiza a cada minuto" },
  { nome: "Repositório", url: "https://github.com/eduardomila-coder/hackathon-cidadania-2026", desc: "código, docs, entregas" },
  { nome: "Onboarding", url: "https://github.com/eduardomila-coder/hackathon-cidadania-2026/blob/main/docs/ONBOARDING.md", desc: "como entrar e trabalhar" },
  { nome: "Site do evento", url: "https://eventos.oabpr.org.br/hackathon-cidadania", desc: "OAB/PR" },
  { nome: "Pasta oficial (Drive)", url: DRIVE.url, desc: "arquivos e atividades de cada entrega" },
];

export const LOCAL = "Auditório da OAB/PR — Rua Coronel Brasilino Moura, 253, Ahú, Curitiba";
