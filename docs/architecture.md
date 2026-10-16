# Arquitetura

## Decisão principal

Aplicação Angular standalone, mobile-first, com Router, lazy loading e Signals para estado local. API REST NestJS por módulos de domínio. npm workspaces, sem Nx/Turborepo, banco relacional ou ferramentas de orquestração. Apenas página de verificação e `GET /api/v1/health` implementados.

## Autenticação e acesso a dados futuros

1. Usuário acessa Angular.
2. Firebase Authentication autentica a identidade e renova a sessão no navegador.
3. Frontend envia Firebase ID Token no cabeçalho `Authorization: Bearer <token>` à API.
4. Nest valida o token com Firebase Admin SDK.
5. API identifica o usuário pelo `uid` validado e autoriza a operação.
6. API consulta/modifica somente registros Firestore autorizados.
7. Retorna apenas os dados necessários e autorizados.

Dados pessoais, avaliações, refeições e progresso serão acessados exclusivamente pela API. O navegador poderá usar diretamente Firebase Authentication; não acessará essas coleções com o SDK Firestore. Não haverá autenticação paralela nem duas fontes de verdade para os registros.

Nunca usar `userId` recebido do cliente para autorizar registros. Guards futuros devem extrair a identidade do token validado; consultas, gravações e operações em lote precisam verificar propriedade e escopo no backend. Sugestão futura de organização: subcoleções sob `users/{uid}`, a definir quando os modelos forem implementados. Nenhuma coleção é criada agora.

O Admin SDK ignora regras Firestore; autorização própria da API é obrigatória, inclusive para acesso por ID direto. As regras atuais negam toda leitura/escrita por clientes, autenticados ou não. Firebase Admin e credenciais administrativas jamais entram no bundle Angular.

## Responsabilidades

- `frontend/core`: HTTP, configuração e autenticação futura; `shared`: recursos reutilizáveis; `features`: domínios; `layouts`: estruturas públicas/autenticadas quando necessárias.
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

Frontend usa `/api`, proxy local em 4200 para 3100 e futuro proxy reverso de mesma origem em produção. Nest valida `NODE_ENV`, portas, origens e modo Firebase. Produção exige CORS explícito HTTPS. Firebase desativado permite o health sem segredos; modo produção exige projeto real e arquivo administrativo externo existente. A validação não afirma que a credencial é válida ou que houve conexão. Emuladores exigem projeto demo, hosts loopback e ambiente não produtivo.

Spartan Brain é dependência npm; componentes Helm Button/Card e utilitário são copiados pelo gerador oficial para `frontend/src/app/shared/ui`. Tokens semânticos de cor, tipografia, raio e foco vivem em `styles.css`. Apenas tema claro. Novos temas podem substituir tokens posteriormente. Preferência de movimento reduzido é respeitada; foco visível e acesso por teclado preservados.

TypeScript Angular e Nest têm configurações independentes. Angular conserva builder oficial e Vitest/jsdom; Nest usa o runner Vitest da configuração oficial. Vitest 5 e cobertura ficam centralizados na raiz para evitar resolução ambígua entre workspaces. Vite não emite metadados TypeScript de decorators: testes que dependem deles devem usar `@Inject` explícito ou definir metadados do DTO de prova; o build Nest via tsc emite os metadados normalmente.

## Referências oficiais

- [Compatibilidade Angular](https://angular.dev/reference/versions)
- [Instalação Spartan UI](https://www.spartan.ng/documentation/installation)
- [Tailwind com Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
- [Configuração NestJS](https://docs.nestjs.com/techniques/configuration)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure)
