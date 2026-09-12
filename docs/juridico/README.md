# Base jurídica que o sistema consulta

Estes arquivos são a **fonte** das respostas: o sistema recupera os artigos
relevantes daqui (busca por termos) e só pode afirmar o que está neles. O que
não está aqui, ele diz que não encontrou base.

| Arquivo | O que é | De onde veio |
|---|---|---|
| `lei-9099-1995-juizados-especiais.md` | Lei dos Juizados Especiais, parte cível (arts. 1º a 59) | Planalto, texto compilado, 12/09/2026 |
| `lei-8078-1990-cdc.md` | Código de Defesa do Consumidor, íntegra | Planalto, texto compilado, 12/09/2026 |
| `orientacoes-praticas.md` | Caminhos antes do processo e dados práticos, revisados pela equipe jurídica | equipe |

Formato: um `## Art. N` por artigo, texto do Planalto sem alteração. Para
acrescentar fonte, crie outro `.md` com o mesmo formato; o sistema carrega
todos os arquivos desta pasta.
