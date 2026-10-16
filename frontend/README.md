> Checkpoint 4: modos Cloud DEV e emuladores estão no [README principal](../README.md) e no [guia Cloud](../docs/firebase-cloud-dev.md). Use npm run dev:cloud para a nuvem DEV ou npm run dev:emulator sem credenciais.

# Frontend — Queimando Gordura 1.0

Aplicação cliente do **Queimando Gordura 1.0**, desenvolvida com **Angular 22 standalone**, **Tailwind CSS 4**, **Spartan UI (Helm/Brain)** e **Firebase Authentication SDK**.

---

## 1. Rotas Implementadas

| Rota                    | Descrição                                         | Proteção (Guard)                        |
| :---------------------- | :------------------------------------------------ | :-------------------------------------- |
| `/`                     | Landing page pública do produto                   | Livre                                   |
| `/entrar`               | Login com e-mail/senha ou Google                  | `guestGuard` (redireciona autenticados) |
| `/cadastrar`            | Criação de conta com declaração 18+               | `guestGuard`                            |
| `/recuperar-senha`      | Redefinição de senha segura                       | `guestGuard`                            |
| `/verificar-email`      | Confirmação de e-mail obrigatória                 | `verifyEmailGuard`                      |
| `/completar-perfil`     | Preenchimento de perfil pendente (Google/retry)   | `completeProfileGuard`                  |
| `/painel`               | Dashboard principal autenticado                   | `authGuard`                             |
| `/minha-conta`          | Dados reais da conta (`GET /api/v1/users/me`)     | `authGuard`                             |
| `/avaliacao`            | Questionário guiado de avaliação corporal/hábitos | `authGuard`                             |
| `/avaliacao/resultados` | Diagnóstico metabólico e resultados calculados    | `authGuard`                             |
| `/adaptacao`            | Área do Programa Adaptação (30 dias)              | `authGuard`                             |
| `/verificacao-ambiente` | Verificação técnica de saúde da API               | Livre                                   |

---

## 2. Estrutura de Componentes e Arquitetura

O frontend adota **componentes standalone**, **Signals do Angular** para estado reativo local e os componentes oficiais do **Spartan UI**:

```
frontend/src/app/
├── core/
│   ├── firebase.config.ts          # Configuração pública tipada (disabled / emulator / production)
│   ├── health.service.ts           # Verificação da API local
│   ├── assessment/                 # Módulo de Avaliação Inicial
│   │   ├── assessment.model.ts     # Modelos e DTOs de corpo, saúde, rotina e nutrição
│   │   ├── assessment-api.service.ts # Consumo de /api/v1/assessments/me
│   │   ├── assessment-state.service.ts # Gestor reativo de etapas e rascunho (Signals)
│   │   └── assessment-helpers.ts   # Cálculo de idade, decimais pt-BR e pendências inteligentes
│   ├── adaptation/                 # Módulo do Programa Adaptação (30 dias)
│   │   ├── adaptation.model.ts     # Interfaces de prévia, modalidades, plano e marcos
│   │   ├── adaptation-api.service.ts # Integração com /api/v1/adaptation/me
│   │   ├── adaptation-state.service.ts # Estado reativo da jornada e modalidades (Signals)
│   │   └── adaptation-helpers.ts   # Detecção IANA, formatação pt-BR e geração da timeline
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
│   │   ├── assessment/             # Avaliação Inicial e Resultados
│   │   │   ├── assessment.ts       # Container guiado com stepper e autosave
│   │   │   ├── assessment-results.ts # Página de resultados (/avaliacao/resultados)
│   │   │   └── components/
│   │   │       ├── assessment-stepper.ts
│   │   │       ├── assessment-pending.ts
│   │   │       ├── step-body.ts
│   │   │       ├── step-health.ts
│   │   │       ├── step-routine.ts
│   │   │       └── step-nutrition.ts
│   │   └── adaptation/             # Área do Programa Adaptação (/adaptacao)
│   │       ├── adaptation.ts       # Container dinâmico (carregamento/erro/prévia/jornada)
│   │       └── components/
│   │           ├── adaptation-preview.ts # Seleção de modalidade e confirmação de início
│   │           └── adaptation-journey.ts # Painel de progresso dos 30 dias e calendário temporal
│   ├── account/                    # Visualização de perfil real (/minha-conta)
│   │   ├── my-account.ts
│   │   └── my-account.spec.ts
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

- Provedor oficial `GoogleAuthProvider` via Firebase SDK.
- Fluxo principal via pop-up (`signInWithPopup`).
- **Resiliência a bloqueio de pop-up e dispositivos móveis:** Caso o navegador bloqueie o pop-up (`auth/popup-blocked`), a interface exibe feedback claro e disponibiliza opção para prosseguir via redirecionamento (`signInWithGoogleRedirect`).
- **Restauração de sessão pós-redirecionamento:** Ao carregar `/entrar`, o componente avalia `getRedirectResult()`, processando automaticamente credenciais retornadas de redirecionamentos Google.
- **Tratamento de domínios e erros comuns:** Mapeia `auth/unauthorized-domain`, cancelamentos de pop-up e conflitos de credenciais com orientações claras.
- Ao autenticar, consulta `GET /api/v1/users/me`. Se o perfil ainda não existir (404), encaminha para `/completar-perfil`, pré-preenchendo nome a partir do Google e exigindo confirmação de 18 anos ou mais.

### 3.4. Confirmação de E-mail

- Rota: `/verificar-email`.
- Opção "Já confirmei meu e-mail" recarrega o estado real no Firebase (`user.reload()`) e valida `user.emailVerified`. Não assume confirmação sem checagem no SDK.
- Reenvio de e-mail com proteção de cooldown (30 segundos) para evitar solicitações duplicadas.
- Possibilidade de deslogar (`signOut`).

### 3.5. Recuperação de Senha

- Rota: `/recuperar-senha`.
- Envio via `sendPasswordResetEmail(auth, email)`.
- Mensagem neutra que não expõe publicamente se uma conta existe na base de dados.

### 3.6. Minha Conta (`/minha-conta`)

- Rota protegida por `authGuard`.
- Apresenta os dados reais de cadastro consultados diretamente da API NestJS (`GET /api/v1/users/me`), através do estado reativo da sessão (`session.currentProfile()`):
  - Nome completo (Primeiro nome e Sobrenome);
  - E-mail e badge de status de confirmação;
  - Status da autodeclaração de 18 anos ou mais;
  - Data de criação da conta (formatada em português).
- **Privacidade e segurança:** UIDs internos, tokens e identificadores técnicos não são expostos na interface.
- Acesso à ação de encerramento seguro de sessão (logout) com limpeza de estado e redirecionamento para `/entrar`.

### 3.7. Avaliação Inicial do Usuário (`/avaliacao` e `/avaliacao/resultados`)

Implementação completa do fluxo de avaliação guiado em 5 etapas no Angular 22:

1. **Informações Corporais (`body`):**
   - Data de nascimento com validação real de idade mínima de 18 anos (`calculateAge()`).
   - Opção informada ou neutra para sexo biológico, com explicação respeitosa de sua aplicação na fórmula metabólica (Harris-Benedict / Mifflin).
   - Altura (cm) e peso atual (kg), com suporte a decimais no formato brasileiro (`82,5`).
   - Tipo de balança: comum ou bioimpedância (com campos condicionais opcionais: % gordura, massa muscular em kg, água % e gordura visceral).
   - Medidas opcionais complementares e peso desejado informado pelo usuário (sem imposição clínica de peso ideal).
2. **Condições de Saúde (`health`):**
   - Declaração de histórico com opções mutuamente exclusivas ("Nenhuma condição conhecida", "Não sei informar", "Condições selecionadas").
   - Categorias clínicas estruturadas (cardiovascular, glicemia, respiratória, renal, hepática, etc.).
   - Medicamentos de uso contínuo (opcional).
   - Sintomas de alerta: detecção imediata de sintomas urgentes (dor no peito, desmaios) com banner recomendando avaliação médica presencial.
   - Gestação e amamentação.
3. **Rotina e Atividade Física (`routine`):**
   - Rotina profissional (sedentária a pesada) e horas sentado por dia.
   - Nível de movimentação no dia a dia.
   - Média de passos diários (manual, com recomendação de Google Fit / smartwatch).
   - Prática de musculação e aeróbicos/cardio com campos condicionais de frequência, duração e intensidade (leve, moderada, intensa).
   - Opção para iniciantes recentes sem rotina regular.
4. **Hábitos Alimentares (`nutrition`):**
   - Quantidade de refeições por dia e regularidade de horários.
   - Períodos prolongados em jejum e alimentação na madrugada.
   - Origem do preparo (casa, restaurante, delivery, combinação).
   - Balança culinária de precisão (esclarecendo que não é obrigatória).
   - Frequência de bebidas açucaradas e álcool.
   - Desafios no emagrecimento (ansiedade, falta de tempo, etc.).
   - Limitação no orçamento para compras de alimentos.
5. **Revisão e Pendências Inteligentes:**
   - Resumo das quatro seções anteriores com atalhos para edição rápida.
   - Painel de pendências categorizadas por prioridade:
     - **Essenciais:** impedem cálculos matemáticos ou metabólicos.
     - **Importantes:** contextualizam o perfil do usuário.
     - **Opcionais:** acompanhamento complementar ("Você poderá adicionar sua circunferência abdominal depois.").
   - Conclusão permitida mesmo com dados opcionais pendentes.
6. **Resultados da Avaliação (`/avaliacao/resultados`):**
   - Consumidos exclusivamente do backend NestJS.
   - Peso atual, idade calculada, IMC categorizado e contextualizado.
   - Taxa Metabólica Basal estimada (com aviso explícito de que não é a meta diária calórica).
   - Gasto Energético Total (GET) estimado em faixa.
   - Primeira referência de perda ponderal de 5% (sem prazo imposto).
   - Faixa de referência populacional IMC e peso desejado pelo usuário.
   - Orientações de segurança médica retornadas pela API.
   - Apresentação transparente do **Programa Adaptação (30 dias)** nas modalidades Padrão e Intensificada, informando que a criação do plano será liberada no próximo checkpoint.

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

### Validação: Emuladores Locais vs. Firebase Real (Cloud)

- **Firebase Emulator Suite (Totalmente Validado Localmente):**
  - Todos os testes de integração automatizados e testes end-to-end (`npm run test:integration`) executam sobre o Firebase Auth Emulator (porta 9099) e Firestore Emulator (porta 8080).
  - Fluxos validados com sucesso no emulador: cadastro com 18+, emissão e envio de token Bearer via interceptor, persistência na API NestJS (`PUT /api/v1/users/me`), verificação de e-mail com `oobCode` do emulador, login com e-mail/senha, bloqueio por guards, recuperação de falha 503 e carregamento de `/minha-conta`.
- **Firebase Cloud (Ambiente Remoto):**
  - Para conectar a um projeto Firebase em nuvem real, preencha os parâmetros públicos do Firebase (`apiKey`, `authDomain`, `projectId`, `appId`, etc.) no arquivo de ambiente desejado com `mode: 'production'`.
  - **Requisito para Google Sign-In Remoto:** O domínio onde o frontend é servido (seja `localhost` para testes ou domínio de produção) deve estar expressamente adicionado à lista de **Authorized Domains** no Firebase Console (_Authentication > Settings > Authorized domains_). Caso contrário, o Firebase rejeitará a autenticação com `auth/unauthorized-domain`, que é tratada pelo frontend com alerta explicativo.

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

### `GET /api/v1/assessments/me`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: Objeto `AssessmentDraftResponse` com o rascunho persistido.
  - `404`: Usuário ainda não iniciou avaliação (frontend inicializa rascunho em branco).
  - `503`: Backend indisponível (frontend apresenta alerta resiliente sem perder alterações em tela).

### `PATCH /api/v1/assessments/me`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Body:**
  ```json
  {
    "section": "body",
    "data": {
      "birthDate": "1992-05-10",
      "biologicalSex": "female",
      "heightCm": 168,
      "currentWeightKg": 68.5,
      "scaleType": "standard"
    }
  }
  ```
- **Seções suportadas:** `body`, `health`, `routine`, `nutrition`. Envia exclusivamente campos válidos da seção indicada.

### `POST /api/v1/assessments/me/evaluate`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: `AssessmentResultsResponse` com os cálculos oficiais validados pelo backend.
  - `400`: Pendência de dados essenciais para o cálculo.

### `GET /api/v1/assessments/me/results`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: `AssessmentResultsResponse` com a última avaliação vigente calculada.
  - `404`: Nenhuma avaliação calculada disponível.

### `GET /api/v1/adaptation/me/preview`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: `AdaptationPreviewResponse` contendo elegibilidade da avaliação (`hasAssessment`, `assessmentCompleted`), recomendação (`recommendedMode`) e status de cada modalidade (`standard` e `intensified`). Para modalidades bloqueadas, inclui `restrictionReason` retornado pela API (e.g. obesidade grau III ou histórico clínico).
  - `401`: Token ausente ou inválido.

### `GET /api/v1/adaptation/me`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Respostas:**
  - `200`: `AdaptationPlanResponse` contendo dados da jornada em andamento ou concluída: modalidade, fuso horário IANA, data de início/fim, dia atual (1 a 30), marcos e meta calórica oficial.
  - `404`: Usuário ainda não iniciou o Programa Adaptação (orienta redirecionamento para seleção de modalidade).

### `POST /api/v1/adaptation/me/start`

- **Cabeçalho:** `Authorization: Bearer <Firebase ID Token>`
- **Corpo:**
  ```json
  {
    "mode": "standard",
    "timeZone": "America/Sao_Paulo"
  }
  ```
- **Respostas:**
  - `201`: `AdaptationPlanResponse` com a criação oficial do plano de 30 dias consecutivos.
  - `400`: Modalidade indisponível para os critérios clínicos do usuário ou requisição inválida.
  - `409`: Plano já iniciado anteriormente (impede múltiplos inícios concorrentes).

---

## 6. Módulo do Programa Adaptação (30 Dias)

A página `/adaptacao` gerencia a jornada inicial de 30 dias consecutivos:

1. **Prévia e Elegibilidade:**
   - Antes de iniciar, consulta `GET /api/v1/adaptation/me/preview`.
   - Se a Avaliação Inicial não foi realizada ou concluída, orienta o usuário a preencher `/avaliacao`.
   - Exibe os cartões das modalidades **Padrão** (sustentável e gradual) e **Intensificada** (sujeita a critérios clínicos adicionais).
   - O botão de seleção é bloqueado para modalidades com `available: false`, exibindo o motivo real de restrição vindo do backend (e.g. Obesidade Grau III ou contraindicações clínicas).
2. **Início Explícito e Fuso Horário:**
   - O plano nunca se inicia automaticamente ao visitar a página.
   - Exige clique em "Iniciar meus 30 dias" e confirmação explícita em modal/diálogo explicativo.
   - O diálogo esclarece que os 30 dias são corridos, não pausam por ausência e ausência de dados não significa jejum ou inatividade.
   - Envia o fuso horário IANA detectado no navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
   - Proteção contra cliques múltiplos e requisições concorrentes.
3. **Jornada Visual e Calendário Temporal:**
   - Consulta `GET /api/v1/adaptation/me` após o início.
   - Apresenta: dia atual (ex: "Dia 1 de 30"), datas de início e término formatadas em pt-BR, e barra de progresso temporal.
   - Calendário visual dos 30 dias destacando dias passados, dia de "Hoje" e dias futuros, com marcadores nos dias de marco (Dia 7, 14, 21 e 30).
   - Mensagens orientativas e discretas de acordo com a fase da adaptação.
   - **Compromisso Ético e Clínico:** O transcurso dos dias reflete apenas a linha do tempo do calendário; **não há checkmarks de "dias concluídos com sucesso", pontuações artificiais de gamificação ou premiações por restrição alimentar**.
4. **Metas Calóricas:**
   - Exibe a meta calórica diária fornecida pela API quando disponível. Caso indisponível, apresenta mensagem informativa sem realizar cálculos locais de déficit ou gasto calórico no frontend.

---

## 7. Limitações Atuais e Próximos Passos

- **Cálculos corporais e metabólicos:** Fórmulas de IMC, taxas metabólicas basais (Harris-Benedict/Mifflin) e estimativas de gasto energético diário pertencem exclusivamente ao backend NestJS (`/api/v1/assessments/me/evaluate`). O frontend não realiza cálculos matemáticos paralelos que substituam a API oficial.
- **Registro diário de refeições e pesagens:** A jornada de adaptação exibe o acompanhamento temporal de 30 dias (Checkpoint 6A). O registro interativo de refeições, ingestão calórica diária e acompanhamento de peso serão implementados no Checkpoint 7.

---

## 8. Como Executar e Validar

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
