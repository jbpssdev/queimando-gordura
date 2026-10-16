# Queimando Gordura 1.0

Monorepo Angular 22 + NestJS 12. Checkpoint 2: integração de autenticação Firebase e perfis individuais. Landing, cadastro, login por e-mail/senha e Google, recuperação de senha, confirmação de e-mail, guards e painel básico foram integrados. Avaliação corporal, IMC, calorias e Adaptação continuam **não implementados**; suas rotas apresentam somente avisos de funcionalidades futuras.

## Ambiente

Node.js 24.21.0 e npm 11.x já utilizados pelo projeto. Instalação reproduzível na raiz:

```sh
npm ci
npm run dev
```

O modo padrão conserva Firebase desativado: a interface pode ser inspecionada, mas não cria identidades nem oferece login falso. Health funciona sem segredos; endpoints de perfil retornam 503 quando Firebase está desativado.

Para a integração local completa, com portas livres e Java 21+ disponível:

```sh
npm run dev:emulator
```

Esse comando inicia somente serviços deste monorepo: Auth/Firestore Emulator, Angular em configuração emulator e Nest com os hosts locais e projeto demo fixos. Ctrl+C encerra os processos iniciados pelo comando. Não alterar variáveis globais. A cópia portátil local de Java em .tools/java é ignorada pelo Git; outras máquinas podem usar Java 21+ no PATH.

| Serviço            | URL                                 |
| ------------------ | ----------------------------------- |
| Angular            | http://localhost:4200               |
| API / health       | http://localhost:3100/api/v1/health |
| Auth Emulator      | http://127.0.0.1:9099               |
| Firestore Emulator | http://127.0.0.1:8080               |
| Emulator UI        | http://127.0.0.1:4000               |

Em caso de porta ocupada, preserve a sessão existente. Os testes de navegador aceitam QG_FRONTEND_PORT; a integração usa 4201 por padrão, sem mudar a porta normal do produto.

## Contrato integrado

- Frontend usa /api pelo proxy Angular para Nest na porta 3100. Produção futura requer proxy reverso de mesma origem.
- GET /api/v1/health: 200 com status ok, sem afirmar conectividade Firebase.
- PUT /api/v1/users/me: exige Firebase ID Token; cria/atualiza somente users/{uid} do token validado. Recebe firstName, lastName e age18Confirmed=true. Permitido antes da confirmação do e-mail para concluir cadastro; preserva createdAt.
- GET /api/v1/users/me: exige token e e-mail confirmado. Perfil ausente: 404; sem token/token inválido: 401; e-mail não confirmado: 403; Firebase desativado ou persistência indisponível: 503.
- UID, e-mail e estado de verificação não são campos de autorização aceitos do cliente. Firestore web permanece fechado; somente a API grava perfis.
- Confirmar e-mail recarrega o usuário e força renovação do ID Token. O backend também consulta Auth quando um token ainda contém estado não confirmado.
- Cadastro parcial mantém a identidade criada e os dados digitados, oferece nova tentativa de PUT e não cria outra identidade. Uma falha de consulta 503 não é confundida com perfil 404.

## Scripts e validação

| Comando                                              | Finalidade                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| npm run dev                                          | Angular + Nest, Firebase desativado por padrão                             |
| npm run dev:frontend / dev:backend                   | Desenvolvimento separado                                                   |
| npm run dev:emulator                                 | Três serviços integrados, sem segredos                                     |
| npm run dev:frontend:emulator / dev:backend:emulator | Aplicações em modo emulador, separadamente                                 |
| npm run emulators                                    | Auth + Firestore locais                                                    |
| npm run lint / typecheck / format:check              | Qualidade e tipos                                                          |
| npm test                                             | Unitários Angular/jsdom e Nest, execução única                             |
| npm run test:e2e                                     | Testes HTTP isolados; o integrado real não roda sem emuladores             |
| npm run test:emulator --workspace backend            | Teste real do backend com emuladores temporários                           |
| npm run build                                        | Build Angular de produção + Nest                                           |
| npm run test:smoke                                   | Página técnica em /verificacao-ambiente, mobile/desktop, após build Nest   |
| npm run test:integration                             | Emuladores temporários, backend real, navegador Angular e regras Firestore |
| npm run test:rules                                   | Somente regras restritivas contra emuladores                               |
| npm run validate                                     | Checkpoint transversal completo                                            |

