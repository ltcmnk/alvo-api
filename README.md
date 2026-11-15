# alvo-api

API do **Alvo**, plataforma que cria e otimiza currículos com foco em sistemas ATS e acompanha
as candidaturas do usuário, da inscrição ao contrato.

A **Sprint 1** entregou a base: health check, currículos e vagas com dados mock em memória,
validação e erros padronizados. A **Sprint 2** acrescenta a otimização de currículo com IA
(Anthropic, OpenAI ou Google), a nota ATS de 0 a 100, o relatório de compatibilidade, a leitura de
PDF/DOCX, a exportação em PDF, DOCX e LaTeX, a revisão ortográfica e o CRUD completo de currículos e
candidaturas. A **entrega final (versão 2.1)** troca os dados em memória por um **banco SQL
(SQLite)**, adiciona cadastro e login por e-mail e senha, perfil e exclusão de conta, e garante que
a otimização com IA **nunca baixa a nota ATS** do currículo.

- Frontend: [alvo-frontend](https://github.com/ltcmnk/alvo-frontend)
- Guia do time: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Stack

| Tecnologia | Uso |
| --- | --- |
| Node.js 22.13+ | Ambiente de execução (já traz o SQLite embutido em `node:sqlite`) |
| NestJS 12 | Framework da API (módulos, controllers, services, injeção de dependência) |
| Express | Servidor HTTP usado pelo Nest por baixo (`@nestjs/platform-express`) |
| TypeScript | Tipagem estática (aceita pelo requisito, seção 13) |
| SQLite (`node:sqlite`) | Banco SQL em arquivo local, sem servidor para instalar |
| `node:crypto` (scrypt) | Hash de senha e tokens de sessão, sem dependência extra |
| @nestjs/config | Leitura do `.env` (usa `dotenv` internamente) |
| class-validator / class-transformer | Validação do corpo das requisições |
| @anthropic-ai/sdk · openai · @google/genai | Clientes oficiais dos três provedores de IA |
| zod | Formato exato (structured outputs) das respostas da IA, validado na chegada |
| pdf-parse · mammoth | Leitura de texto de PDF e DOCX |
| pdfkit · docx | Geração do currículo em PDF e DOCX |
| LanguageTool (API pública) | Revisão ortográfica em pt-BR |
| oxlint e Prettier | Lint e formatação |

### Por que NestJS, e onde está o Express

O requisito descreve uma API Express. O NestJS **roda sobre o Express**: no `main.ts` a aplicação
é criada como `NestExpressApplication` e o CORS é habilitado com `app.enableCors()`. O Nest
acrescenta a organização em módulos que o projeto vai precisar quando entrarem banco, IA e OAuth.
A tabela abaixo mostra onde está cada peça da estrutura pedida no requisito:

| Requisito (modelo Express) | Onde está nesta API |
| --- | --- |
| `server.js` | `src/main.ts` (sobe o servidor, CORS, prefixo `/api`) |
| `src/app.js` | `src/app.module.ts` (registra os módulos) |
| `src/routes/*.js` | Decorators `@Controller`, `@Get`, `@Post` nos arquivos `*.controller.ts` |
| `src/controllers/*` | `src/<recurso>/<recurso>.controller.ts` |
| Lógica de negócio | `src/<recurso>/<recurso>.service.ts` |
| `src/middlewares/errorHandler.js` | `src/common/filters/http-exception.filter.ts` |
| Handler de 404 | `src/common/middlewares/rota-nao-encontrada.middleware.ts` |
| `src/config/database.js` | `src/banco/banco.module.ts` (conexão e tabelas) e `src/config/database.ts` |
| `dotenv` + `cors` | `@nestjs/config` + `app.enableCors()` |
| `nodemon` (`npm run dev`) | `nest start --watch` (mesmo efeito: reinicia a cada alteração) |

## Pré-requisitos

- Node.js **22.13 ou superior** (`node -v`); o SQLite vem junto com o Node
- npm 10 ou superior

## Como rodar localmente

```bash
git clone https://github.com/ltcmnk/alvo-api.git
cd alvo-api
npm install
cp .env.example .env      # no Windows (PowerShell): copy .env.example .env
npm run dev
```

A API sobe em **http://localhost:3001/api** e cria o banco em `dados/alvo.sqlite` na primeira
execução. Teste em outro terminal:

```bash
curl http://localhost:3001/api/health
```

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com recarga automática a cada alteração |
| `npm start` | Compila e executa a API |
| `npm run build` | Gera a versão compilada em `dist/` |
| `npm run start:prod` | Executa a versão compilada (`node dist/main`), após o `build` |
| `npm run lint` | Verifica o código com oxlint |
| `npm run format` | Formata o código com Prettier |
| `npm test` | Compila e roda os testes de regras e os testes HTTP (banco descartável) |

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3001` | Porta da API |
| `NODE_ENV` | `development` | Ambiente, exibido no health check |
| `FRONTEND_URL` | `http://localhost:5173` | Origem liberada no CORS (endereço do Vite) |
| `DATABASE_PATH` | `./dados/alvo.sqlite` | Arquivo do banco SQLite (criado automaticamente) |
| `ANTHROPIC_API_KEY` | vazio | Chave da Anthropic (Claude) |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Modelo da Anthropic |
| `OPENAI_API_KEY` | vazio | Chave da OpenAI |
| `OPENAI_MODEL` | `gpt-5.5` | Modelo da OpenAI |
| `GEMINI_API_KEY` | vazio | Chave do Google AI Studio (tem cota gratuita) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Modelo do Google |
| `LANGUAGETOOL_URL` | vazio (API pública) | Servidor do LanguageTool para a revisão ortográfica |

O `.env` não é versionado; o modelo está em `.env.example`.

## Banco de dados

SQLite, criado e versionado pelo próprio código em `src/banco/banco.module.ts` (as tabelas são
criadas na primeira execução). A pasta `dados/` fica fora do Git.

| Tabela | O que guarda | Relacionamentos |
| --- | --- | --- |
| `usuarios` | nome, e-mail único (sem diferenciar maiúsculas), hash da senha | — |
| `sessoes` | hash do token de sessão e validade (7 dias) | `usuario_id` → `usuarios` (cascata) |
| `curriculos` | tipo, nota ATS, data e as seções do currículo em JSON | `usuario_id` → `usuarios` (cascata) · `origem_id` → `curriculos` (vira nulo) |
| `vagas` | empresa, cargo, etapa, link, descrição, compatibilidade, notas e datas | `usuario_id` → `usuarios` (cascata) · `curriculo_id` → `curriculos` (vira nulo) |

- `CHECK` no banco valida etapa da candidatura, tipo do currículo e notas de 0 a 100.
- Excluir a conta apaga currículos, candidaturas e sessões dela (`ON DELETE CASCADE`).
- Excluir um currículo mantém as candidaturas, só remove o vínculo (`ON DELETE SET NULL`).
- Toda consulta filtra por `usuario_id`: uma conta nunca vê os dados de outra.
- As seções do currículo (experiências, formações, projetos...) ficam em uma coluna JSON porque são
  listas aninhadas sempre lidas e gravadas juntas; o que é consultado (tipo, nota, data) é coluna.

Para olhar o banco: `sqlite3 dados/alvo.sqlite ".tables"` ou abrir o arquivo no DB Browser for SQLite.

## Conta e acesso

Cadastro e login por e-mail e senha (`/auth/*`). A senha é guardada com **scrypt + salt**; a sessão
é um token aleatório entregue em cookie `HttpOnly` e `SameSite=Strict` (o JavaScript do site não
consegue lê-lo) e só o hash do token vai para o banco. Todas as rotas exigem login, exceto
`/health`, `/auth/cadastro` e `/auth/entrar`. Há limite de 20 tentativas de acesso por IP a cada
15 minutos, e escrita vinda de outra origem que não o frontend é recusada (403).

## Inteligência artificial

O usuário escolhe o provedor antes de otimizar. Só aparecem habilitados os provedores com chave no
`.env`. **Sem nenhuma chave, a API funciona em modo demonstração**: a análise é feita por regras e
devolve o mesmo formato, então o app inteiro funciona em qualquer máquina.

| Provedor | Onde gerar a chave | Variável |
| --- | --- | --- |
| Anthropic (Claude) | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| OpenAI (GPT) | platform.openai.com → API keys | `OPENAI_API_KEY` |
| Google (Gemini) | aistudio.google.com/apikey (cota gratuita) | `GEMINI_API_KEY` |

As chaves **nunca** vão para o frontend nem para o Git. Depois de editar o `.env`, reinicie a API.

**Como a otimização funciona**

1. `src/ats/` faz a parte determinística: dicionário de palavras-chave de várias áreas (não só
   tecnologia), análise da vaga, **nota ATS de 0 a 100** (seções 25, palavras-chave 30, impacto 25,
   formatação 20), ordem das seções e montagem do documento (o mesmo para PDF, DOCX, LaTeX e prévia).
2. `src/ia/` chama o provedor com o prompt da equipe (`prompts.ts`, baseado no master prompt de
   otimização) e um schema zod (`schemas.ts`). A regra principal é **não inventar nada**.
3. `src/ia/travas.ts` confere a resposta contra o original: contatos, datas, cargos, formações,
   idiomas e certificações voltam a ser os originais; empresas, projetos e competências que não
   existiam são descartados; números novos são listados para o usuário conferir.
4. A nota antes/depois é calculada pelo código (não pela IA), para ser estável e comparável.
5. `src/ia/garantia-nota.ts` garante que **a nota nunca cai**: se uma seção reescrita (resumo,
   experiências, projetos ou competências) baixar a nota geral ou a nota da vaga, ela volta ao texto
   original. Se mesmo assim a nota ficasse menor, a resposta é o currículo original. A tela avisa
   quais seções foram mantidas.

**Ordem das seções:** início de carreira (vaga de estágio/trainee, curso em andamento ou menos de
12 meses de experiência) → Resumo, Formação, Projetos, Experiência...; com experiência → Resumo,
Experiência, Projetos, Formação... O motivo aparece na prévia ATS.

## Endpoints

Base: `http://localhost:3001/api`. Todas as respostas são JSON.

| Método | Rota | Sucesso | Erros |
| --- | --- | --- | --- |
| GET | `/health` | 200 | — |
| POST | `/auth/cadastro` | 201 | 400 dados inválidos · 409 e-mail já cadastrado · 429 |
| POST | `/auth/entrar` | 200 | 400 · 401 e-mail ou senha incorretos · 429 |
| GET | `/auth/sessao` | 200 | 401 sem sessão |
| PATCH | `/auth/perfil` | 200 | 400 nome inválido |
| POST | `/auth/sair` | 204 | — |
| DELETE | `/auth/conta` | 204 | 400 senha incorreta |
| GET | `/curriculos` | 200 | — |
| GET | `/curriculos/:id` | 200 | 400 id não numérico · 404 não encontrado |
| POST | `/curriculos` | 201 | 400 faltou `nome` ou `cargoAlvo`, ou campo inválido |
| POST | `/curriculos/previa-ats` | 200 | 400 campo inválido |
| PUT | `/curriculos/:id` | 200 | 400 · 404 |
| DELETE | `/curriculos/:id` | 204 | 404 |
| GET | `/vagas` | 200 | — |
| POST | `/vagas` | 201 | 400 faltou `empresa` ou `cargo`, ou campo inválido |
| PATCH | `/vagas/:id` | 200 | 400 · 404 |
| DELETE | `/vagas/:id` | 204 | 404 |
| GET | `/ia/provedores` | 200 | — |
| POST | `/ia/analisar-vaga` | 200 | 400 sem `descricaoVaga` |
| POST | `/ia/compatibilidade` | 200 | 400 vaga com menos de 80 caracteres · 429 · 502 · 503 provedor sem chave |
| POST | `/ia/otimizar` | 200 | 400 · 429 · 502 · 503 |
| POST | `/documentos/ler` | 200 | 400 arquivo ausente, sem texto ou que não é PDF/DOCX · 413 acima de 5 MB |
| POST | `/documentos/exportar` | 200 (arquivo) | 400 `formato` diferente de `pdf`, `docx` ou `tex` |
| POST | `/documentos/ortografia` | 200 | 502 serviço de ortografia indisponível |
| rotas de dados sem login | — | — | 401 `{ "error": "Entre na sua conta para continuar." }` |
| qualquer outra | — | — | 404 `{ "error": "Rota não encontrada" }` |
| falha inesperada | — | — | 500 `{ "error": "Erro interno no servidor" }` |

### Exemplos

> No Windows, use o **Git Bash** para rodar os comandos abaixo como estão. No PowerShell,
> troque `curl` por `curl.exe` e use aspas duplas escapadas no JSON.

**Criar conta e entrar** (o cookie de sessão fica salvo em `cookies.txt`; os exemplos seguintes
usam `-b cookies.txt` para enviá-lo)

```bash
curl -c cookies.txt -X POST http://localhost:3001/api/auth/cadastro -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","email":"ana@example.com","senha":"SenhaFicticia123"}'
curl -c cookies.txt -X POST http://localhost:3001/api/auth/entrar -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","senha":"SenhaFicticia123"}'
```

**Health check**

```bash
curl http://localhost:3001/api/health
```

```json
{ "status": "ok", "service": "alvo-api", "ambiente": "development", "timestamp": "2026-10-04T12:00:00.000Z" }
```

**Listar e buscar currículos**

```bash
curl -b cookies.txt http://localhost:3001/api/curriculos
curl -b cookies.txt http://localhost:3001/api/curriculos/1
curl -b cookies.txt http://localhost:3001/api/curriculos/99      # 404
```

**Criar currículo** (`nome` e `cargoAlvo` obrigatórios; `email`, `resumo`, `formacao`,
`experiencias` e `habilidades` opcionais)

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/curriculos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","cargoAlvo":"Desenvolvedora Front-end","habilidades":["React","CSS","Git"]}'
```

Resposta `201`:

```json
{ "nome": "Ana Souza", "cargoAlvo": "Desenvolvedora Front-end", "experiencias": [], "habilidades": ["React", "CSS", "Git"], "id": 5, "tipo": "base", "pontuacao": 52, "atualizadoEm": "..." }
```

Faltando campos obrigatórios, a resposta é `400`:

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/curriculos -H "Content-Type: application/json" -d '{}'
```

```json
{ "statusCode": 400, "error": "Dados inválidos", "detalhes": ["O campo nome é obrigatório", "O campo cargoAlvo é obrigatório"], "path": "/api/curriculos", "timestamp": "..." }
```

**Vagas** (`status`: `aplicado` · `entrevista` · `oferta` · `rejeitado`; padrão `aplicado`)

```bash
curl -b cookies.txt http://localhost:3001/api/vagas
curl -b cookies.txt -X POST http://localhost:3001/api/vagas \
  -H "Content-Type: application/json" \
  -d '{"empresa":"Nubank","cargo":"Engenheira de Software","status":"entrevista","link":"https://nubank.com.br/carreiras"}'
```

**Mover a candidatura de etapa e excluir**

```bash
curl -b cookies.txt -X PATCH http://localhost:3001/api/vagas/1 -H "Content-Type: application/json" -d '{"status":"entrevista"}'
curl -b cookies.txt -X DELETE http://localhost:3001/api/vagas/1      # 204
```

**Análise automática da vaga** (sem IA, instantânea)

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/ia/analisar-vaga -H "Content-Type: application/json" \
  -d '{"descricaoVaga":"Analista Financeiro Pleno\n\nRequisitos:\n- Excel avançado e Power BI\n- Conciliação bancária"}'
```

**Relatório de compatibilidade e otimização** (`provedor`: `anthropic`, `openai` ou `google`;
sem ele, modo demonstração). O currículo vai no corpo, no mesmo formato do POST:

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/ia/otimizar -H "Content-Type: application/json" \
  -d '{"provedor":"google","descricaoVaga":"...","curriculo":{"nome":"Ana Souza","cargoAlvo":"Analista de Dados","habilidades":["SQL","Python"]}}'
```

**Ler um currículo existente** (PDF ou DOCX; o arquivo não é salvo)

```bash
curl -b cookies.txt -F "arquivo=@meu-curriculo.pdf" http://localhost:3001/api/documentos/ler
```

**Exportar** (`pdf`, `docx` ou `tex` para o Overleaf)

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/documentos/exportar -H "Content-Type: application/json" \
  -d '{"formato":"pdf","curriculo":{"nome":"Ana Souza","cargoAlvo":"Analista de Dados"}}' -o curriculo.pdf
```

> Os dados ficam no banco SQLite (`dados/alvo.sqlite`) e continuam lá depois de reiniciar a API.

## Estrutura de pastas

Cada funcionalidade tem a própria pasta (requisito 7.3: a estrutura reflete funcionalidades).
Dentro dela, o **controller** recebe a requisição HTTP e devolve a resposta; o **service** guarda a
regra de negócio; o **dto** define e valida o corpo aceito.

```
alvo-api/
├── src/
│   ├── main.ts                    # Sobe o servidor: CORS, prefixo /api, validação, erros
│   ├── app.module.ts              # Módulo raiz: registra config, banco, auth e os recursos
│   ├── banco/                     # Conexão SQLite e criação das tabelas
│   ├── auth/                      # Cadastro, login, sessão, perfil, exclusão de conta e guarda das rotas
│   ├── config/
│   │   └── database.ts            # Caminho padrão do arquivo do banco
│   ├── common/
│   │   ├── filters/               # Tratamento global de erros (formato { error, detalhes })
│   │   ├── middlewares/           # 404 em JSON para rotas fora de /api
│   │   └── transformers/          # Apara espaços e trata texto vazio como "não informado"
│   ├── health/                    # GET /api/health
│   ├── ats/                       # Regras sem IA: palavras-chave, análise da vaga, nota ATS, documento
│   ├── ia/                        # Provedores de IA, prompts, schemas, modo demonstração, trava de fatos e garantia de nota
│   ├── documentos/                # Leitura de PDF/DOCX, exportação PDF/DOCX/LaTeX e ortografia
│   ├── curriculos/
│   │   ├── curriculos.controller.ts   # GET, GET /:id, POST, PUT, DELETE e POST /previa-ats
│   │   ├── curriculos.service.ts      # CRUD no banco (por usuário) e nota ATS
│   │   ├── curriculos.module.ts
│   │   ├── dto/                       # Regras de validação do POST
│   │   └── interfaces/                # Tipos Curriculo e Experiencia
│   └── vagas/                     # Mesma organização de currículos
├── scripts/                       # Testes: regras, HTTP com banco descartável e IA real (opcional)
├── docs/VALIDACAO_ENTREGA.md      # O que foi testado na entrega final e os limites
├── .env.example                   # Modelo das variáveis de ambiente (versionado)
├── .gitignore
├── nest-cli.json · tsconfig.json · tsconfig.build.json
├── oxlint.json · .prettierrc
├── package.json
├── CONTRIBUTING.md                # Guia do time: branches, commits, PRs, Jira
└── README.md
```

## Boas práticas adotadas

- Códigos HTTP corretos: 200, 201, 204, 400, 401, 403, 404, 409, 413, 429, 500, 502 e 503.
- Consultas SQL com parâmetros (`?`), nunca concatenando texto do usuário (evita SQL injection).
- Testes automatizados com `npm test`: regras da nota e da trava de fatos, garantia de nota e
  90 verificações HTTP em um banco temporário (inclui reiniciar a API e conferir que os dados ficam).
- Validação de entrada com mensagens em português, uma por campo.
- Separação controller (HTTP) / service (regra de negócio) / dto (validação).
- Funções curtas, com JSDoc nas principais e comentários que explicam o porquê.
- Fluxo Git `feat/* → develop → main` com PR e review; detalhes no
  [CONTRIBUTING.md](./CONTRIBUTING.md).

## Próximas sprints

Login via OAuth com Google (dispensado nesta entrega), recuperação de senha, filtro de vagas e
notificações. Para publicar em nuvem, trocar o SQLite por PostgreSQL mantendo as mesmas tabelas.

## Equipe

<!-- Preencher: nome — papel — GitHub -->
| Integrante | GitHub | Papel |
| --- | --- | --- |
| Letícia Miniuk Rosa Pereira | @ltcmnk | Líder: processo, design system e documentação |
| Victor Willian Rodrigues Bittencourt | @scourgeyyy | API: modelo de currículo, nota ATS e IA |
| Karen Cristini Nogueira | @nogueiiiiiiiiira | Editor, exportação, ortografia e candidaturas |
| Rayssa Gaievicz Grafetti | @T-800-888 | Criação de currículo, leitura de arquivo e otimização |

> A base deste projeto foi estruturada com apoio de IA (Claude, da Anthropic) e revisada,
> testada e versionada pela equipe.
