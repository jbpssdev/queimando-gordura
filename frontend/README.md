> Checkpoint 2: execução integrada e emuladores sem credenciais estão no [README principal](../README.md). Use npm run dev:emulator; evite alterar ambientes versionados apenas para testar localmente.

# Frontend — Queimando Gordura 1.0

Aplicação cliente do **Queimando Gordura 1.0**, desenvolvida com **Angular 22 standalone**, **Tailwind CSS 4**, **Spartan UI (Helm/Brain)** e **Firebase Authentication SDK**.

---

## 1. Rotas Implementadas

| Rota                    | Descrição                                       | Proteção (Guard)                        |
| :---------------------- | :---------------------------------------------- | :-------------------------------------- |
| `/`                     | Landing page pública do produto                 | Livre                                   |
| `/entrar`               | Login com e-mail/senha ou Google                | `guestGuard` (redireciona autenticados) |
| `/cadastrar`            | Criação de conta com declaração 18+             | `guestGuard`                            |
| `/recuperar-senha`      | Redefinição de senha segura                     | `guestGuard`                            |
| `/verificar-email`      | Confirmação de e-mail obrigatória               | `verifyEmailGuard`                      |
| `/completar-perfil`     | Preenchimento de perfil pendente (Google/retry) | `completeProfileGuard`                  |
| `/painel`               | Dashboard principal autenticado                 | `authGuard`                             |
| `/avaliacao`            | Área de avaliação física/corporal               | `authGuard`                             |
| `/adaptacao`            | Área do Programa Adaptação (30 dias)            | `authGuard`                             |
| `/verificacao-ambiente` | Verificação técnica de saúde da API             | Livre                                   |

---

## 2. Estrutura de Componentes e Arquitetura

O frontend adota **componentes standalone**, **Signals do Angular** para estado reativo local e os componentes oficiais do **Spartan UI**:

```
frontend/src/app/
├── core/
│   ├── firebase.config.ts          # Configuração pública tipada (disabled / emulator / production)
│   ├── health.service.ts           # Verificação da API local
│   └── auth/
│       ├── auth-error.util.ts      # Mapeamento amigável de erros do Firebase e da API
│       ├── auth-session.service.ts # Gerenciador de sessão reativo (Signals do Angular)
│       ├── auth.interceptor.ts     # Interceptor HTTP anexando Bearer token na API local
│       ├── firebase-auth.service.ts# Wrapper do Firebase SDK (comportamento resiliente)
│       ├── user-profile-api.service.ts # Integração com /api/v1/users/me
│       ├── user-profile.model.ts   # Modelos UserProfile e CreateOrUpdateUserProfileDto
│       └── guards/
│           ├── auth.guard.ts             # Protege páginas autenticadas
│           ├── guest.guard.ts            # Protege páginas públicas contra usuários já logados
│           ├── verify-email.guard.ts     # Assegura redirecionamento para e-mails não confirmados
│           └── complete-profile.guard.ts # Garante fluxo de perfil pendente
├── features/
│   ├── landing/                    # Página inicial oficial
│   ├── auth/                       # Telas de entrada, cadastro e recuperação
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── complete-profile/
│   ├── dashboard/                  # Telas autenticadas do usuário
│   │   ├── dashboard/
│   │   ├── assessment/
│   │   └── adaptation/
│   └── foundation/                 # Diagnóstico de ambiente e API
└── shared/
    └── ui/                         # Componentes Spartan UI oficiais
        ├── alert/                  # hlmAlert
        ├── button/                 # hlmBtn
        ├── card/                   # hlmCard
        ├── input/                  # hlmInput
        ├── label/                  # hlmLabel
        ├── separator/              # hlmSeparator
        └── utils/                  # hlm/classes
```

---

## 3. Fluxos de Autenticação

### 3.1. Cadastro e Resiliência a Falhas Parciais

1. O usuário preenche Nome, Sobrenome, E-mail, Senha, Confirmação e a autodeclaração obrigatória de 18 anos ou mais.
2. A conta é criada via Firebase Authentication SDK (`createUserWithEmailAndPassword`).
3. O `displayName` é atualizado no Firebase.
4. O perfil é registrado na API NestJS via `PUT /api/v1/users/me`.
5. O e-mail de verificação é enviado via `sendEmailVerification()`.
6. O usuário é encaminhado para `/verificar-email`.

> **Tratamento de falha parcial:** Caso a conta Firebase seja criada, mas o endpoint NestJS falhe (ex.: API offline), a aplicação **não perde os dados digitados**, não tenta recriar o usuário no Firebase e exibe um alerta claro permitindo:
>
> - Tentar sincronizar o perfil novamente de imediato;
> - Continuar para a verificação de e-mail e completar o perfil posteriormente em `/completar-perfil`.

