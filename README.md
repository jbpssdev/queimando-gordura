# Queimando Gordura 1.0

Monorepo Angular 22 + NestJS 12. Checkpoint 5C integra frontend `3ac502a` e backend `23493d6` sobre `9d4d998`. Autenticação, perfis, Minha Conta e Avaliação Inicial com rascunho, cálculos no servidor e resultados versionados estão implementados. Calendário e plano Adaptação continuam não implementados.

## Executar e visualizar

Node.js 24 e npm 11. Na raiz:

```sh
npm ci
npm run dev:cloud
```

Esta máquina possui `backend/.env.cloud.local` ignorado e ADC externa já configurados para o projeto real **DEV `queimando-gordura-783e4`**. Outras máquinas precisam de sua própria autorização ADC, conforme [guia Cloud DEV](docs/firebase-cloud-dev.md). Nenhuma chave privada de conta de serviço foi criada. Não copiar credenciais entre desenvolvedores.

| Serviço                                   | URL                                 |
| ----------------------------------------- | ----------------------------------- |
| Angular                                   | http://localhost:4200               |
| API / health                              | http://localhost:3100/api/v1/health |
| Auth Emulator, somente modo emulator      | http://127.0.0.1:9099               |
| Firestore Emulator, somente modo emulator | http://127.0.0.1:8080               |
| Emulator UI, somente modo emulator        | http://127.0.0.1:4000               |

Acesse `/`, `/cadastrar`, `/entrar`, `/verificar-email`, `/painel`, `/minha-conta`, `/avaliacao` e `/avaliacao/resultados`. Confirme o e-mail antes de acessar o painel e Minha Conta. O health informa somente o processo HTTP, sem declarar conexão com Firebase.

Para desenvolvimento sem segredos, use `npm run dev:emulator`: inicia Auth/Firestore Emulator, Angular em configuração emulator e Nest em projeto demo fixo. Requer Java 21+; o script reconhece a JRE portátil local em `.tools/java`, ignorada pelo Git. `npm run dev` conserva Firebase desativado para inspeção da interface e endpoints protegidos retornam 503. Não há login falso.

Ctrl+C encerra os processos iniciados pelo comando. Preserve sessões de outros projetos em portas ocupadas. Não alterar variáveis globais do Windows.

## Ambientes separados

- Padrão: Firebase desativado, sem segredos.
- Emulator: projeto `demo-queimando-gordura` e hosts locais explícitos.
- Cloud DEV: configuração Angular `cloud-development`, identificadores públicos reais obtidos pelo Firebase MCP; Nest usa ADC externa e projeto explícito `queimando-gordura-783e4`.
- Produção futura: build padrão continua com `environment.production.ts` e Firebase desativado. Exige um projeto e configuração próprios; Cloud DEV não é destino permanente de produção.

O nome legado `FIREBASE_MODE=production` seleciona o SDK Cloud no backend; em DEV, `NODE_ENV=development` continua explícito. Consulte [backend/.env.example](backend/.env.example). CORS local permite somente a origem configurada. O proxy Angular `/api` aponta para Nest na porta 3100; produção futura exige proxy reverso de mesma origem.

## Contrato de autenticação e dados

- Authentication modular do Firebase autentica e mantém sessão no navegador; o interceptor envia Firebase ID Token somente à API relativa `/api`.
- `PUT /api/v1/users/me`: token válido, campos `firstName`, `lastName`, `age18Confirmed=true`; cria/atualiza exclusivamente `users/{uid}` do token, preservando `createdAt`. Permitido antes da confirmação para concluir cadastro.
- `GET /api/v1/users/me`: token válido e e-mail confirmado; retorna somente o próprio perfil.
- Erros: 401 sem token/token inválido; 403 e-mail não confirmado; 404 perfil ausente; 503 serviço indisponível. Falhas de rede não são tratadas como perfil inexistente.
- Identidade, e-mail e autorização vêm do token validado; UID enviado no DTO é rejeitado. Admin SDK existe somente no backend. Firestore nega todo acesso direto de clientes.
- Após confirmação, Angular recarrega a identidade e força renovação do token. Cadastro parcial mantém a identidade e permite repetir a gravação do perfil sem outro cadastro.
- Google tem popup e opção de redirecionamento quando o navegador bloqueia popup. Sua configuração de provedor foi consultada; login pessoal não foi automatizado.

## Scripts e verificações

