# alvo-api

API do **Alvo**, plataforma que cria e otimiza currículos com foco em sistemas ATS e acompanha
as candidaturas do usuário, da inscrição ao contrato.

Nesta **Sprint 1 (Semana 1)** a API entrega a base técnica: health check, currículos e vagas com
dados mock em memória, validação de entrada e respostas de erro padronizadas. Banco de dados, IA e
autenticação OAuth entram nas próximas sprints.

- Frontend: [alvo-frontend](https://github.com/<organizacao>/alvo-frontend)
- Guia do time: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Stack

| Tecnologia | Uso |
| --- | --- |
| Node.js 20+ | Ambiente de execução |
| NestJS 12 | Framework da API (módulos, controllers, services, injeção de dependência) |
| Express | Servidor HTTP usado pelo Nest por baixo (`@nestjs/platform-express`) |
| TypeScript | Tipagem estática (aceita pelo requisito, seção 13) |
| @nestjs/config | Leitura do `.env` (usa `dotenv` internamente) |
| class-validator / class-transformer | Validação do corpo das requisições |
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
| `src/config/database.js` | `src/config/database.ts` (placeholder, sem banco na Semana 1) |
| `dotenv` + `cors` | `@nestjs/config` + `app.enableCors()` |
| `nodemon` (`npm run dev`) | `nest start --watch` (mesmo efeito: reinicia a cada alteração) |

## Pré-requisitos

- Node.js **20 ou superior** (`node -v`)
- npm 10 ou superior

## Como rodar localmente

```bash
git clone https://github.com/<organizacao>/alvo-api.git
cd alvo-api
npm install
cp .env.example .env      # no Windows (PowerShell): copy .env.example .env
npm run dev
```

A API sobe em **http://localhost:3001/api**. Teste em outro terminal:

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

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3001` | Porta da API |
| `NODE_ENV` | `development` | Ambiente, exibido no health check |
| `FRONTEND_URL` | `http://localhost:5173` | Origem liberada no CORS (endereço do Vite) |
| `DATABASE_URL` | vazio | Reservada para o banco do MVP |
| `API_SECRET` | vazio | Reservada para a autenticação do MVP |

O `.env` não é versionado; o modelo está em `.env.example`.

## Endpoints

Base: `http://localhost:3001/api`. Todas as respostas são JSON.

| Método | Rota | Sucesso | Erros |
| --- | --- | --- | --- |
| GET | `/health` | 200 | — |
| GET | `/curriculos` | 200 | — |
| GET | `/curriculos/:id` | 200 | 400 id não numérico · 404 não encontrado |
| POST | `/curriculos` | 201 | 400 faltou `nome` ou `cargoAlvo`, ou campo inválido |
| GET | `/vagas` | 200 | — |
| POST | `/vagas` | 201 | 400 faltou `empresa` ou `cargo`, ou campo inválido |
| qualquer outra | — | — | 404 `{ "error": "Rota não encontrada" }` |
| falha inesperada | — | — | 500 `{ "error": "Erro interno no servidor" }` |

### Exemplos

> No Windows, use o **Git Bash** para rodar os comandos abaixo como estão. No PowerShell,
> troque `curl` por `curl.exe` e use aspas duplas escapadas no JSON.

**Health check**

```bash
curl http://localhost:3001/api/health
```

```json
{ "status": "ok", "service": "alvo-api", "ambiente": "development", "timestamp": "2026-10-04T12:00:00.000Z" }
```

**Listar e buscar currículos**

```bash
curl http://localhost:3001/api/curriculos
curl http://localhost:3001/api/curriculos/2
curl http://localhost:3001/api/curriculos/99      # 404
```

**Criar currículo** (`nome` e `cargoAlvo` obrigatórios; `email`, `resumo`, `formacao`,
`experiencias` e `habilidades` opcionais)

```bash
curl -X POST http://localhost:3001/api/curriculos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","cargoAlvo":"Desenvolvedora Front-end","habilidades":["React","CSS","Git"]}'
```

Resposta `201`:

```json
{ "nome": "Ana Souza", "cargoAlvo": "Desenvolvedora Front-end", "experiencias": [], "habilidades": ["React", "CSS", "Git"], "id": 5, "tipo": "base", "pontuacao": 52, "atualizadoEm": "..." }
```

Faltando campos obrigatórios, a resposta é `400`:

```bash
curl -X POST http://localhost:3001/api/curriculos -H "Content-Type: application/json" -d '{}'
```

```json
{ "statusCode": 400, "error": "Dados inválidos", "detalhes": ["O campo nome é obrigatório", "O campo cargoAlvo é obrigatório"], "path": "/api/curriculos", "timestamp": "..." }
```

**Vagas** (`status`: `aplicado` · `entrevista` · `oferta` · `rejeitado`; padrão `aplicado`)

```bash
curl http://localhost:3001/api/vagas
curl -X POST http://localhost:3001/api/vagas \
  -H "Content-Type: application/json" \
  -d '{"empresa":"Nubank","cargo":"Engenheira de Software","status":"entrevista","link":"https://nubank.com.br/carreiras"}'
```

> Os dados ficam **em memória**: o que for criado por POST some quando a API reinicia.
> É o comportamento esperado na Semana 1 (o requisito pede mock, sem banco).

## Estrutura de pastas

Cada funcionalidade tem a própria pasta (requisito 7.3: a estrutura reflete funcionalidades).
Dentro dela, o **controller** recebe a requisição HTTP e devolve a resposta; o **service** guarda a
regra de negócio; o **dto** define e valida o corpo aceito.

```
alvo-api/
├── src/
│   ├── main.ts                    # Sobe o servidor: CORS, prefixo /api, validação, erros
│   ├── app.module.ts              # Módulo raiz: registra config, health, currículos e vagas
│   ├── config/
│   │   └── database.ts            # Placeholder da conexão (banco entra no MVP)
│   ├── common/
│   │   ├── filters/               # Tratamento global de erros (formato { error, detalhes })
│   │   ├── middlewares/           # 404 em JSON para rotas fora de /api
│   │   └── transformers/          # Apara espaços e trata texto vazio como "não informado"
│   ├── health/                    # GET /api/health
│   ├── curriculos/
│   │   ├── curriculos.controller.ts   # Rotas GET, GET /:id e POST
│   │   ├── curriculos.service.ts      # Listagem, busca, criação e pontuação inicial
│   │   ├── curriculos.module.ts
│   │   ├── dto/                       # Regras de validação do POST
│   │   ├── interfaces/                # Tipos Curriculo e Experiencia
│   │   └── data/                      # Dados mock
│   └── vagas/                     # Mesma organização de currículos
├── .env.example                   # Modelo das variáveis de ambiente (versionado)
├── .gitignore
├── nest-cli.json · tsconfig.json · tsconfig.build.json
├── oxlint.json · .prettierrc
├── package.json
├── CONTRIBUTING.md                # Guia do time: branches, commits, PRs, Trello
└── README.md
```

## Boas práticas adotadas

- Códigos HTTP corretos: 200, 201, 400, 404 e 500.
- Validação de entrada com mensagens em português, uma por campo.
- Separação controller (HTTP) / service (regra de negócio) / dto (validação).
- Funções curtas, com JSDoc nas principais e comentários que explicam o porquê.
- Fluxo Git `feat/* → develop → qas → main` com PR e review; detalhes no
  [CONTRIBUTING.md](./CONTRIBUTING.md).

## Próximas sprints

Banco de dados (PostgreSQL), login via OAuth, edição e exclusão (PATCH e DELETE) de currículos,
vagas e usuário, melhoria de currículo com IA, relatório de compatibilidade e exportação.

## Equipe

<!-- Preencher: nome — papel — GitHub -->
| Integrante | Papel |
| --- | --- |
| | Líder / Produto |
| | |

> A base deste projeto foi estruturada com apoio de IA (Claude, da Anthropic) e revisada,
> testada e versionada pela equipe.
