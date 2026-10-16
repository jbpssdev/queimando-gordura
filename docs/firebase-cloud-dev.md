# Firebase Cloud DEV — checkpoint 4

O único projeto autorizado para testes Cloud deste repositório é **queimando-gordura-783e4**. É desenvolvimento, não produção. O Firebase MCP oficial foi consultado em 16/10/2026 usando a autorização existente da CLI; o acesso ao servidor nesta sessão ocorreu por um cliente MCP local e pelo pacote firebase-tools já instalado.

## Configuração consultada

- Projeto ativo; faturamento desabilitado, sem alteração de plano.
- App Web: `1:643848467484:web:f95de017eaf5ca0fa45bd9`.
- Firestore `(default)`, Standard/Native, `southamerica-east1`, free tier.
- Regras publicadas: todas as leituras e escritas diretas de clientes negadas. Nenhum deploy de regras foi necessário.
- Authentication E-mail/Senha e Google habilitados, consultados na API administrativa oficial porque o MCP instalado não oferece configuração de provedores.
- Domínios autorizados: `localhost`, `queimando-gordura-783e4.firebaseapp.com`, `queimando-gordura-783e4.web.app`. Use `http://localhost:4200` no navegador; não pressupor autorização de `127.0.0.1` para OAuth.

## Executar localmente

Na raiz, após `npm ci`:

```sh
npm run dev:cloud
```

Angular: <http://localhost:4200>. API: <http://localhost:3100/api/v1/health>. O proxy `/api` mantém o contrato existente; apenas Nest acessa Firestore. Ctrl+C encerra os processos do comando. Não executar sobre portas ocupadas por outra sessão.

O Angular usa `--configuration cloud-development`, que substitui o ambiente por `frontend/src/environments/environment.cloud-development.ts`. Esse arquivo contém somente identificadores públicos oficiais; não carrega Analytics ou credenciais administrativas. O ambiente padrão continua desativado, `emulator` continua em projeto demo e o build padrão de produção usa `environment.production.ts`, com Firebase desativado até a configuração de um projeto de produção separado.

O backend carrega `backend/.env.cloud.local` somente nos comandos Cloud explícitos. Esse arquivo é ignorado pelo Git. Modelo:

```dotenv
NODE_ENV=development
PORT=3100
CORS_ORIGINS=http://localhost:4200
FIREBASE_MODE=production
FIREBASE_PROJECT_ID=queimando-gordura-783e4
FIREBASE_USE_ADC=true
GOOGLE_APPLICATION_CREDENTIALS=C:/caminho/externo/adc.json
FIREBASE_WEB_API_KEY=<apiKey pública do app Web DEV>
FIREBASE_ALLOW_CLOUD_TEST=true
```

O nome legado `FIREBASE_MODE=production` seleciona os serviços Cloud do SDK; `NODE_ENV=development` e o projeto explícito identificam este ambiente DEV. Não é uma declaração de implantação em produção. Não definir hosts de emuladores nesse modo.

ADC é a preferência. Nesta máquina, foi reaproveitada a autorização OAuth já concedida à CLI Firebase, em formato ADC `authorized_user`, armazenada em `%LOCALAPPDATA%/QueimandoGordura/development-adc.json`, com permissão restrita ao usuário Windows. Não foi criada chave de conta de serviço nem alterada configuração global do Windows. Revogar/expirar essa autorização requer nova autenticação local. Outras máquinas precisam de suas próprias ADC; não copiar credenciais entre desenvolvedores. O SDK suporta resolução ADC padrão ou arquivo externo por `GOOGLE_APPLICATION_CREDENTIALS` quando `FIREBASE_USE_ADC=true`.

Configuração válida apenas inicializa o SDK; não comprova conexão. Credenciais ausentes/inválidas não produzem login falso. O modo desativado retorna 503 nos endpoints protegidos. O health confirma somente o processo HTTP.

## Testes controlados

```sh
npm run test:cloud
npm run test:cloud:browser
```

Executar sequencialmente, após `npm run build`, com portas livres. O navegador usa 4202 durante o teste e encerra seus servidores. A lista explícita contém somente `queimando-gordura-783e4`; é aplicada antes de criar recursos, tanto no runner quanto nas suítes. Testes recusam produção, emuladores, falta de autorização e outros projetos, mesmo que tenham nomes de desenvolvimento. Configuração ausente falha o comando, sem saída de sucesso fictícia.

O teste de API usa cadastro Firebase cliente e ID Tokens reais, `PUT /api/v1/users/me`, persistência Cloud, bloqueio 403 antes da verificação, link oficial de ação e renovação do token, GET do próprio perfil, 401, 404, rejeição de UID injetado e isolamento entre duas contas. Leituras diretas anônimas/autenticadas e escrita direta de cliente são rejeitadas pelo Firestore real. A confirmação aplica o código emitido por `generateEmailVerificationLink`, sem alterar administrativamente `emailVerified`.

Cada execução gera endereços aleatórios `@example.test`, senhas aleatórias e registra somente UIDs retornados pelo cadastro que ela realizou. Não modifica identidades preexistentes, não escreve documentos fixos de diagnóstico e não exclui coleções. A limpeza individual verifica ausência dos documentos e das identidades. Falhas de limpeza fazem o teste falhar. Traces/HAR ficam desativados para não armazenar tokens/senhas; screenshots ignoradas pelo Git são evidência visual local.

## Limitações

Entrega e reputação de e-mails em uma caixa postal real continuam pendentes: aplicar um código oficial não comprova recebimento de mensagem. Google está habilitado, mas login com conta pessoal requer interação autorizada do proprietário. Não foi automatizada uma conta Google pessoal. Não há validação ou deploy de produção. Firebase Emulator Suite continua sendo regressão separada de IAM, OAuth, quotas e entrega Cloud.

Referências oficiais: [Firebase MCP](https://firebase.google.com/docs/ai-assistance/mcp-server), [Admin e ADC](https://firebase.google.com/docs/admin/setup), [links de ação](https://firebase.google.com/docs/auth/admin/email-action-links), [API Auth](https://firebase.google.com/docs/reference/rest/auth).

Validação de navegador Cloud DEV aprovada no checkpoint 4: landing mobile, cadastro real, PUT e persistência, restrição pré-confirmação, código oficial de confirmação com renovação do token, painel, sessão após reload, Minha Conta, logout/login e solicitação de recuperação de senha aceita pela API Firebase. A geração de um segundo link logo após o envio do cadastro pode retornar TOO_MANY_ATTEMPTS_TRY_LATER; a automação respeita espera limitada de até quatro intervalos de 20s, sem alterar configurações do provedor ou fingir verificação.
