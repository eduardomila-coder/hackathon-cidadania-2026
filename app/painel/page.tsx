import type { Metadata } from "next";
import Link from "next/link";
import { AUDITORIA, EQUIPE, LINKS, MARCOS, PITCH, PREMIOS, REGRAS } from "@/lib/evento";
import { lerTarefas } from "@/lib/tarefas";
import { Relogio } from "./Relogio";

export const metadata: Metadata = { title: "Painel — Habeas Titas · Hackathon da Cidadania 2026" };
// As tarefas vêm do TAREFAS.md a cada pedido: nada fica em cache.
export const dynamic = "force-dynamic";

const SECOES = [
  ["agora", "Agora"],
  ["cronograma", "Cronograma"],
  ["tarefas", "Tarefas"],
  ["auditoria", "Auditoria"],
  ["pitch", "Pitch"],
  ["regras", "Regras"],
  ["equipe", "Equipe"],
  ["links", "Links"],
] as const;

const LINHA_DO_TEMPO = ["Início", "Canvas", "V1 com testes", "Auditoria", "Pitch final"];
const ROTEIRO = [
  ["20 s", "O problema", "Histórias difíceis não viram próximo passo claro."],
  ["20 s", "A solução", "Um atendente que organiza, explica e aponta caminhos."],
  ["60 s", "A demo", "Conte um caso, veja a análise e os fundamentos."],
  ["20 s", "O impacto", "Acesso replicável, baixo custo e aplicável a outros ramos."],
];
const ACORDOS = ["Avisar bloqueio assim que aparecer", "Registrar decisão junto da tarefa", "Pelo menos duas pessoas na sede"];
const CHECKLIST_AUDITORIA = ["Fluxo completo demonstrável", "Dados de teste validados", "Repositório público e licença MIT", "Auditor consegue rodar sem ajuda", "Sem dados pessoais reais"];

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
function diaDe(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" });
}
function primeiroNome(nome: string) {
  return nome.split(" ")[0];
}
function nomeDe(id: string) {
  return primeiroNome(EQUIPE.find((p) => p.id === id)?.nome ?? id);
}