| Comando                                            | Finalidade                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                                      | Frontend + backend, Firebase desativado por padrão                        |
| `npm run dev:cloud`                                | Angular + Nest no projeto Cloud DEV                                       |
| `npm run dev:frontend:cloud` / `dev:backend:cloud` | Serviços Cloud separados                                                  |
| `npm run dev:emulator`                             | Aplicações + emuladores oficiais locais                                   |
| `npm run dev:frontend` / `dev:backend`             | Serviços padrão separados                                                 |
| `npm run emulators`                                | Auth e Firestore Emulator                                                 |
| `npm run format:check` / `lint` / `typecheck`      | Formatação, análise e tipos                                               |
| `npm test`                                         | Testes unitários e travas de segurança Cloud, execução única              |
| `npm run test:e2e`                                 | HTTP isolado; integrações externas não rodam sem autorização/configuração |
| `npm run build`                                    | Build Angular de produção + Nest                                          |
| `npm run test:smoke`                               | Verificação responsiva da página técnica                                  |
| `npm run test:integration`                         | Backend, Angular e regras contra emuladores temporários                   |
| `npm run test:rules`                               | Regras contra emuladores                                                  |
| `npm run test:cloud`                               | SDK/Auth reais → API → Firestore Cloud DEV                                |
| `npm run test:cloud:browser`                       | Navegador Angular contra serviços Cloud DEV                               |
| `npm run validate`                                 | Regressão local completa; não cria recursos Cloud                         |

Testes de navegador requerem Chromium do Playwright (`npx playwright install chromium` uma vez; em Linux CI, `--with-deps`). Execute as suítes que usam servidores sequencialmente, após build Nest. Elas encerram seus servidores e não reutilizam sessões existentes. Cloud usa 4202/3100 durante a automação; integração com emuladores usa 4201/3105 e smoke usa 4203/3105; `QG_FRONTEND_PORT` permite uma porta de teste explícita.

Testes Cloud exigem uma lista explícita contendo somente `queimando-gordura-783e4`, autorização por ambiente e ausência de emuladores. Criam identidades/senhas aleatórias e removem somente seus próprios documentos e usuários, com confirmação da limpeza. Não limpam coleções ou modificam contas preexistentes. Traces/HAR de autenticação estão desativados para evitar tokens nos artefatos.

## Estado Firebase Cloud DEV

Consultado pelo MCP oficial: app Web real, Firestore `(default)` Standard/Native em `southamerica-east1`, free tier, faturamento desabilitado e regras restritivas já publicadas. Nenhum recurso de infraestrutura foi recriado e nenhuma regra foi republicada. Authentication E-mail/Senha e Google habilitados; `localhost` autorizado, confirmado pela API administrativa oficial.

Teste real de API aprovado: cadastro cliente, token real, persistência por PUT, bloqueio 403, confirmação com link oficial e renovação do token, GET, 401, 404, isolamento entre duas contas e negação de leitura/escrita diretas no Firestore. Limpeza individual confirmada.

A entrega de e-mails em caixa postal real e o login Google com conta pessoal exigem validação interativa. Os testes de confirmação utilizam códigos oficiais gerados pelo Firebase, sem falsificar `emailVerified`; isso não comprova recebimento de mensagens. Não há validação ou deploy de produção. [Detalhes, execução e limitações](docs/firebase-cloud-dev.md).

## Organização e continuidade

`frontend/src/app/core` concentra sessão/HTTP; `features` organiza telas; `shared/ui` contém Spartan oficial. `backend/src/modules` contém firebase/auth/users/health/assessment/adaptation, `config` valida ambiente e `common` padroniza erros. TypeScript separado por aplicação, npm workspaces e um único lockfile. Worktrees e branches foram preservados.

[Arquitetura](docs/architecture.md) · [Segurança](docs/security.md) · [Produto](docs/product.md) · [Roadmap](docs/roadmap.md) · [Orientações para agentes](AGENTS.md).

A CI foi preservada, sem deploy. GitHub Actions permanece bloqueado externamente por cobrança da conta; não foi alterado código para tentar resolver isso. Validações locais são independentes desse bloqueio.

Validação Cloud DEV por navegador também aprovada: cadastro Angular, persistência, confirmação por código oficial, sessão após reload, painel, Minha Conta, logout/login, tratamento de credenciais inválidas e solicitação de recuperação aceita pelo Firebase. Confirmação de recebimento em caixa postal e login Google pessoal permanecem pendentes.

Validação local do checkpoint 4: 122 testes aprovados — 53 Angular, 35 Nest, 2 travas de segurança Cloud, 22 HTTP, 1 integrado backend/emuladores, 4 fluxos Angular/emuladores, 1 teste de regras, 2 smoke responsivos, 1 integrado Cloud/API e 1 fluxo Angular/Cloud. Formatação, lint, tipos, builds Angular/Nest, npm ci, workspaces e consistência do lockfile aprovados. Integrações opcionais são ignoradas no comando HTTP sem configuração e foram executadas separadamente com os serviços reais correspondentes. Emuladores e recursos temporários dos testes foram encerrados/removidos.

