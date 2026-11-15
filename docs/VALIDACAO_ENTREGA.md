# Validação da entrega final (versão 2.1)

Data: 14/11/2026. Escopo: manter as funcionalidades da Sprint 2, trocar os dados em memória por um
banco SQL, permitir cadastro e login por e-mail e senha, e garantir que a otimização com IA não
baixe a nota ATS do currículo.

## Resultado

| Verificação | Resultado |
| --- | --- |
| `npm run build` e `npm run lint` (API) | passaram, sem avisos |
| `npm run build` e `npm run lint` (frontend) | passaram, sem avisos |
| `scripts/validar-regras.mjs` | passou: nota ATS, pesos, trava de fatos e garantia de nota |
| `scripts/validar-entrega.mjs` | passou: 90 verificações HTTP em banco SQLite temporário |
| Roteiro no navegador (Chromium) | passou: do cadastro à exclusão da conta, sem erro de JavaScript |

## O que foi coberto

| Área | Evidência |
| --- | --- |
| Banco SQL | Tabelas criadas na primeira execução; a API é encerrada e iniciada de novo no teste e currículo, candidatura e sessão continuam lá. |
| Cadastro e acesso | E-mail normalizado, e-mail duplicado (409), dados inválidos, senha incorreta, login/logout, cookie HttpOnly e SameSite, limite de tentativas (429) e sessão expirada. |
| Conta | Ver nome/e-mail, editar nome, excluir mediante senha, recusar senha errada, recadastrar o mesmo e-mail com a conta vazia. |
| Isolamento | A conta B não lista, busca, altera nem exclui currículos e candidaturas da conta A, nem vincula currículo da conta A. |
| Integridade | Excluir currículo mantém a candidatura sem vínculo quebrado; excluir conta apaga currículos, candidaturas e sessões (conferido direto nas tabelas). |
| Garantia de nota | Cinco reescritas que pioram o currículo (resumo curto, competências cortadas, experiências removidas, descrição sem verbo, tudo junto): a nota geral e a nota da vaga nunca ficam menores que as originais. Reescrita que melhora é mantida sem alteração. No fluxo HTTP, `notaDepois ≥ notaAntes`. |
| Trava de fatos | Nome e e-mail preservados, competência e empresa inexistentes removidas, cargos diferentes na mesma empresa não se misturam, números novos sinalizados. |
| Documentos | PDF, DOCX e LaTeX baixados; PDF e DOCX relidos pela importação. Arquivo ausente, tipo inválido, PDF/DOCX corrompido e arquivo acima de 5 MB tratados. |
| Candidaturas | Cadastro, troca de etapa, etapa inválida recusada, vínculo com currículo e exclusão. |
| Interface | Rotas protegidas redirecionam para `/entrar`; sem rolagem horizontal em 375, 768 e 1440 px. |

## Defeitos corrigidos nesta entrega

1. As rotas `/api/documentos/*` (ler, exportar e ortografia) respondiam 404: o `DocumentosModule`
   não estava registrado no `app.module.ts`.
2. PDF/DOCX corrompido gerava erro 500; agora responde 400 com orientação em português.
3. A trava de fatos associava experiências só pela empresa e podia misturar dois cargos na mesma
   organização; agora confere empresa, cargo e data de início.
4. Salvar a versão otimizada antes da análise automática terminar podia classificá-la como
   `otimizado` em vez de `sob-medida`.
5. A otimização podia devolver nota menor que a original (ex.: a IA encurtava o resumo ou cortava
   competências). Agora a garantia de nota impede.

## Como reproduzir

```sh
npm run lint
npm test
# Opcional: chamadas reais ao provedor configurado no .env, só com dados fictícios
node scripts/validar-ia-real.mjs
```

## Limites

- Login com Google dispensado nesta entrega. Não há confirmação de e-mail nem recuperação de senha.
- SQLite local: o arquivo `dados/alvo.sqlite` precisa ficar em disco persistente. Não houve publicação em nuvem.
- A nota ATS é uma regra do protótipo; não representa chance de entrevista.
- A garantia de nota troca seções inteiras pelo texto original; não escolhe item por item.
- Números novos são sinalizados para revisão, não confirmados. Conferir o texto antes de usar.
