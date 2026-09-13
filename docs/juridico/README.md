# Base jurídica que o sistema consulta

Estes arquivos são a **fonte** das respostas: o sistema recupera os artigos
relevantes daqui (busca por termos) e só pode afirmar o que está neles. O que
não está aqui, ele diz que não encontrou base.

| Arquivo | O que é | De onde veio |
|---|---|---|
| `lei-9099-1995-juizados-especiais.md` | Lei dos Juizados Especiais, parte cível (arts. 1º a 59) | Planalto, texto compilado, 12/09/2026 |
| `lei-8078-1990-cdc.md` | Código de Defesa do Consumidor, íntegra | Planalto, texto compilado, 12/09/2026 |
| `lei-11340-2006-maria-da-penha.md` | Lei Maria da Penha, íntegra (arts. 1º a 46, com os artigos acrescentados) | Planalto, texto compilado, 13/09/2026 |
| `codigo-civil-familia.md` | Código Civil, direito de família: divórcio, guarda, poder familiar, alimentos e união estável (arts. 1.571 a 1.582, 1.583 a 1.590, 1.630 a 1.638, 1.694 a 1.710 e 1.723 a 1.727) | Planalto, texto compilado, 13/09/2026 |
| `lei-5478-1968-alimentos.md` | Lei de Alimentos, íntegra | Planalto, texto compilado, 13/09/2026 |
| `orientacoes-praticas.md` | Caminhos antes do processo e dados práticos, revisados pela equipe jurídica | equipe |

Formato: um `## Art. N` por artigo, texto do Planalto sem alteração. O número vai
como a lei escreve, inclusive com ponto e letra (`## Art. 1.583`, `## Art. 12-A`),
e é ele que aparece no id citado pelo modelo (`L10406-1.583`). Nas fontes geradas
por download, cada arquivo diz no cabeçalho o que ficou fora do acervo (artigo
riscado na origem, artigo revogado). Para acrescentar fonte, crie outro `.md` com
o mesmo formato; o sistema carrega todos os arquivos desta pasta.
