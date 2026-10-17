# Arquitetura

## Decisão principal

Aplicação Angular standalone, mobile-first, com Router, lazy loading e Signals para estado local. API REST NestJS por módulos de domínio. npm workspaces, sem Nx/Turborepo, banco relacional ou ferramentas de orquestração. Autenticação Firebase, perfis individuais, landing e painel básico integrados no checkpoint 2. Avaliação Inicial foi integrada no checkpoint 5C; Adaptação organizacional de 30 dias foi integrada no checkpoint 6C, sem prescrição ou metas calóricas.

## Autenticação e acesso a dados

1. Usuário acessa Angular.
2. Firebase Authentication autentica a identidade e renova a sessão no navegador.
3. Frontend envia Firebase ID Token no cabeçalho `Authorization: Bearer <token>` à API.
4. Nest valida o token com Firebase Admin SDK.
5. API identifica o usuário pelo `uid` validado e autoriza a operação.
6. API consulta/modifica somente registros Firestore autorizados.
7. Retorna apenas os dados necessários e autorizados.

Dados pessoais, avaliações, refeições e progresso serão acessados exclusivamente pela API. O navegador poderá usar diretamente Firebase Authentication; não acessará essas coleções com o SDK Firestore. Não haverá autenticação paralela nem duas fontes de verdade para os registros.

Nunca usar `userId` recebido do cliente para autorizar registros. Os guards extraem a identidade do token validado; consultas, gravações e operações em lote precisam verificar propriedade e escopo no backend. Sugestão futura de organização: subcoleções sob `users/{uid}`, a definir quando os modelos forem implementados. A coleção users/{uid} armazena o perfil básico. Avaliação Inicial reside em users/{uid}/assessments/initial, com snapshots de resultados por revisão; demais domínios permanecem futuros.

O Admin SDK ignora regras Firestore; autorização própria da API é obrigatória, inclusive para acesso por ID direto. As regras atuais negam toda leitura/escrita por clientes, autenticados ou não. Firebase Admin e credenciais administrativas jamais entram no bundle Angular.

## Responsabilidades

- `frontend/core`: HTTP, configuração e autenticação; `shared`: recursos reutilizáveis; `features`: domínios; `layouts`: estruturas públicas/autenticadas quando necessárias.
- `backend/common`: filtros, guards/interceptors efetivamente necessários; `config`: ambiente validado; `modules`: domínios sem acoplamento indevido.
- Controllers cuidam de HTTP; services futuros de regras; DTOs validam entrada; providers encapsulam infraestrutura quando necessária. Sem services artificiais para o health estático.
- Cálculos metabólicos e recomendações terão implementação de referência no backend. Prévias do frontend não autorizam nem determinam cálculos persistidos.

## Convenções de API