### 3.2. Login com E-mail e Senha

- Suporte a exibição/ocultação de senha.
- Caso o usuário possua e-mail não confirmado, o acesso às rotas privadas é barrado pelos guards e redirecionado para `/verificar-email`.
- Caso o usuário não tenha o perfil salvo na API, é encaminhado para `/completar-perfil`.
- Quando verificado e com perfil completo, é direcionado para `/painel` (ou URL prévia).

### 3.3. Login com Google

- Utiliza `GoogleAuthProvider` e `signInWithPopup` oficial do Firebase SDK.
- Trata bloqueios de pop-up ou cancelamento pelo usuário sem travamentos.
- Ao retornar, consulta `GET /api/v1/users/me`. Se o perfil ainda não existir (404), encaminha para `/completar-perfil`, pré-preenchendo nome a partir do Google e exigindo confirmação de 18 anos ou mais.

### 3.4. Confirmação de E-mail

- Rota: `/verificar-email`.
- Opção "Já confirmei meu e-mail" recarrega o estado real no Firebase (`user.reload()`) e valida `user.emailVerified`. Não assume confirmação sem checagem no SDK.
- Reenvio de e-mail com proteção de cooldown (30 segundos) para evitar solicitações duplicadas.
- Possibilidade de deslogar (`signOut`).

### 3.5. Recuperação de Senha

- Rota: `/recuperar-senha`.
- Envio via `sendPasswordResetEmail(auth, email)`.
- Mensagem neutra que não expõe publicamente se uma conta existe na base de dados.

---

## 4. Configuração Firebase Necessária

A aplicação utiliza configuração desacoplada por ambiente em `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    mode: 'disabled', // 'disabled' | 'emulator' | 'production'
    options: null, // FirebaseOptions quando ativo
    emulatorUrl: 'http://localhost:9099',
  } satisfies PublicFirebaseConfig,
};
```

### Comportamento em Modo `disabled`

Quando o Firebase não estiver configurado (padrão inicial do repositório):

- Todas as rotas públicas e formulários renderizam perfeitamente.
- Alertas claros informam que a autenticação está em modo de demonstração.
- Nenhum dado falso ou sessão fictícia é gerada.

### Conexão com Firebase Emulator Suite

Para desenvolvimento com Firebase Auth Emulator local:

1. Inicie o emulador (`npm run emulators`).
2. Defina `mode: 'emulator'` e informe `options: { apiKey: 'demo-key', projectId: 'demo-queimando-gordura' }`.
3. O frontend conectará automaticamente a `http://localhost:9099` (nunca em produção).

---

## 5. Contrato da API NestJS

O frontend se integra com o backend através do prefixo `/api/v1`:

### `PUT /api/v1/users/me`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>` (anexado automaticamente pelo `authInterceptor`)
- **Body:**
  ```json
  {
    "firstName": "Ana",
    "lastName": "Silva",
    "age18Confirmed": true
  }
  ```
- **Resposta (200/201):**
  ```json
  {
    "uid": "...",
    "firstName": "Ana",
    "lastName": "Silva",
    "email": "ana@example.com",
    "emailVerified": false,
    "age18Confirmed": true,
    "createdAt": "2026-10-16T12:00:00.000Z",
    "updatedAt": "2026-10-16T12:00:00.000Z"
  }
  ```

### `GET /api/v1/users/me`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: Objeto `UserProfile`.
  - `401`: Token ausente ou expirado.
  - `403`: E-mail não confirmado ou não autorizado.
  - `404`: Perfil ainda não cadastrado na base (redireciona para `/completar-perfil`).
  - `503`: Backend ou Firestore temporariamente indisponíveis.

---

## 6. Limitações Atuais

- **Cálculos corporais:** Fórmulas de IMC, taxas metabólicas basais e planos calóricos **não** foram introduzidos nesta etapa, mantendo a fidelidade arquitetural (regras de cálculo persistidas pertencem ao backend).
- **Programa Adaptação:** Exibe estado informativo e cards conceituais; os módulos de registro de refeições e pesagens serão liberados nos checkpoints seguintes.

---

## 7. Como Executar e Validar

A partir da raiz do monorepo:

```bash
# Executar o frontend em desenvolvimento (porta 4200)
npm run dev:frontend

# Executar testes unitários do frontend (Vitest)
npm run test --workspace frontend

# Executar verificação de tipos e linter
npm run lint --workspace frontend
npm run typecheck --workspace frontend

# Executar compilação de produção
npm run build --workspace frontend
```