export default function Painel() {
  const blocos = lerTarefas();
  const tarefas = blocos.flatMap((b) => b.tarefas.map((t) => ({ ...t, contexto: b.titulo || b.dia })));
  const feitas = tarefas.filter((t) => t.feita);
  const pendentes = tarefas.filter((t) => !t.feita);
  const emAndamento = pendentes.filter((t) => t.responsaveis.length > 0);
  const aFazer = pendentes.filter((t) => t.responsaveis.length === 0);

  const riscos = REGRAS.filter((r) => r.titulo === "Presença" || r.titulo === "Pessoa líder");
  const essenciais = REGRAS.filter((r) => r.titulo !== "Presença" && r.titulo !== "Pessoa líder");

  return (
    <div className="cfp">
      <aside className="cfp-menu">
        <p className="cfp-menu-tag">Hackathon da Cidadania 2026</p>
        <p className="cfp-menu-marca">Habeas Titas</p>
        <nav aria-label="Seções do painel">
          {SECOES.map(([id, nome]) => (
            <a key={id} href={`#${id}`} className="cfp-menu-item">{nome}</a>
          ))}
        </nav>
      </aside>

      <div className="cfp-conteudo">
        <header className="cfp-barra">
          <p className="cfp-barra-sub">Central da equipe · decisões, entregas e evidências do Hackathon em um só lugar.</p>
          <div className="cfp-pessoas">
            {EQUIPE.map((p) => (
              <span key={p.id} className="cfp-pessoa"><i aria-hidden /> {primeiroNome(p.nome)}</span>
            ))}
            <Link href="/" className="cfp-sair">Sair</Link>
          </div>
        </header>

        <main className="cfp-main">
          <section id="agora" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Central de comando</span>
                <h1>Agora</h1>
                <p className="cfp-lead">O que a equipe precisa fazer, provar e decidir em seguida.</p>
              </div>
              <aside className="cfp-placar">Pontuação máxima<br /><strong>810</strong> pontos no total</aside>
            </div>
            <div className="cfp-acoes">
              <a href="#tarefas">Ver tarefas críticas</a>
              <a href="#auditoria">Preparar auditoria</a>
              <a href="#pitch">Ensaiar pitch</a>
            </div>
            <div className="cfp-grade-2">
              <Relogio marcos={MARCOS} />
              <article className="cfp-cartao cfp-foco">
                <span className="cfp-eyebrow">Foco sugerido</span>
                <h3>Fechar a evidência da próxima entrega</h3>
                <p>Antes de começar algo novo, confirme arquivo, responsável e onde ficará o registro.</p>
                <a href="#tarefas">Abrir lista da entrega</a>
              </article>
            </div>
            <h2 className="cfp-subtitulo">Linha do tempo</h2>
            <div className="cfp-linha-tempo">
              {LINHA_DO_TEMPO.map((m) => <div key={m} className="cfp-marco"><i aria-hidden /><strong>{m}</strong></div>)}
            </div>
            <h2 className="cfp-subtitulo">Prioridades da equipe</h2>
            <div className="cfp-tres">
              {EQUIPE.map((p) => (
                <article key={p.id} className="cfp-cartao">
                  <span className="cfp-numero">{p.nome[0]}</span>
                  <h3>{p.nome}</h3>
                  <p>{p.area}</p>
                  <span className="cfp-badge">Em andamento</span>
                </article>
              ))}
            </div>
          </section>

          <section id="cronograma" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Planejamento por prazo</span>
                <h1>Cronograma</h1>
                <p className="cfp-lead">Separado por momento, com o que vale ponto e a evidência exigida.</p>
              </div>
            </div>
            <div className="cfp-filtros">
              <span className="cfp-filtro">Tudo</span>
              <span className="cfp-filtro">Sábado</span>
              <span className="cfp-filtro">Domingo</span>
              <span className="cfp-filtro">Só entregas</span>
            </div>
            <div className="cfp-agenda">
              {MARCOS.map((m, i) => (
                <article key={i} className="cfp-evento">
                  <span className="cfp-evento-hora">{hora(m.quando)}</span>
                  <div>
                    <strong>{m.titulo}</strong>
                    <div className="cfp-evento-ev">{m.evidencia ? `Evidência: ${m.evidencia}` : diaDe(m.quando)}</div>
                  </div>
                  {m.pontos ? <span className="cfp-badge">{m.pontos} pts</span> : <span className="cfp-badge ambar">programação</span>}
                </article>
              ))}
            </div>
          </section>

          <section id="tarefas" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Execução e responsáveis</span>
                <h1>Tarefas</h1>
                <p className="cfp-lead">Lido de docs/TAREFAS.md a cada abertura. Marque [x] e faça /entregar para concluir.</p>
              </div>
            </div>
            <div className="cfp-colunas">
              <Coluna titulo="A fazer">
                {aFazer.map((t, i) => <Tarefa key={`af-${i}`} texto={t.texto} contexto={t.contexto} feita={false} />)}
                {aFazer.length === 0 && <p className="cfp-vazio">Nada pendente sem dono.</p>}
              </Coluna>
              <Coluna titulo="Em andamento">
                {emAndamento.map((t, i) => <Tarefa key={`ea-${i}`} texto={t.texto} contexto={t.contexto} dono={t.responsaveis.map(nomeDe).join(" · ")} />)}
                {emAndamento.length === 0 && <p className="cfp-vazio">Nada em andamento.</p>}
              </Coluna>
              <Coluna titulo="Concluídas">
                {feitas.map((t, i) => <Tarefa key={`fe-${i}`} texto={t.texto} contexto={t.contexto} feita />)}
                {feitas.length === 0 && <p className="cfp-vazio">Nada concluído ainda.</p>}
              </Coluna>
            </div>
          </section>

          <section id="auditoria" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Preparar quem testa sozinho</span>
                <h1>Auditoria</h1>
                <p className="cfp-lead">Transforme os 300 pontos em um roteiro de prova, não em uma lista solta.</p>
              </div>
              <aside className="cfp-placar"><strong>300</strong> pontos na auditoria</aside>
            </div>
            <div className="cfp-tres">
              {AUDITORIA.map((a) => (
                <article key={a.dimensao} className="cfp-cartao cfp-criterio">
                  <span className="cfp-badge">Meta: nota 5</span>
                  <h3>{a.dimensao}</h3>
                  <p>{a.nota5}</p>
                  <p className="cfp-como"><strong>Como atacamos:</strong> {a.nosso}</p>
                </article>
              ))}
            </div>
            <div className="cfp-grade-2">
              <article className="cfp-cartao">
                <h2>Checklist da demonstração</h2>
                <div className="cfp-lista">
                  {CHECKLIST_AUDITORIA.map((item) => (
                    <div key={item} className="cfp-chec"><span>{item}</span><span className="cfp-badge">Pronto</span></div>
                  ))}
                </div>
              </article>
              <article className="cfp-cartao">
                <h2>Pasta de evidências</h2>
                <p>Deixe uma única rota para o auditor encontrar tudo.</p>
                <div className="cfp-evidencia-lista">
                  <Link href="/">Produto rodando ↗</Link>
                  <Link href="/revisoes">Habeas Release ↗</Link>
                  <a href="https://github.com/eduardomila-coder/hackathon-cidadania-2026" target="_blank" rel="noreferrer">README e casos de teste ↗</a>
                </div>
              </article>
            </div>
          </section>

          <section id="pitch" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Roteiro de banca</span>
                <h1>Pitch</h1>
                <p className="cfp-lead">Problema → Solução → Demo → Impacto. Sem perder tempo decidindo o que entra.</p>
              </div>
            </div>
            <div className="cfp-roteiro">
              <article className="cfp-cartao">
                <h2>Roteiro de 2 minutos</h2>
                {ROTEIRO.map(([tempo, titulo, texto]) => (
                  <div key={titulo} className="cfp-slide"><b>{tempo}</b><div><strong>{titulo}</strong><p>{texto}</p></div></div>
                ))}
              </article>
              <aside className="cfp-cartao">
                <span className="cfp-eyebrow">Último ensaio</span>
                <h1 className="cfp-ensaio-tempo">—:—</h1>
                <span className="cfp-badge ambar">Ainda sem ensaio</span>
                <div className="cfp-ensaio">
                  <div><strong>0</strong>ensaios</div>
                  <div><strong>0</strong>travamentos</div>
                  <div><strong>0</strong>ajustes</div>
                  <div><strong>—</strong>demo</div>
                </div>
              </aside>
            </div>
            <h2 className="cfp-subtitulo">Critérios de avaliação</h2>
            <div className="cfp-tres">
              {PITCH.map((p) => (
                <article key={p.criterio} className="cfp-cartao">
                  <h3>{p.criterio}</h3>
                  <p>{p.nota5}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="regras" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">O que protege a pontuação</span>
                <h1>Regras</h1>
                <p className="cfp-lead">Premiação: {PREMIOS.join(" · ")}.</p>
              </div>
            </div>
            <div className="cfp-grade-2">
              <article className="cfp-cartao">
                <h2>Essencial para entregar</h2>
                <div className="cfp-lista">
                  {essenciais.map((r) => (
                    <div key={r.titulo} className="cfp-chec"><span><strong>{r.titulo}</strong><br /><span className="cfp-muted">{r.texto}</span></span><span className="cfp-badge">✓</span></div>
                  ))}
                </div>
              </article>
              <div className="cfp-pilha">
                {riscos.map((r, i) => (
                  <article key={r.titulo} className="cfp-cartao cfp-risco">
                    <h2>{i === 0 ? "Risco de desclassificação" : "Risco de perder pontos"}</h2>
                    <p><strong>{r.titulo}.</strong> {r.texto}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="equipe" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Pessoas e cobertura</span>
                <h1>Equipe</h1>
                <p className="cfp-lead">Quem é responsável pelo quê, e quem assume se houver bloqueio.</p>
              </div>
            </div>
            <div className="cfp-tres">
              {EQUIPE.map((p) => (
                <article key={p.id} className="cfp-cartao cfp-pessoa-card">
                  <span className="cfp-avatar">{p.nome[0]}</span>
                  <h3>{p.nome}</h3>
                  <p>{p.papel}</p>
                  <p className="cfp-muted">{p.area}</p>
                </article>
              ))}
            </div>
            <h2 className="cfp-subtitulo">Acordos de trabalho</h2>
            <div className="cfp-tres">
              {ACORDOS.map((a) => <article key={a} className="cfp-cartao"><strong>{a}</strong></article>)}
            </div>
          </section>

          <section id="links" className="cfp-secao">
            <div className="cfp-titulo">
              <div>
                <span className="cfp-eyebrow">Recursos operacionais</span>
                <h1>Links úteis</h1>
                <p className="cfp-lead">Atalhos por finalidade, sem expor informações sensíveis no painel.</p>
              </div>
            </div>
            <div className="cfp-tres">
              <CartaoLink rotulo="Produto" titulo="Demo ao vivo" desc="Acompanha a main, atualiza a cada minuto." href={LINKS[0].url} />
              <CartaoLink rotulo="Código" titulo="Repositório" desc="Código, documentação e licença MIT." href={LINKS[1].url} />
              <CartaoLink rotulo="Entrega" titulo="Materiais" desc="Canvas, slides e evidências da equipe." href={`${LINKS[1].url}/tree/main/docs/entregas`} />
              <CartaoLink rotulo="Equipe" titulo="Onboarding" desc="Como entrar no projeto e trabalhar." href={LINKS[2].url} />
              <CartaoLink rotulo="Evento" titulo="Regulamento" desc="Critérios e programação da OAB/PR." href={LINKS[3].url} />
              <CartaoLink rotulo="Revisão" titulo="Habeas Release" desc="Mudanças aguardando aprovação." href="/revisoes" />
            </div>
            <article className="cfp-cartao cfp-endereco">
              <span className="cfp-eyebrow">Endereço para compartilhar</span>
              <p><b>habeastitas.eduardomila.adv.br</b></p>
              <p className="cfp-muted">Credenciais, senhas e dados de acesso ficam fora deste painel.</p>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function Coluna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="cfp-coluna">
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

function Tarefa({ texto, contexto, dono, feita }: { texto: string; contexto: string; dono?: string; feita?: boolean }) {
  return (
    <article className="cfp-cartao cfp-tarefa">
      <span className={feita ? "cfp-badge" : "cfp-badge ambar"}>{feita ? "Concluída" : contexto}</span>
      <h3>{texto}</h3>
      {dono && <p className="cfp-muted">Responsável: <strong>{dono}</strong></p>}
      <div className="cfp-ev">Anexar evidência ou link da entrega</div>
    </article>
  );
}

function CartaoLink({ rotulo, titulo, desc, href }: { rotulo: string; titulo: string; desc: string; href: string }) {
  const externo = href.startsWith("http");
  const props = externo ? { href, target: "_blank", rel: "noreferrer" } : { href };
  return (
    <a {...props} className="cfp-cartao cfp-link">
      <span className="cfp-eyebrow">{rotulo}</span>
      <h3>{titulo} ↗</h3>
      <p>{desc}</p>
    </a>
  );
}