Navegador: instalar Chromium do Playwright uma vez com npx playwright install chromium (Linux CI: --with-deps). Os testes de integração iniciam seus servidores, criam identidades temporárias únicas, verificam persistência e removem somente seus próprios perfis/identidades, inclusive após falhas. Não limpam bases inteiras. Emuladores iniciados pelos scripts são encerrados ao terminar. Não executar testes automáticos nas portas de outra sessão.

A automação usa o SDK/REST oficial do Auth Emulator, renovação real de tokens do emulador, Admin SDK no backend e código de confirmação emitido pelo próprio emulador. O cenário de cadastro parcial utiliza uma API real com Firebase desativado, retornando 503; não intercepta a rede para inventar sucesso. Traces/HAR de autenticação ficam desativados para não armazenar senhas ou tokens nos artefatos. Capturas em test-results são ignoradas pelo Git.

## Firebase em nuvem: ainda não validado

O projeto demo-queimando-gordura existe somente para emulação. Emuladores não entregam e-mails reais, não validam IAM de nuvem nem substituem validação de OAuth/Google, entrega de e-mail, quotas e proteção contra abuso. Os ID Tokens locais não são credenciais de produção.

Antes de testar em nuvem, configurar um **projeto Firebase real de desenvolvimento**, separado de produção: app web, Auth e-mail/senha + Google, domínios autorizados, ações de e-mail, Firestore e regras restritivas. Informar opções públicas apiKey/authDomain/projectId/appId no ambiente Angular apropriado. Backend usa FIREBASE_MODE=production (nome atual do modo para SDK de nuvem), projeto real, CORS HTTPS e arquivo de conta de serviço externo em GOOGLE_APPLICATION_CREDENTIALS; remover hosts de emuladores. Consultar backend/.env.example. Nenhuma chave privada pode ser versionada ou ir ao navegador. Nenhum recurso real foi criado por esta integração.

## Organização e continuidade

frontend/src/app/core contém infraestrutura de sessão/HTTP; features organiza as telas; shared/ui contém Spartan oficial. backend/src/modules contém firebase, auth, users e health; config valida ambiente; common trata erros. Configurações TypeScript são separadas, npm workspaces compartilham um único package-lock.json. Instalar pacotes a partir da raiz, com --workspace quando apropriado. Sem Git ou lockfiles internos.

- [Arquitetura](docs/architecture.md)
- [Segurança](docs/security.md)
- [Produto](docs/product.md)
- [Roadmap](docs/roadmap.md)
- [Manutenção e trabalho em worktrees](AGENTS.md)

A CI existente foi preservada e não faz deploy. **GitHub Actions está bloqueado externamente por cobrança da conta**; não corrigir isso por mudanças de código. A validação local é independente desse bloqueio. Alertas transitivos de ferramentas estão registrados em docs/security.md.

O Git deste workspace foi criado por outro usuário na tentativa anterior. Operações desta sessão usam a exceção restrita por comando git -c safe.directory=D:/CODE/QueimandoGordura, sem configuração global. Worktrees ORCA foram preservados.

O runner Angular utiliza no máximo dois workers para reduzir contenção durante a inicialização dos testes no Windows. A configuração é carregada pelo builder oficial em frontend/vitest.config.ts.

Validação local do checkpoint 2: 109 testes aprovados — 48 unitários Angular, 32 unitários Nest, 21 HTTP, 1 integrado backend/emuladores, 4 fluxos de navegador/emuladores, 2 smoke tests responsivos e 1 teste das regras Firestore. Formatação, lint, tipos e ambos os builds aprovados. Emuladores e registros temporários encerrados/removidos após a validação.
