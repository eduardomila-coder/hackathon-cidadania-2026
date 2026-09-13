# Conector do Escritório Dativo

Programa pequeno que roda no computador do advogado e assina o que o escritório
pedir, sem que a chave privada ou o PIN saiam dali.

```bash
node conector/conector.mjs                                   # demonstração
PKCS11=/caminho/do/driver.so node conector/conector.mjs      # token A3
```

Escuta em `127.0.0.1:8766` e responde só às origens conhecidas:

| caminho | o que faz |
|---|---|
| `GET /saude` | versão e modo (`a3` ou `demonstracao`) |
| `GET /certificados` | certificados que ele enxerga |
| `POST /assinar` | recebe `{ certificadoId, hash }` e devolve a assinatura |

A arquitetura, os limites e o que falta para valer em processo estão em
[`docs/CERTIFICADO.md`](../docs/CERTIFICADO.md).
