# Certificado digital do advogado

O Escritório Dativo assina documentos com o certificado do próprio advogado sem
nunca ver a chave privada nem o PIN. Quem guarda a chave é o token A3 (ou o
arquivo A1) no computador dele; quem conversa com o token é um programa pequeno,
o **conector**, que roda na mesma máquina.

## Como funciona

```
   navegador do advogado                     servidor do escritório
   ---------------------                     ----------------------
1. abre a tela Certificado digital  ------>  devolve a página
2. calcula o SHA-256 do texto
3. manda SÓ o hash ------> conector (127.0.0.1)
                           |
                           +-- token A3 / certificado assina o hash
                           |
4. recebe a assinatura <---+
5. manda texto + hash + assinatura ------->  confere que o hash é do texto
                                             e guarda no caso
```

Três coisas não acontecem, de propósito:

- **a chave privada não sai do computador do advogado** — nem para o servidor,
  nem para a rede; o conector assina lá dentro e devolve 256 bytes;
- **o PIN não é gravado** — é digitado no terminal do conector e fica só na
  memória daquele processo, enquanto ele estiver aberto;
- **o servidor não recebe conexão do conector** — o conector escuta apenas em
  `127.0.0.1` e só responde às origens que conhece. Quem faz a ponte é o
  navegador do próprio advogado.

É o mesmo desenho que a advocacia já usa com o token para peticionar: o token
assina, o programa não conhece a chave.

## Ligar o conector

Modo demonstração, sem token:

```bash
node conector/conector.mjs
```

Na primeira vez ele cria um par de chaves e um certificado autoassinado em
`~/.escritorio-dativo/`, com o titular escrito em letras maiúsculas:
`CERTIFICADO DE DEMONSTRACAO - SEM VALOR JURIDICO`. A tela mostra esse aviso em
destaque. **Não é ICP-Brasil, não tem fé pública e não vale para protocolo.**
Serve para a tela poder ser mostrada e testada sem o token plugado.

Com token A3, basta apontar o driver PKCS#11 que o fabricante instala:

```bash
PKCS11=/Library/Safenet/libeTPkcs11.dylib node conector/conector.mjs
```

O conector pede o PIN no terminal quando a primeira assinatura for solicitada.
Nada mais muda: a tela, a API e o registro no caso são os mesmos.

## O que o servidor confere, e o que ele não afirma

Ao receber uma assinatura, o servidor recalcula o SHA-256 do texto e recusa se
não bater com o hash assinado. Isso impede guardar assinatura de um texto
diferente do que foi mostrado.

O servidor **não** valida a cadeia ICP-Brasil, não verifica revogação e não diz
que a assinatura tem validade jurídica. Isso é trabalho de quem recebe a peça —
o tribunal, o órgão, a parte —, e está escrito na tela para ninguém confundir.

## O que falta para valer em processo

Assinar aqui não é protocolar. Para o documento assinado entrar num processo
faltam, e isso não depende de código:

- convênio com o TJPR ou uso do PJe/PROJUDI pelo próprio advogado;
- validação da cadeia ICP-Brasil e da revogação no momento da assinatura;
- carimbo do tempo, quando o ato exigir;
- formato de assinatura aceito pelo sistema de destino (CAdES/PAdES), enquanto o
  conector hoje devolve a assinatura PKCS#1 crua sobre o hash.

Enquanto isso não existe, o Escritório Dativo guarda a assinatura como prova
interna do que o advogado declarou e quando — e diz exatamente isso na tela.
