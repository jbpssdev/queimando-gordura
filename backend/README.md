# Backend — Queimando Gordura 1.0

Serviço REST desenvolvido em NestJS 12 e TypeScript para a plataforma Queimando Gordura 1.0, integrado com Firebase Admin SDK (Authentication e Cloud Firestore).

---

## 1. Arquitetura de Ambientes e Isolamento

O sistema opera sob três ambientes estritamente delimitados para evitar contaminação de dados ou vazamento de segredos:

| Ambiente | Modo (`FIREBASE_MODE`) | Identificador do Projeto | Mecanismo de Autenticação | Finalidade |
|---|---|---|---|---|
| **Local com Emuladores** | `emulator` | `demo-queimando-gordura` | Emuladores locais (`127.0.0.1:9099`, `127.0.0.1:8080`) | Desenvolvimento diário e testes automatizados sem rede e sem credenciais reais. |
| **Firebase Cloud de Desenvolvimento** | `production` | Ex.: `queimando-gordura-dev` | Application Default Credentials (ADC) ou JSON externo | Validação controlada em infraestrutura real de nuvem antes do lançamento. |
| **Produção Futura** | `production` | Ex.: `queimando-gordura-prod` | Credenciais administrativas de produção isoladas | Usuários e dados reais; sem testes destrutivos. |

> [!IMPORTANT]
> A configuração do backend remove automaticamente variáveis de emulador (`FIREBASE_AUTH_EMULATOR_HOST` e `FIRESTORE_EMULATOR_HOST`) quando operando em modo Cloud/Produção, prevenindo desvios de tráfego acidentais. Em projetos de nuvem, projetos iniciados com `demo-` são bloqueados na inicialização.

---

## 2. Arquitetura de Autenticação e Segurança

1. **Identificação**: O cliente Angular autentica-se com o Firebase Authentication e envia o token de identificação no cabeçalho:
   ```http
   Authorization: Bearer <firebase-id-token>
   ```
2. **Validação Estrita**: O `FirebaseAuthGuard` valida a assinatura criptográfica, expiração, emissor e projeto do token usando o Firebase Admin SDK (`auth.verifyIdToken`).
3. **Identidade Confiável**: O `uid` confiável e o `email` são extraídos exclusivamente do token validado e injetados em `request.user`. O backend rejeita e ignora qualquer tentativa de fornecer `uid` ou `email` via body, query string ou rotas alternativas.
4. **Verificação de E-mail**:
   - `PUT /api/v1/users/me`: Permite acesso com token válido mesmo antes da confirmação do e-mail, viabilizando o onboarding e salvamento de nome/sobrenome logo após o cadastro inicial.
   - `GET /api/v1/users/me` e rotas privadas: Exigem e-mail confirmado (`VerifiedEmailGuard`). Se o token portar claim desatualizada (`email_verified: false`), o guard consulta pontualmente o estado atualizado no Firebase Admin SDK antes de emitir resposta 403.
5. **Persistência Exclusiva**: Operações no Firestore são executadas exclusivamente pelo backend com o Firebase Admin SDK. O acesso direto do cliente ao Firestore é totalmente negado por regras (`firebase/firestore.rules`).

---

## 3. Endpoints da API

Prefixo global: `/api/v1`

### `GET /api/v1/health`
- **Acesso**: Público.
- **Descrição**: Confirma a integridade do processo HTTP. Permanece ativo e respondendo `200 OK` mesmo quando o Firebase estiver desativado (`FIREBASE_MODE=disabled`).
- **Resposta (200 OK)**:
  ```json
  {
    "status": "ok"
  }
  ```

### `PUT /api/v1/users/me`
- **Acesso**: Privado (requer Firebase ID Token válido).
- **Descrição**: Cria ou atualiza o perfil do usuário autenticado de forma atômica e idempotente.
- **Cabeçalho**: `Authorization: Bearer <firebase-id-token>`
- **Corpo da requisição**:
  ```json
  {
    "firstName": "Ana",
    "lastName": "Silva",
    "age18Confirmed": true
  }
  ```
- **Campos do DTO (`UpsertUserProfileDto`)**:
  - `firstName` (*string*, obrigatório, 1-100 caracteres, sanitizado com trim).
  - `lastName` (*string*, obrigatório, 1-100 caracteres, sanitizado com trim).
  - `age18Confirmed` (*boolean*, obrigatoriamente `true`).
  - *Campos proibidos (ex.: `uid`, `email`, `role`, dados de saúde) são estritamente rejeitados com `400 Bad Request` pelo `ValidationPipe`.*
- **Resposta (200 OK)**:
  ```json
  {
    "uid": "abc123firebaseUid",
    "firstName": "Ana",
    "lastName": "Silva",
    "email": "ana@example.com",
    "emailVerified": false,
    "age18Confirmed": true,
    "createdAt": "2026-10-16T03:00:00.000Z",
    "updatedAt": "2026-10-16T03:00:00.000Z"
  }
  ```
- **Idempotência**: Requisições repetidas preservam o `createdAt` original, atualizam `updatedAt` e mesclam dados via transação sem sobrescrever campos futuros.

### `GET /api/v1/users/me`
- **Acesso**: Privado (requer Firebase ID Token válido E e-mail verificado).
- **Descrição**: Retorna o perfil do próprio usuário autenticado.
- **Cabeçalho**: `Authorization: Bearer <firebase-id-token>`
- **Respostas**:
  - `200 OK`: Perfil encontrado.
  - `401 Unauthorized`: Token ausente, inválido ou expirado.
  - `403 Forbidden`: E-mail não confirmado.
  - `404 Not Found`: Perfil ainda não cadastrado.
  - `503 Service Unavailable`: Firebase desativado ou indisponível.

