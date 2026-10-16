# Queimando Gordura 1.0

Monorepo Angular + API REST NestJS. Checkpoint 0: fundação técnica; sem cadastro, login, dashboard ou cálculos de emagrecimento.

## Executar

Pré-requisitos: Node.js **24.21.0** e npm **11.x**. Na raiz:

```sh
npm ci
npm run dev
```

- Frontend: http://localhost:4200
- API: http://127.0.0.1:3100/api/v1/health → `{"status":"ok"}`
- O botão **Verificar API** usa `/api/v1/health` através do proxy Angular.
- Nenhuma credencial, projeto Firebase real ou arquivo `.env` é necessário.
- `Ctrl+C` encerra os processos iniciados pelo comando. Portas ocupadas causam erro; não encerre processos de outros projetos.

## Comandos

| Comando                                   | Finalidade                                             |
| ----------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                             | Frontend e backend simultâneos, compatível com Windows |
| `npm run dev:frontend`                    | Angular, porta 4200                                    |
| `npm run dev:backend`                     | Nest em watch, porta 3100                              |
| `npm run lint`                            | Angular ESLint e ESLint backend                        |
| `npm run typecheck`                       | Angular compiler e TypeScript estritos                 |
| `npm test`                                | Testes unitários, execução única                       |
| `npm run test:e2e`                        | Contrato HTTP, CORS, erros e validação                 |
| `npm run build`                           | Builds de produção dos dois workspaces                 |
| `npm run test:smoke`                      | Chromium em 375 e 1440px, após build backend           |
| `npm run emulators`                       | Auth + Firestore locais, projeto demo fixo             |
| `npm run test:rules`                      | Emuladores temporários e teste de negação de acesso    |
| `npm run format` / `npm run format:check` | Formatar / verificar Prettier                          |
| `npm run validate`                        | Checkpoint integrado completo                          |

Para testes de navegador, instale o Chromium do Playwright com `npx playwright install chromium` (na CI Linux: `--with-deps`). O teste inicia seus próprios servidores e exige as portas livres. Capturas ficam em `test-results/`, ignoradas pelo Git.

## Organização

```text
frontend/src/app/
  core/                 HTTP e configuração pública Firebase
  shared/ui/            componentes oficiais Spartan gerados
  features/foundation/  página técnica carregada por rota lazy
backend/src/
  common/               filtro HTTP global
  config/               validação de ambiente e bootstrap HTTP
  modules/health/       único módulo HTTP atual
firebase/               regras restritivas e teste de segurança
scripts/                emuladores e smoke tests
docs/                   arquitetura, produto, segurança e roadmap
.github/workflows/      CI sem segredos de produção
```

`layouts/` e novos domínios serão criados quando houver uso concreto. As aplicações mantêm configurações TypeScript separadas. Dependências são geridas pelos npm workspaces e por **um único package-lock.json na raiz**; instale pacotes com `npm install <pacote> --workspace frontend|backend` a partir da raiz. Não execute `npm init`, `git init` ou crie lockfiles nas aplicações.

## Ambientes

O backend lê `backend/.env` quando executado pelos scripts do workspace. Consulte [backend/.env.example](backend/.env.example). Variáveis do processo prevalecem sobre o arquivo. Desenvolvimento usa `NODE_ENV=development`, `PORT=3100`, `CORS_ORIGINS=http://localhost:4200` e `FIREBASE_MODE=disabled`. Testes não dependem de segredos. Produção exige origens HTTPS explícitas e utiliza `npm run start:prod --workspace backend` após build. O backend escuta loopback; a exposição futura requer proxy reverso na mesma máquina ou revisão explícita do bind.

Frontend: configuração pública em `src/environments/`, substituída pelo Angular no build de produção. Firebase permanece desativado nos dois ambientes. Nenhum segredo pode entrar nesses arquivos: todo conteúdo do frontend é público. O build de produção pressupõe frontend e `/api` na mesma origem, com proxy reverso para Nest; o proxy Angular é exclusivo de desenvolvimento. Publicação de infraestrutura está fora deste checkpoint.

Na integração futura de Auth, os campos públicos do Firebase serão `apiKey`, `authDomain`, `projectId` e `appId` em `environment.firebase.options`. Credenciais administrativas pertencem somente ao backend e ficam fora do repositório.

## Firebase local

Auth: `127.0.0.1:9099`; Firestore: `127.0.0.1:8080`; Emulator UI: http://127.0.0.1:4000. Os scripts fixam `--project demo-queimando-gordura`; não realizam login, deploy, importação nem criam dados de produção. Firestore exige **Java 21+**. Pode vir do PATH ou de uma distribuição portátil em `.tools/java/<distribuição>/bin/java.exe`. Nesta máquina foi preparada uma cópia portátil local, ignorada pelo Git; a CI provisiona Java separadamente.

SDK JavaScript instalado no frontend; Admin SDK somente no backend. **Nenhum SDK é inicializado** neste checkpoint. Subir emuladores não conecta automaticamente as aplicações. A integração de Auth/ID token e Firestore será feita no checkpoint seguinte. O health informa somente o funcionamento HTTP, sem afirmar conectividade externa.

## Decisões e continuidade

- [Arquitetura e convenções da API](docs/architecture.md)
- [Escopo aprovado do produto](docs/product.md)
- [Segurança e privacidade](docs/security.md)
- [Roadmap](docs/roadmap.md)
- [Orientações de manutenção](AGENTS.md)

O workflow CI executa instalação limpa, formatação, lint, typecheck, testes, builds, navegador e regras Firestore; não realiza deploy. A publicação do repositório não publica o site.

Limitações de dependências transitivas de ferramentas de desenvolvimento estão registradas em [security.md](docs/security.md#dependências-no-checkpoint-0).

Neste workspace Windows, `.git` foi criado por outro usuário na tentativa anterior. As operações desta sessão usam `git -c safe.directory=D:/CODE/QueimandoGordura ...`, exceção restrita ao comando, preservando os metadados e sem modificar configuração global. Clones novos pertencentes ao usuário atual não precisam dessa exceção.