## Avaliação Inicial — checkpoint 5C

Cinco etapas: Corpo, Saúde, Rotina, Alimentação e Revisão. Seções são salvas explicitamente pela API e recuperadas do Firestore após interrupção; alterações ainda não salvas ficam somente no formulário. IMC, TMB, GET heurístico, referência de 5% e peso desejado são calculados no backend, com orientações de segurança, pendências e revisão. Resultados anteriores são preservados e uma edição exige recálculo. Nenhum plano automático é gerado e nenhum dado de saúde vai ao localStorage.

Contratos: GET/PATCH /api/v1/assessments/me, POST /api/v1/assessments/me/evaluate e GET /api/v1/assessments/me/results. Consulte [Avaliação Inicial: campos, fórmulas, limites, persistência e testes](docs/assessment.md). A jornada deste checkpoint foi testada somente com dados temporários em emuladores, sem alterar registros Cloud preexistentes. As configurações Firebase DEV e produção foram preservadas.

Validação final do checkpoint 5C: `npm run validate` aprovado, com **252 testes** — 104 Angular, 97 Nest, 2 travas Cloud (unitárias), 36 HTTP, 3 integrações reais backend/emuladores, 7 fluxos de navegador/emuladores, 2 smoke responsivos e 1 teste de regras. Formatação, lint, typecheck, builds e workspaces aprovados; lockfile sem alteração de dependências. A jornada da avaliação foi verificada em 320/390/768/1440 px, com contraste do botão principal, rascunho restaurado, cálculos da API, recálculo, revisão anterior preservada e isolamento. A consulta Cloud opcional não foi executada neste checkpoint. Dados temporários e emuladores foram removidos/encerrados; a sessão Cloud DEV anterior foi preservada.

## Adaptação de 30 dias — checkpoint 6C

Frontend `cc505ee` e backend `fbbdc94` integrados sobre `6848206`. Acesse `/adaptacao` pelo painel após autenticar, confirmar e-mail, completar perfil e concluir a Avaliação Inicial. Consulte modalidades e avisos da API, escolha Padrão e confirme manualmente o início. O plano único persiste em `users/{uid}/adaptations/initial`, reaparece após reload e não reinicia em solicitações repetidas.

Calendário de 30 dias civis no fuso IANA fixado no início; marcos nos dias 7/14/21/30. Dia e progresso vêm do backend. Começa em 0%, atinge 96,7% no Dia 30 e 100% após encerrá-lo. Datas passadas representam apenas tempo, sem presumir adesão ou marcar atividades concluídas.

Endpoints: GET `/api/v1/adaptation/me/preview`, GET `/api/v1/adaptation/me` e POST `/api/v1/adaptation/me/start` com `{mode,timeZone}`. Token validado, e-mail confirmado e propriedade por UID. Início transacional verifica a revisão da avaliação; revisão alterada exige recálculo.

Padrão pode estar disponível para IMC >= 40 isolado, com orientação multidisciplinar; condições adicionais, saúde desconhecida, medicamentos, gestação/lactação e sintomas urgentes impedem início e orientam atendimento apropriado. Intensificada permanece indisponível. Nenhum questionário constitui liberação clínica e não há meta calórica numérica: API retorna null. TMB usa Mifflin-St Jeor; o intervalo heurístico do GET não é precisão clínica comprovada.

Execução: `npm run dev:emulator` (4200/3100, Auth9099/Firestore8080), ou `npm run dev:cloud` com configuração DEV/ADC já existente. Preserve processos que já ocupem essas portas. `npm run validate` executa verificações locais e integrações em portas isoladas4201/3105; smoke4203/3105. A suíte usa relógio substituído somente no servidor de teste demo local, sem alterar documentos para simular tempo. Esta Adaptação foi testada com emuladores; não foi validada com escrita no Cloud nesta integração. Configurações Cloud DEV/produção foram preservadas.

Checkpoint 7 permanece previsto: especificar registros diários, alimentos/preparos, pesagens e histórico, com privacidade e revisão clínica necessárias. Não há diário alimentar, check-in, metas, prescrição, relatórios ou planos Intensificados neste checkpoint. [Contrato, modalidades, persistência, limites e testes](docs/adaptation.md).

Validação do checkpoint 6C: **353 testes distintos aprovados** — 139 Angular, 141 Nest, 2 travas Cloud unitárias, 54 HTTP, 4 integrações backend/emuladores, 10 fluxos de navegador/emuladores, 2 smoke responsivos e 1 teste de regras. Casos Cloud opcionais não foram executados; as integrações com emuladores ignoradas na suíte HTTP foram executadas separadamente contra serviços reais locais. Formatação, lint, typecheck, builds, workspaces e lockfile verificados.
