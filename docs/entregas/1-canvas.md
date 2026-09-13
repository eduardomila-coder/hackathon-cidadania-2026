# Entrega 1: StartSe AI Canvas (sábado, 12h)

Preenchido depois da mentoria das 11h (vídeo `Dicas.mov`) e da conversa da
equipe (`Definição de processo .mov`). Direção fechada ali: linha Advocacia,
ferramenta contratada pelo advogado, que organiza e traduz, sem fazer análise
jurídica.

Canvas salvo no site da StartSe, em 12/09 às 12h15, pela API do site:
https://ai-canva.startse.com/?projectId=6aa56acf05c5c6d68d3fc4bc
Autor: Eduardo Mila. Para editar ou baixar o PDF, abra o link e use os botões
da página.

Entregue: `ai-canvas.pdf` na pasta do Drive da equipe (repositório oficial),
com cópia em `docs/entregas/1-canvas.pdf`.

## 1. Problema
O advogado que trabalha sozinho ou em escritório pequeno não tem estrutura para atender o cliente. O cliente liga ou manda mensagem para saber como está o processo, o advogado para o que está fazendo para explicar o andamento, pede documentos por WhatsApp, recebe foto, áudio e papel solto e organiza tudo à mão. Isso acontece todos os dias, principalmente nas causas de pequeno valor, como as do Juizado Especial e as de consumidor. O cliente fica sem resposta e sem saber o que precisa entregar, e o advogado gasta o dia em tarefas operacionais em vez de cuidar do caso. O problema importa porque é esse advogado quem atende a maior parte da população nos Juizados. Quando ele trava, o acesso à justiça trava junto.

## 2. Indicadores de sucesso
Tempo gasto pelo advogado em cada atendimento, com a meta de reduzir pela metade. Proporção de casos que chegam com a documentação completa no primeiro contato. Quantidade de perguntas sobre andamento respondidas pela plataforma sem precisar do advogado. Nota dada pelo cliente ao final do uso, de 1 a 5. Tempo entre o relato do cliente e o caso pronto e organizado para o advogado.

## 3. Como resolver sem AI
Hoje tudo se resolve por telefone e WhatsApp. O advogado consulta o sistema do tribunal, traduz o juridiquês na hora, pede os documentos um a um e guarda em pastas. A informação se perde, o cliente pergunta de novo e o advogado é interrompido o dia inteiro. A única saída sem tecnologia é contratar uma secretária ou um estagiário, e o advogado autônomo raramente consegue pagar por isso.

## 4. Como resolver com AI
Uma plataforma contratada pelo advogado, que fica responsável pelos dados. Ele cadastra o caso e o cliente entra por um link, contando os fatos por texto, áudio, foto ou documento. A inteligência artificial organiza esse material em fatos, datas e documentos recebidos, aponta o que ainda falta e explica o andamento do processo em linguagem simples, nas palavras do próprio cliente. Ela não dá parecer nem orienta juridicamente. Quem analisa o caso e escreve a peça continua sendo o advogado, porque essa é uma atividade privativa da advocacia. O resultado sai como dado estruturado, pronto para entrar no sistema do escritório.

## 5. Para quem
De um lado, o advogado autônomo ou o escritório de até três pessoas, sem secretária e sem sistema próprio, que cuida de muitos casos de pequeno valor no Juizado Especial e no direito do consumidor. De outro, o cliente pessoa física, leigo, que só quer saber como está o processo e o que precisa enviar. Muitas vezes é uma pessoa idosa ou que mora longe do fórum e prefere se comunicar por áudio.

## 6. Dados
O relato do cliente em texto, áudio, foto ou documento, entregue por ele mesmo. Os dados do caso cadastrados pelo advogado. Os andamentos públicos do processo, obtidos na consulta pública do Tribunal de Justiça do Paraná. Para os testes, sete casos fictícios guardados no repositório do projeto. O advogado é o controlador dos dados, com base na execução do contrato e no consentimento do cliente, conforme a LGPD. Nenhum dado real é usado durante o Hackathon.

## 7. Ferramentas
Aplicação em Next.js 16 com TypeScript, API Claude da Anthropic para a leitura e organização dos relatos, com a DeepSeek como alternativa pelo endpoint compatível, e Web Speech API para receber a voz do cliente. O código é público no GitHub, com licença MIT, e o desenvolvimento usa o Claude Code. A demonstração roda em escritoriodativo.eduardomila.adv.br. Não existe ferramenta pronta que receba o relato de uma pessoa leiga e devolva o caso organizado para o sistema do escritório, por isso a construímos.
