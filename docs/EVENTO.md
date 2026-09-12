# Hackathon da Cidadania 2026 — OAB/PR, 6ª edição

Fontes: Manual de Orientações, slides "Regras do Jogo" e programação oficial
(PDFs e texto em `docs/privado/regras/`), o site do evento e o grupo dos
inscritos. Em caso de divergência entre Manual e Edital, vale o Edital.

## Onde

Auditório da OAB/PR, Rua Coronel Brasilino Moura 253, Ahú, Curitiba.
Presencial. Levar computador e tokens. Internet e almoço fornecidos.

## Categoria: Inovação Aberta e Cidadania

"Soluções jurídicas de IA (via prompts, agentes inteligentes e tecnologias de
mercado já existentes) voltadas à advocacia" e ao acesso à Justiça.

## Exigências do edital

- Equipe de 3 a 6, com pelo menos 2 da área do Direito. Somos 3.
- **Licença MIT**, repositório aberto. Nada proprietário.
- Há um **repositório oficial** onde se registram links e prints das redes:
  é a pasta da equipe no Google Drive, `HabeasTITAS_Cidadania`
  (https://drive.google.com/drive/folders/1Gi9xWrC9v3ia5M2JJHLKsvi1SpZswOfO).
  Cada entrega sobe lá antes da hora; `docs/entregas/` guarda a cópia.

## Programação e pontuação

### Sexta 11/09

| Hora | O quê | Pontos |
|---|---|---|
| 19h00 | Abertura e regras (OAB e online) | — |
| depois | **Foto da equipe no banner**, nas redes com #hackathonoabpr, com alguém da organização na foto | **15** |
| 20h30 | Happy hour (por conta de cada um) | — |

### Sábado 12/09 — até 330 pontos

| Hora | O quê | Pontos |
|---|---|---|
| 8h00–8h30 | **Check-in** (2 por pessoa; equipe com menos de 5 e 100% presente = máximo; vale até 9h05) | até 10 |
| 8h30 | Oficina de IA (José Alves) | — |
| 9h00 | Workshop Canvas de IA (Heloisa Karina) — pilares do produto | — |
| 9h30 | Construção do planejamento no Canva | — |
| **12h00** | **Entrega 1 — Canvas preenchido** | **100** |
| 12h00 | Almoço alternado | — |
| **15h30** | **Entrega 2 — V1 com testes internos** | **100** |
| 15h40 | Refresh das orientações (Rhodrigo Deda) | — |
| **17h30** | **Entrega 3 — V2 validada com testes externos** | **100** |
| 19h00 | Encerramento do dia | — |
| dia todo | Foto da equipe nas redes com #hackathonoabpr (print no repositório) | 5 |
| dia todo | **Live ou vídeo nas redes explicando a ideia, com alguém da organização** | **15** |

### Domingo 13/09 — até 480 pontos

| Hora | O quê | Pontos |
|---|---|---|
| 8h00–8h30 | Check-in (mesma regra) | até 10 |
| 9h05 | Oficina de pitch | — |
| **10h30** | **Entrega 4 — Produto: documentação + dados para teste** | **100** |
| 10h30–14h30 | **Auditoria técnica** — banca por consenso, até 4 auditores por equipe | **0–300** |
| 12h–14h | Almoço alternado | — |
| **15h00** | **Entrega 5 — slides oficiais do pitch de 2 minutos** | **50** |
| 16h30 | Banca de "inovação aberta" (só as mais pontuadas) | 25 por jurado |
| até 19h | Resultado e premiação | — |
| dia todo | Foto da equipe nas redes (print no repositório) | 5 |

## Como se entrega (Manual, seção 6)

Cada entrega precisa de **evidência publicada no repositório oficial da
OAB/PR, numa pasta por equipe**, dentro do prazo. "Sem evidência, o
checkpoint não existe." O que vale como evidência:

| Entrega | Evidência |
|---|---|
| 1 Canvas | apresentação do canvas preenchido |
| 2 Testes internos | apresentação dos testes que nós mesmos fizemos |
| 3 Testes externos | **depoimentos de usuários/testes em redes sociais, link no repositório** |
| 4 Produto | documentação e dados com instruções de uso para teste; **laptop à disposição do auditor** |
| 6 Slides | deck de 2 minutos na pasta da equipe |
| Fotos e live | print/link no repositório até o prazo de cada uma |

Prazos das evidências extras: foto no banner **até 10h de sábado**; foto da
equipe até 15h (cada dia); live/vídeo até 15h de domingo.

Onde é o repositório oficial e como se sobe a pasta: perguntar na abertura
(a organização "explica as entregas, prazos e ambientes").

## Auditoria: a rubrica (Manual, seção 8)

Quatro auditores, nota por consenso, três dimensões. Nota 1 = 0, 2 = 25,
3 = 50, 4 = 75, 5 = 100. **O que dá nota 5 em cada uma:**

| Dimensão | Nota 5 | Nota 3 (o que evitar) |
|---|---|---|
| **Confiabilidade** | "Respostas testadas e validadas com **controle explícito de alucinação** (agente inteligente, **verificação de fontes** etc.)" | "corretas em geral, mas com possíveis alucinações em casos específicos" |
| **Usabilidade** | "Altamente intuitivo. **Experiência orientada a leigos, com acessibilidade inclusiva**" | "curva de aprendizado moderada" |
| **Sofisticação técnica** | "Uso de técnicas avançadas como **RAG e sistemas de prompts**" (nota 4: "encadeamento e delimitação de contexto") | "estrutura clara, com ajustes de tom e persona" |

Tradução para o nosso produto:

- **RAG sobre a lei**: Lei 9.099/95, CDC e o formulário do TJPR como fonte
  recuperada e citada na resposta, não decorada pelo modelo.
- **Verificação de fontes**: uma segunda passada que confere cada afirmação
  jurídica contra o trecho recuperado e marca o que não tem base.
- **Sistema de prompts encadeado**: extrair fatos → classificar com a lei →
  verificar → redigir o pedido. Cada etapa com contexto delimitado.
- **Leigos e acessibilidade**: voz, linguagem simples, contraste, fonte
  grande, rótulos para leitor de tela.
- **Dados de teste e instruções** que deixem o auditor rodar sozinho no
  nosso laptop.

## Pitch: 2 minutos (Manual, seção 7)

Roteiro imposto pelos slides: **PROBLEMA → SOLUÇÃO → DEMO → IMPACTO.**
Cinco critérios, 1 a 5 cada, por jurado: clareza, relevância jurídica,
inovação, viabilidade/sustentabilidade, escalabilidade/disseminação. Nota 5
em escala: "agente replicável, baixo custo, aplicável a diferentes ramos do
Direito". Só as equipes mais pontuadas apresentam.

## Regras que desclassificam

- Menos de 50% da equipe na sede: desclassificação. Somos 3: **dois sempre lá.**
- Pessoa líder definida e comunicada à organização (obrigatório para prêmio).
- Solução sob licença MIT, publicada no repositório oficial. Nada fechado.
- Frameworks e APIs externas permitidos **desde que referenciados** no material.

## Premiação

R$ 10.000 / 5.000 / 3.000 por categoria. Nota final = pontos das entregas +
auditoria + extras + pitch.

## O que isso significa

- **A auditoria técnica vale 300 dos 810 pontos.** É o que mais pesa. Ela olha
  o repositório: README que explica, código que roda, testes, dados de teste.
- As entregas de sábado são **incrementais e com hora**: canvas, V1 testada
  por nós, V2 testada por gente de fora (outras equipes, organização).
- Check-in dos três antes das 8h30 nos dois dias é o ponto mais barato do
  evento: 20 pontos por chegar cedo.
- Foto e live com a organização somam 40 pontos. Alguém da equipe fica
  responsável por isso.

## Ainda sem resposta (ver transcrição da abertura em `docs/privado/`)

- [x] Link da pasta do Drive: `HabeasTITAS_Cidadania`, https://drive.google.com/drive/folders/1Gi9xWrC9v3ia5M2JJHLKsvi1SpZswOfO (é o repositório oficial; arquivos e atividades sobem lá)
- [ ] Quem é o padrinho/madrinha da equipe (sábado cedo)
- [ ] Líder: Eduardo, comunicar no check-in