- Prefixo `/api/v1`; JSON e propriedades `camelCase`.
- IDs opacos em string, gerados/validados pelo servidor; não usar e-mail como ID. Firebase `uid` identifica o proprietário autenticado.
- Timestamps em ISO 8601 UTC com `Z` (`2026-10-16T12:00:00.000Z`). Datas civis em `YYYY-MM-DD` sem conversão implícita para UTC; guardar contexto de fuso quando necessário.
- Quantidades futuras: peso em kg, altura e circunferências em cm, alimentos/macronutrientes/fibras em g, energia em kcal, duração em minutos. Campo deve indicar a unidade quando não for inequívoca; arredondamento só após regras documentadas no domínio.
- Erros: `{statusCode, message, path, timestamp}`; `message` pode ser string ou lista de erros de validação. Falhas 500 têm mensagem genérica. Nunca retornar stack, token ou query string.
- `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `forbidUnknownValues`, `transform`. DTOs decorados obrigatórios ao introduzir entrada; autorização antes de operações de dados.
- CORS permite somente origens configuradas e cabeçalhos necessários. CORS não substitui autenticação ou autorização.
- Health confirma somente o processo HTTP: `{"status":"ok"}`.

## Ambientes e UI

Frontend usa `/api`, proxy local em 4200 para 3100 e futuro proxy reverso de mesma origem em produção. Nest valida `NODE_ENV`, portas, origens e modo Firebase. Produção exige CORS explícito HTTPS. Firebase desativado permite o health sem segredos; modo Cloud exige projeto real e ADC autorizada ou arquivo administrativo externo existente. A validação não afirma que a credencial é válida ou que houve conexão. Emuladores exigem projeto demo, hosts loopback e ambiente não produtivo.

Spartan Brain é dependência npm; componentes Helm Button/Card e utilitário são copiados pelo gerador oficial para `frontend/src/app/shared/ui`. Tokens semânticos de cor, tipografia, raio e foco vivem em `styles.css`. Apenas tema claro. Novos temas podem substituir tokens posteriormente. Preferência de movimento reduzido é respeitada; foco visível e acesso por teclado preservados.

TypeScript Angular e Nest têm configurações independentes. Angular conserva builder oficial e Vitest/jsdom; Nest usa o runner Vitest da configuração oficial. Vitest 5 e cobertura ficam centralizados na raiz para evitar resolução ambígua entre workspaces. Vite não emite metadados TypeScript de decorators: testes que dependem deles devem usar `@Inject` explícito ou definir metadados do DTO de prova; o build Nest via tsc emite os metadados normalmente.

## Referências oficiais

- [Compatibilidade Angular](https://angular.dev/reference/versions)
- [Instalação Spartan UI](https://www.spartan.ng/documentation/installation)
- [Tailwind com Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
- [Configuração NestJS](https://docs.nestjs.com/techniques/configuration)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure)

## Integração — checkpoint 2

PUT /api/v1/users/me usa somente FirebaseAuthGuard e permite salvar o próprio perfil antes da confirmação. GET exige também VerifiedEmailGuard: 403 para e-mail não confirmado e 404 quando o perfil não existe. Campos aceitos: firstName, lastName, age18Confirmed=true. Identidade vem exclusivamente do token. Persistência transacional preserva createdAt, atualiza updatedAt em ISO UTC e não armazena senha/token.

Angular usa o interceptor somente para chamadas relativas /api, renova o token depois de recarregar a identidade e distingue 404 de erros de autenticação/indisponibilidade. Cadastro parcial preserva identidade e dados sem repetir signUp. Falhas de consulta mostram recuperação, sem considerar automaticamente o perfil inexistente.

Modo emulator do Angular tem substituição de arquivo explícita e somente projeto demo/hosts loopback; padrão e produção permanecem desativados sem configuração. Admin é inicializado no backend somente quando habilitado e a configuração é validada; ausência de Firebase retorna 503 nos endpoints protegidos. SDKs não afirmam conectividade só porque foram inicializados.

Testes reais usam emuladores oficiais, tokens emitidos por Auth, persistência Firestore e limpeza individual em hooks. O navegador confirma o e-mail com o código emitido pelo emulador e usa a API pelo proxy. Esses testes não validam IAM, entrega de e-mail ou OAuth reais. [Diferenças oficiais do emulador](https://firebase.google.com/docs/emulator-suite/connect_auth).

## Integração Cloud DEV — checkpoint 4

Cloud DEV usa exclusivamente queimando-gordura-783e4. O ambiente Angular cloud-development contém os identificadores públicos consultados pelo MCP, separado do build de produção e de emuladores. O backend prefere applicationDefault() com ADC externa; FIREBASE_USE_ADC=true permite arquivos authorized_user sem tratá-los como certificados de conta de serviço. O nome legado do modo Cloud é production, independente do NODE_ENV de desenvolvimento.

A API mantém os mesmos contratos e a mesma autorização por token; Minha Conta consulta GET /api/v1/users/me. O teste Cloud cria identidades com SDK cliente, usa ID Tokens reais pela API, confirma por código oficial de ação, verifica isolamento e regras Cloud e remove apenas os próprios recursos. Os runners e suítes exigem lista explícita contendo somente o projeto DEV. Detalhes e limitações no [guia Cloud DEV](firebase-cloud-dev.md).

## Avaliação Inicial — checkpoint 5C

O módulo assessment valida seções, calcula métricas e aplica sinalizações de segurança no backend. O frontend traduz DTOs de apresentação para o contrato de transporte, sem implementar fórmulas metabólicas. Persistência transacional incrementa revisão, remove opcionais quando solicitado e impede conclusão de revisão alterada durante cálculo. Snapshots históricos permanecem íntegros. Veja [contrato e limites](assessment.md). Estado de saúde fica apenas em memória de tela e no Firestore via API; troca de identidade cancela requisições e limpa esse estado. Testes isolam serviços em 4201/3105 e preservam a sessão Cloud de desenvolvimento em 4200/3100.

## Adaptação — checkpoint 6C

AdaptationModule usa a avaliação e resultados oficiais, decide elegibilidade e cria documento único por UID via transação, conferindo a revisão corrente. ClockService e utilitários civis calculam calendário e progresso no fuso persistido; o frontend somente traduz a resposta para apresentação. Finalização é temporal e derivada na consulta, sem representar adesão. Dados ficam exclusivamente em users/{uid}/adaptations/initial via API. [Contrato, persistência e salvaguardas](adaptation.md).

## Diário e catálogo — checkpoint7C

FoodsModule fornece catálogo TACO imutável versionado pela fonte e alimentos personalizados por usuário. DiaryModule registra snapshots nutricionais, água, atividades e peso sem exigir plano. Firestore guarda subcoleções privadas sob UID; calendário lê apenas resumos oficiais por data. Identificadores de envio e transações impedem duplicações concorrentes; versões da UI detectam PATCH desatualizado. Totais vêm da API, com cobertura por nutriente e ausência explícita. [Contrato, fonte e persistência](diary.md).

## Evolução e conclusão — checkpoint8C

AdaptationProgressService agrega o diário privado dentro do ciclo e até a data civil corrente; produz semanas, pesagens/indicadores e conquistas derivadas. A revisão que iniciou o plano preserva a referência corporal. AdaptationReportPdfService emite o PDF em memória somente depois do encerramento, com detalhes clínicos excluídos por padrão e Cache-Control no-store. Angular adapta o contrato real e desenha pontos reais, sem reproduzir cálculos de negócio. [Contrato, testes e privacidade](adaptation-progress.md).
