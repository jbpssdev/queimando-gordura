# Backend — Queimando Gordura 1.0

Serviço REST desenvolvido em NestJS 12 e TypeScript para a plataforma Queimando Gordura 1.0, integrado com Firebase Admin SDK (Authentication e Cloud Firestore).

---

## 1. Arquitetura de Autenticação e Segurança

O backend utiliza uma arquitetura baseada em identidade verificada via Firebase:

1. **Identificação**: O cliente Angular autentica-se com o Firebase Authentication e envia o token de identificação no cabeçalho:
   ```http
   Authorization: Bearer <firebase-id-token>
   ```
2. **Validação**: O `FirebaseAuthGuard` valida a assinatura, expiração, emissor e projeto do token usando o Firebase Admin SDK (`auth.verifyIdToken`).
3. **Extração da Identidade**: O `uid` confiável e o `email` são extraídos exclusivamente do token verificado e injetados em `request.user`. O backend nunca confia em UIDs ou e-mails enviados no corpo ou na query string da requisição.
4. **Verificação de E-mail**:
   - `PUT /api/v1/users/me`: Permite acesso com token válido mesmo antes da confirmação do e-mail, possibilitando que o usuário crie/atualize seu perfil básico logo após o cadastro inicial.
   - `GET /api/v1/users/me` e rotas privadas de acompanhamento: Exigem e-mail confirmado (`VerifiedEmailGuard`). Se a claim do token ainda não refletir a verificação (token emitido antes de o link ser clicado), o guard consulta pontualmente o estado atualizado no Firebase Admin SDK antes de autorizar.
5. **Persistência**: Operações no Firestore são executadas exclusivamente pelo backend com o Firebase Admin SDK. O acesso direto do cliente ao Firestore é totalmente negado por regras (`firestore.rules`).

---

## 2. Endpoints da API

Prefixo global: `/api/v1`

### `GET /api/v1/health`
- **Acesso**: Público.
- **Descrição**: Confirma a integridade do servidor HTTP. Permanece em funcionamento mesmo quando o Firebase estiver desativado.
- **Resposta (200 OK)**:
  ```json
  {
    "status": "ok"
  }
  ```

### `PUT /api/v1/users/me`
- **Acesso**: Privado (requer Firebase ID Token válido).
- **Descrição**: Cria ou atualiza o perfil do usuário autenticado de forma idempotente.
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
  - *Campos desconhecidos (ex.: `uid`, `email`, `role`, dados de saúde) são estritamente rejeitados (400 Bad Request).*
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
- **Idempotência**: Requisições repetidas preservam o `createdAt` original, atualizam `updatedAt` e mesclam dados sem excluir campos futuros.

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

## 3. Estrutura do Cloud Firestore

- **Coleção**: `users/{uid}`
- **Campos persistidos**:
  - `uid` (*string*): Identificador canônico do Firebase Auth.
  - `firstName` (*string*): Primeiro nome.
  - `lastName` (*string*): Sobrenome.
  - `email` (*string*): E-mail confiável obtido do Firebase.
  - `age18Confirmed` (*boolean*): Declaração de maioridade (sempre `true`).
  - `createdAt` (*string ISO 8601 UTC*): Data de criação inicial.
  - `updatedAt` (*string ISO 8601 UTC*): Data da última atualização.
- **Minimização**: A flag `emailVerified` não é persistida no Firestore (é obtida em tempo real do Firebase Auth). Nenhum dado clínico, metabólico ou corporal é armazenado nesta etapa.

---

## 4. Variáveis de Ambiente

Arquivo: `.env` (ou variáveis de processo):

| Variável | Valores permitidos | Descrição |
|---|---|---|
| `NODE_ENV` | `development`, `test`, `production` | Ambiente de execução. |
| `PORT` | Número inteiro (padrão: `3100`) | Porta HTTP local do servidor. |
| `CORS_ORIGINS` | URLs separadas por vírgula | Origens permitidas (ex: `http://localhost:4200`). Produção exige HTTPS. |
| `FIREBASE_MODE` | `disabled`, `emulator`, `production` | Modo de integração Firebase. |
| `FIREBASE_PROJECT_ID` | String (`demo-*` para emulador) | Identificador do projeto Firebase. |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | Host do Auth Emulator (apenas em modo `emulator`). |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | Host do Firestore Emulator (apenas em modo `emulator`). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho absoluto de arquivo JSON | Credencial de serviço (apenas em modo `production`). |

---

## 5. Execução e Testes

### Execução em desenvolvimento
```bash
# Modo padrão (com dev server NestJS)
npm run start:dev --workspace backend
```

### Testes unitários
Executa testes rápidos isolados com mocks do Firebase:
```bash
npm run test --workspace backend
```

### Testes de ponta a ponta (E2E)
Executa suites de validação de endpoints HTTP e controle de acesso:
```bash
npm run test:e2e --workspace backend
```

### Testes integrados com Firebase Emulator Suite
Inicia automaticamente os emuladores locais (Auth e Firestore) usando a JRE portátil do projeto e valida fluxos reais:
```bash
npm run test:emulator --workspace backend
```

### Typecheck e Lint
```bash
npm run typecheck --workspace backend
npm run lint --workspace backend
```

---

## 6. Limitações e Notas de Segurança

1. **Autenticação em Produção**: O ambiente atual foi validado com testes unitários, testes HTTP e integração real com o Firebase Emulator Suite. A entrada em produção dependerá da criação de um projeto Firebase real e do provisionamento das credenciais administrativas (`GOOGLE_APPLICATION_CREDENTIALS`).
2. **Maioridade Autodeclarada**: A confirmação de maioridade (`age18Confirmed: true`) é autodeclaratória do usuário nesta etapa, não constituindo verificação documental jurídica.
3. **Módulos Futuros**: Não foram criados endpoints de métricas de calorias, avaliação corporal ou dietas nesta etapa, respeitando estritamente o isolamento de escopo.
