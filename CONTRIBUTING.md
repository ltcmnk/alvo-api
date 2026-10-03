# Guia de contribuição — Time Alvo

Este é o guia oficial do time, válido para os dois repositórios (`alvo-frontend` e `alvo-api`).
Leia uma vez e consulte sempre que tiver dúvida. Seguir o guia é o que garante a nota de
organização (20% da avaliação) e evita conflito entre branches.

> **Mudanças em relação ao guia anterior:** a branch de integração se chama `develop` (não `dev`),
> porque é o nome exigido no requisito da entrega. Os commits seguem Conventional Commits **sem
> espaço** antes do parêntese (`feat(frontend): ...`). O board é o **Trello**.

## Sumário

1. [Antes de começar (uma vez só)](#1-antes-de-começar-uma-vez-só)
2. [Branches](#2-branches)
3. [Commits](#3-commits)
4. [Pull Requests e code review](#4-pull-requests-e-code-review)
5. [DEV to QAS e QAS to MAIN](#5-dev-to-qas-e-qas-to-main)
6. [Board no Trello](#6-board-no-trello)
7. [Fluxo completo do dia a dia](#7-fluxo-completo-do-dia-a-dia)
8. [Proteção das branches no GitHub (líder)](#8-proteção-das-branches-no-github-líder)

---

## 1. Antes de começar (uma vez só)

```bash
# Use o MESMO e-mail da sua conta do GitHub, senão seus commits não contam para você
git config --global user.name "Seu Nome"
git config --global user.email "email-da-sua-conta@github.com"

git clone https://github.com/ltcmnk/<repositorio>.git
cd <repositorio>
git checkout develop
npm install
cp .env.example .env
```

Requisito de ambiente: **Node.js 20.19 ou superior** (`node -v`).

## 2. Branches

### A regra mais importante

> **Ninguém faz commit ou push direto em `develop`, `qas` ou `main`.**
> Toda tarefa tem a própria branch, criada a partir da `develop`.

### Branches fixas

| Branch    | Papel                                                           |
| --------- | --------------------------------------------------------------- |
| `main`    | Versão estável, entregue ao professor. Só recebe PR da `qas`.   |
| `qas`     | Homologação: onde o time testa antes de liberar para a `main`.  |
| `develop` | Integração: onde as PRs de feature chegam primeiro.             |

### Criando a branch da tarefa

```bash
git checkout develop
git pull origin develop
git checkout -b feat/nome-da-tarefa
```

Padrão do nome: `tipo/descricao-curta`, em minúsculas, palavras separadas por hífen.

```
feat/pagina-curriculos      fix/scroll-mobile          docs/readme-api
chore/variaveis-ambiente    refactor/componente-card   design/wireframes
```

### Pausar uma tarefa e trocar de branch

```bash
git stash                     # guarda o que está pela metade
git checkout outra-branch
# ...depois...
git checkout feat/sua-branch
git stash pop                 # recupera o que guardou
```

### Depois do merge

O GitHub apaga a branch remota sozinho (opção ativada no repositório). Apague a local:

```bash
git checkout develop
git pull origin develop
git branch -d feat/nome-da-tarefa
```

## 3. Commits

### Formato

```
tipo(área): descrição no presente, em português
```

Exemplos reais do projeto:

```
feat(frontend): cria componente Header com navegação responsiva
feat(api): adiciona POST /api/curriculos com validação de campos obrigatórios
fix(api): padroniza respostas de erro 400, 404 e 500 em português
docs(api): adiciona README com setup, rotas e exemplos de uso
chore(frontend): instala react-router-dom e axios
style(frontend): ajusta espaçamento dos cards no celular
refactor(frontend): extrai lógica do formulário para hook useFormCurriculo
```

### Tipos

| Tipo       | Quando usar                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | Algo novo: componente, rota, página, endpoint         |
| `fix`      | Correção de bug ou comportamento errado               |
| `docs`     | README, documentação, comentários                     |
| `chore`    | Configuração, dependências, setup                     |
| `style`    | Formatação e estilo visual sem mudar lógica           |
| `refactor` | Reorganização de código sem mudar o comportamento     |
| `test`     | Testes                                                |

Áreas usadas: `frontend`, `api`, `projeto` (docs gerais) e `github` (templates e configurações).

### Regras

- **1 commit = 1 mudança lógica.** Não junte "cria Header" e "corrige API" no mesmo commit.
- Escreva no presente: "cria", "adiciona", "corrige" (não "criou" nem "criando").
- **Proibido:** `ajustes`, `commit final`, `teste`, `fiz umas coisas`, `wip` em PR aberta.
- Adicione os arquivos pelo nome (`git add src/components/nome-do-componente.jsx`) e confira com
  `git status` antes de commitar. Nunca commite o `.env`.

## 4. Pull Requests e code review

### Fluxo obrigatório

```
feat/... | fix/... | docs/...  ──PR──▶  develop  ──PR──▶  qas  ──PR──▶  main
```

Nada vai de `develop` direto para `main`.

### Abrindo a PR

1. `git push origin feat/nome-da-tarefa`
2. No GitHub, clique em **Compare & pull request**.
3. **Base: `develop`** · Compare: sua branch.
4. Título no padrão:
   ```
   [FEAT] Cria página Currículos
   [FIX] Corrige scroll horizontal no celular
   [DOC] Adiciona README da API
   [CHORE] Adiciona variáveis de ambiente
   ```
5. Preencha o template que aparece na descrição.
6. Peça review no grupo e mova o card do Trello para **Code Review**.

### Merge

- Toda PR precisa de **1 aprovação** de outra pessoa (o GitHub não deixa aprovar a própria PR).
- Use sempre **Create a merge commit**. Squash juntaria os seus commits em um só e você
  perderia a contagem de commits exigida (mínimo de 3 por pessoa).

### Como revisar

Abra a aba **Files changed**, comente nas linhas e finalize em **Review changes**:
**Approve** (pode mergear), **Comment** (dúvida que não bloqueia) ou **Request changes**.

O que olhar:

- O código faz o que a PR diz? Rodei localmente e funcionou?
- Segue a estrutura de pastas e o padrão de nomes (camelCase / PascalCase)?
- Tem `console.log` esquecido, código comentado ou arquivo que não devia estar ali (`.env`)?
- Funções curtas (até ~30 linhas) e comentários explicando **por quê**, não **o quê**?

## 5. DEV to QAS e QAS to MAIN

PRs abertas **pela líder** quando um conjunto de features está pronto em `develop`.
Ela avisa no grupo antes; ninguém mergeia nada em `qas` ou `main` por conta própria.

```
[DEV to QAS] Sprint 1 — semana 1          base: qas   compare: develop
[QAS to MAIN] Sprint 1 — entrega semana 1  base: main  compare: qas
```

### Checklist da QAS (antes de abrir QAS to MAIN)

- [ ] `npm install && npm run dev` sobe a aplicação seguindo só o README
- [ ] Navegação entre todas as rotas funciona, incluindo a página 404
- [ ] O frontend alcança a API (status "API conectada" na Home)
- [ ] Nenhuma rota da API retorna erro inesperado (testar os `curl` do README da API)
- [ ] Console do navegador sem erros
- [ ] Sem scroll horizontal em pelo menos 2 resoluções (ex.: 375px e 1440px)
- [ ] `.env.example` confere com as variáveis usadas no código

## 6. Board no Jira

### Colunas

```
BACKLOG      → tudo o que existe para fazer no projeto
TO DO        → priorizado para esta sprint
DOING        → alguém está trabalhando agora
CODE REVIEW  → PR aberta, aguardando revisão
QAS          → mergeado em develop/qas, aguardando teste
DONE         → testado e mergeado em main
```

### Card bem preenchido

```
Título:       [FEAT] Página Currículos
Label:        FEAT
Membro:       quem vai fazer
Data:         prazo
Descrição:    o que precisa ser feito
Checklist (critérios de aceite):
  ☐ Lista vem de GET /api/curriculos
  ☐ Estados de carregando, erro e vazio
  ☐ Responsivo em 375px e 1440px, sem erros no console
  ☐ PR aberta e aprovada
```

Labels: `FEAT` `FIX` `DOC` `DESIGN` `CHORE` `REFACTOR` `TEST`.

## 7. Fluxo completo do dia a dia

```
1. Jira: pegue o card em TO DO, entre como membro, mova para DOING
2. git checkout develop && git pull origin develop
3. git checkout -b feat/nome-da-tarefa
4. Trabalhe e commite em passos pequenos: git add <arquivos> && git commit -m "feat(área): ..."
5. git push origin feat/nome-da-tarefa
6. Abra a PR para develop, preencha o template, avise no grupo
7. Jira: mova para CODE REVIEW
8. Após aprovação: Create a merge commit
9. Jira: mova para QAS; depois do QAS to MAIN, para DONE
```

## 8. Proteção das branches no GitHub (líder)

Em cada repositório, **Settings → Branches → Add classic branch protection rule**, uma regra
para cada branch (`main`, `qas`, `develop`):

- [x] Require a pull request before merging
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Do not allow bypassing the above settings
- [ ] Allow force pushes (deixe **desmarcado**)
- [ ] Allow deletions (deixe **desmarcado**)

Em **Settings → General → Pull Requests**: deixe marcado só **Allow merge commits** e ative
**Automatically delete head branches**.

Durante a sprint, deixe a `develop` como branch padrão (**Settings → General → Default branch**)
para as PRs já abrirem apontando para ela e o template de PR funcionar. Depois do `QAS to MAIN`,
volte a branch padrão para `main`, que é o que o professor vai abrir.

---

> Dúvida? Pergunte no grupo antes de fazer diferente do guia.