---

## 4. Estrutura do Cloud Firestore

- **Coleção**: `users/{uid}`
- **Campos persistidos**:
  - `uid` (*string*): Identificador canônico do Firebase Auth.
  - `firstName` (*string*): Primeiro nome.
  - `lastName` (*string*): Sobrenome.
  - `email` (*string*): E-mail confiável obtido do Firebase.
  - `age18Confirmed` (*boolean*): Declaração de maioridade (sempre `true`).
  - `createdAt` (*string ISO 8601 UTC*): Data de criação inicial.
  - `updatedAt` (*string ISO 8601 UTC*): Data da última atualização.
- **Minimização**: A flag `emailVerified` é obtida em tempo real do Firebase Auth e não armazenada redundantemente no Firestore. Nenhum dado clínico, metabólico ou corporal é manipulado nesta fase.

---

## 5. Variáveis de Ambiente

Arquivo: `.env` (ou variáveis de processo):

| Variável | Valores permitidos | Descrição |
|---|---|---|
| `NODE_ENV` | `development`, `test`, `production` | Ambiente de execução. |
| `PORT` | Número inteiro (padrão: `3100`) | Porta HTTP local do servidor. |
| `CORS_ORIGINS` | URLs separadas por vírgula | Origens permitidas (ex: `http://localhost:4200`). Produção exige HTTPS. |
| `FIREBASE_MODE` | `disabled`, `emulator`, `production` | Modo de integração Firebase. |
| `FIREBASE_PROJECT_ID` | String (`demo-*` para emulador, ID real para nuvem) | Identificador do projeto Firebase. |
| `FIREBASE_USE_ADC` | `true`, `false` | Habilita Application Default Credentials (recomendado para nuvem). |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | Host do Auth Emulator (apenas em modo `emulator`). |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | Host do Firestore Emulator (apenas em modo `emulator`). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho absoluto externo | Arquivo de credenciais de serviço fora do repositório. |
| `FIREBASE_ALLOW_CLOUD_TEST` | `true`, `false` | Trava de segurança para autorizar testes controlados em projeto Cloud. |

---

## 6. Comandos e Testes

### Execução em desenvolvimento local
```bash
npm run start:dev --workspace backend
```

### Testes unitários (rápidos e isolados)
```bash
npm run test --workspace backend
```

### Testes de ponta a ponta (E2E)
Valida contratos HTTP, validação de DTOs, erros sanitizados e isolamento entre usuários A e B:
```bash
npm run test:e2e --workspace backend
```

### Testes integrados com Firebase Emulator Suite
Inicia automaticamente os emuladores (Auth e Firestore) via runtime portátil Java e valida o ciclo de vida real:
```bash
npm run test:emulator --workspace backend
```

### Testes controlados com Firebase Cloud (Desenvolvimento)
Valida a conexão administrativa e o isolamento em projeto Cloud real quando autorizado pelo proprietário:
```bash
npm run test:cloud --workspace backend
```

### Verificação de Tipos e Lint
```bash
npm run typecheck --workspace backend
npm run lint --workspace backend
```

---

## 7. Guia de Configuração no Firebase Console (Para o Proprietário)

Quando criar o projeto Firebase de desenvolvimento no [Console do Firebase](https://console.firebase.google.com/):

1. **Criar Projeto**:
   - Crie um projeto específico para desenvolvimento (ex.: `queimando-gordura-dev`). Nunca utilize o nome de produção.
2. **Ativar Authentication**:
   - Em **Build > Authentication**, ative os provedores:
     - **E-mail/Senha** (com verificação de e-mail habilitada).
     - **Google** (para login federado).
   - Em **Authorized domains**, mantenha `localhost` e `127.0.0.1`.
3. **Criar Banco Cloud Firestore**:
   - Em **Build > Firestore Database**, crie a base no modo de produção.
   - Aplique as regras de segurança restritivas executando:
     ```bash
     node firebase/deploy-rules-dev.mjs --project <id-projeto-dev>
     ```
4. **Configuração de Credenciais Administrativas**:
   - **Opção A (Recomendada - ADC)**: Se utilizar a ferramenta oficial `gcloud`:
     ```bash
     gcloud auth application-default login
     ```
     Basta configurar `FIREBASE_USE_ADC=true` e `FIREBASE_PROJECT_ID=<id-projeto-dev>`. Nenhuma chave precisa ser baixada.
   - **Opção B (Chave de Serviço Externa)**:
     - Em **Configurações do Projeto > Contas de Serviço**, gere uma nova chave privada.
     - Salve o arquivo JSON em uma pasta externa e segura (ex.: `C:/secrets/queimando-gordura-dev-sa.json`).
     - **NUNCA** copie o arquivo JSON para o repositório git ou compartilhe seu conteúdo em chats.
     - Configure `GOOGLE_APPLICATION_CREDENTIALS` com o caminho absoluto externo no `.env`.

---

## 8. Privacidade e Adequação à LGPD

- **Minimização**: Coletam-se exclusivamente nome, sobrenome e e-mail indispensáveis ao acesso.
- **Maioridade Autodeclarada**: A confirmação de maioridade (`age18Confirmed: true`) é autodeclaratória e não substitui verificação documental jurídica formal.
- **Isolamento de Domínio**: Nenhum dado clínico, metabólico ou corporal é misturado ao cadastro do usuário. Futuros módulos (avaliação, peso, dietas) terão regras independentes.
- **Preparação para Ciclo de Vida**: A arquitetura centrada em `users/{uid}` facilita a futura implementação dos fluxos de exclusão de conta (Art. 18, VI da LGPD) e exportação de dados (Art. 18, V da LGPD).
