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
| `/adaptacao/progresso`  | Painel de evolução, gráficos de peso e conquistas | `authGuard`                             |
| `/adaptacao/conclusao`  | Encerramento dos 30 dias e download de relatório  | `authGuard`                             |
| `/diario`               | Diário de alimentação, água, exercícios e peso    | `authGuard`                             |
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
│   │   ├── adaptation.model.ts     # Interfaces de prévia, modalidades, plano, progresso e conquistas
│   │   ├── adaptation-contract.ts  # Contratos HTTP canônicos (Wire) da API NestJS
│   │   ├── adaptation-adapter.ts   # Adaptador de prévia, plano e progresso para a UI
│   │   ├── adaptation-api.service.ts # Integração com /api/v1/adaptation/me
│   │   ├── adaptation-state.service.ts # Estado reativo da jornada e modalidades (Signals)
│   │   ├── adaptation-helpers.ts   # Detecção IANA, formatação pt-BR e geração da timeline
│   │   └── adaptation-progress-helpers.ts # Cálculos de gráfico SVG, deltas neutros e download Blob
│   ├── diary/                      # Módulo do Diário da Adaptação
│   │   ├── diary.model.ts          # Tipos de alimentos, refeições, água, atividades e resumos
│   │   ├── diary-api.service.ts    # Integração com /api/v1/foods e /api/v1/diary/me
│   │   ├── diary-state.service.ts  # Estado reativo por data selecionada (Signals)
│   │   └── diary-helpers.ts        # Cálculo proporcional, totais e formatadores pt-BR
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
│   │   ├── adaptation/             # Área do Programa Adaptação (/adaptacao)
│   │   │   ├── adaptation.ts       # Container dinâmico (carregamento/erro/prévia/jornada)
│   │   │   ├── adaptation-progress.ts # Painel de evolução, gráficos e conquistas (/adaptacao/progresso)
│   │   │   ├── adaptation-completion.ts # Encerramento positivo e relatório (/adaptacao/conclusao)
│   │   │   └── components/
│   │   │       ├── adaptation-preview.ts # Seleção de modalidade e confirmação de início
│   │   │       └── adaptation-journey.ts # Painel de progresso dos 30 dias e calendário temporal
│   │   └── diary/                  # Área do Diário (/diario)
│   │       ├── diary.ts            # Container principal com navegador de data e abas
│   │       └── components/
│   │           ├── diary-meals.ts        # Refeições agrupadas por momento do dia
│   │           ├── meal-editor-dialog.ts # Montagem de refeições com catálogo e live preview
│   │           ├── custom-food-dialog.ts # Cadastro de alimentos personalizados privados
│   │           ├── diary-water.ts        # Ingestão de água com atalhos de recipiente
│   │           ├── diary-activities.ts   # Registro de exercícios e percepção de esforço
│   │           └── diary-weight.ts       # Pesagens conscientes em frequência semanal
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
   - Opção informada ou neutra para sexo biológico, com explicação respeitosa de sua aplicação na fórmula metabólica (Mifflin-St Jeor).
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

## Adaptação integrada — checkpoint 6C

`/adaptacao` consulta os três endpoints canônicos (`GET /api/v1/adaptation/me/preview`, `GET /api/v1/adaptation/me`, `POST /api/v1/adaptation/me/start`). O adaptador traduz o JSON do backend para modelos de apresentação: `calendar/localDate/temporalState` em calendário visual, `active` em `in_progress` e avisos/motivos em mensagens. A elegibilidade, datas, progresso e ausência de meta calórica são autoritativos no backend.

Início manual e confirmado, plano único com repetição idempotente 200, criação 201, erro 409 para revisão alterada ou parâmetros incompatíveis e 422 para modalidade bloqueada/avaliação incompleta. Exibe os 30 dias, marcos 7/14/21/30, dia atual, datas e progresso integrado aos resumos do Diário.

---

## 7. Módulo do Diário da Adaptação — Checkpoint 7C

A rota `/diario` está disponível para todo usuário autenticado com e-mail confirmado e idade elegível, mesmo quando não possuir adaptação ativa ou condições para plano de emagrecimento.

### 7.1. Funcionalidades e Pilares Éticos

1. **Refeições por Momentos do Dia:**
   - Agrupamento por momentos: Café da manhã, Almoço, Jantar, Lanches, Ceia e Outros.
   - Busca no catálogo oficial (`GET /api/v1/foods`) com debounce de 300 ms.
   - Suporte a porções em **gramas** (`g`) e **medidas caseiras** equivalentes cadastradas no catálogo.
   - Cálculo proporcional de prévia visual na interface; a consolidação oficial ocorre na resposta do backend (`POST /api/v1/diary/me/meals` e `PATCH /api/v1/diary/me/meals/:id`).
   - Dados nutricionais incompletos na fonte permanecem `null` e são exibidos como "Não informado" ou "Total parcial", nunca substituídos por zero.
2. **Alimentos Personalizados:**
   - Cadastro, edição e exclusão de alimentos privados (`POST /api/v1/foods/me`, `PATCH/DELETE /api/v1/foods/me/:id`), identificados com selo "Personalizado".
   - Alerta explícito de que a precisão nutricional depende dos dados fornecidos pelo próprio usuário.
3. **Hidratação / Água:**
   - Registro de água em ml (`POST /api/v1/diary/me/water`).
   - Atalhos de volume prático (150, 250, 500 ml) que representam recipientes cotidianos, e não metas automáticas de consumo.
   - Exclusão e correção de lançamentos (`DELETE /api/v1/diary/me/water/:id`).
4. **Atividades Físicas:**
   - Registro de exercícios reais (`POST /api/v1/diary/me/activities`): tipo (cardio, força, outra), descrição, duração em minutos e percepção de esforço.
   - Não estima queima calórica sem modelo validado e não subtrai exercícios do consumo diário de calorias.
5. **Pesagem Semanal Consciente:**
   - Registro de peso corporal em kg (`PUT /api/v1/diary/me/weight` com semântica idempotente).
   - Incentivo à pesagem em intervalos semanais (e não diários), explicando clinicamente as flutuações diárias naturais de retenção hídrica.
   - Ausência de pesagem não gera qualquer penalidade no aplicativo.
6. **Integração com o Calendário dos 30 Dias:**
   - A página `/adaptacao` consulta o resumo (`GET /api/v1/diary/me/summary?from=...&to=...`) e exibe indicadores discretos nos dias com hábitos registrados: 🍽️ Alimentação, 💧 Água, 🏃 Atividades, ⚖️ Peso.
   - Dias sem registros permanecem estritamente identificados como "Sem registros", sem julgamentos de sucesso ou fracasso.
   - Os marcos semanais (Dias 7, 14, 21 e 30) exibem lembretes de momento ideal para registro de peso.

### 7.2. Contratos HTTP do Diário e Catálogo

| Método   | Endpoint                                   | Descrição                                             |
| :------- | :----------------------------------------- | :---------------------------------------------------- |
| `GET`    | `/api/v1/foods?query=...&limit=...`        | Busca de alimentos oficiais e personalizados.         |
| `GET`    | `/api/v1/foods/:id`                        | Detalhes de alimento e medidas caseiras equivalentes. |
| `POST`   | `/api/v1/foods/me`                         | Cadastro de alimento personalizado privado.           |
| `GET`    | `/api/v1/diary/me?date=YYYY-MM-DD`         | Consulta dados completos de um dia.                   |
| `GET`    | `/api/v1/diary/me/summary?from=...&to=...` | Consulta resumos de hábitos para intervalos de datas. |
| `POST`   | `/api/v1/diary/me/meals`                   | Registro de refeição combinando múltiplos alimentos.  |
| `PATCH`  | `/api/v1/diary/me/meals/:id`               | Edição de refeição com controle de versão.            |
| `DELETE` | `/api/v1/diary/me/meals/:id`               | Exclusão de refeição com confirmação.                 |
| `POST`   | `/api/v1/diary/me/water`                   | Registro de consumo de água em ml.                    |
| `DELETE` | `/api/v1/diary/me/water/:id`               | Exclusão de lançamento de água.                       |
| `POST`   | `/api/v1/diary/me/activities`              | Registro de atividade física realizada.               |
| `PATCH`  | `/api/v1/diary/me/activities/:id`          | Atualização de atividade física.                      |
| `DELETE` | `/api/v1/diary/me/activities/:id`          | Exclusão de atividade física.                         |
| `PUT`    | `/api/v1/diary/me/weight`                  | Registro ou atualização idempotente de peso da data.  |
| `DELETE` | `/api/v1/diary/me/weight?date=YYYY-MM-DD`  | Remoção de pesagem da data.                           |

## 8. Progresso, Conquistas, Conclusão e Relatório PDF — Checkpoint 8A

O Checkpoint 8A conclui a jornada visual e funcional da Adaptação de 30 dias através de dados reais fornecidos pelo backend NestJS.

### 8.1. Painel de Evolução (`/adaptacao/progresso`)

- **Evolução do Peso Corporal em SVG Responsivo:**
  - Plota exclusivamente pesagens reais registradas pelo usuário na Avaliação Inicial (`source: 'assessment'`) e no Diário (`source: 'diary'`), diferenciadas visualmente por marcadores e cores.
  - Preserva lacunas temporais reais sem interpolar medições falsas.
  - Trata o caso de 0 pesagens com estado vazio acolhedor e atalho para o Diário.
  - Trata o caso de 1 única pesagem com marcador isolado e aviso explícito de que ainda não há tendência calculável.
  - Oferece tabela acessível opcional para leitores de tela e visualização tabular.
  - Variação do peso expressa em texto neutro e descritivo (`formatWeightDelta`), sem julgamento moral de sucesso ou fracasso.
- **Frequência de Hábitos e Indicadores:**
  - Contabiliza dias com refeições, hidratação, atividades físicas e pesagens.
  - Não exibe gráfico de calorias queimadas por exercício e não compara com metas calóricas inexistentes.
  - Reavaliação corporal exibe IMC e estimativas metabólicas apenas quando calculados e enviados pela API.
- **5 Períodos Semanais:**
  - Dias 1–7 (Semana 1), Dias 8–14 (Semana 2), Dias 15–21 (Semana 3), Dias 22–28 (Semana 4) e Dias 29–30 (Fechamento).
  - Preserva os marcos temporais nos dias 7, 14, 21 e 30.
  - Distingue dias transcorridos, dias com hábitos anotados e dias futuros.
- **Gamificação Leve por Consistência:**
  - Conquistas atribuídas pelo backend (`GET /api/v1/adaptation/me/progress`).
  - Apresentação acolhedora de marcos alcançados e marcos futuros com barra de progresso.
  - Sem mensagens punitivas, perda de pontos, streaks negativos ou contadores de falhas.
  - Jamais recompensa restrição calórica extrema, pular refeições ou pesagens obsessivas diárias.

### 8.2. Encerramento da Adaptação (`/adaptacao/conclusao`)

- Acessível quando a API indicar ciclo finalizado (`planStatus: 'completed'`). Caso acessada durante o ciclo, orienta amigavelmente o usuário sobre o dia atual e disponibiliza links de retorno.
- Celebração positiva e acolhedora pelo encerramento dos 30 dias de rotina.
- Resumo consolidado de hábitos, pesagens e conquistas alcançadas.
- Próximos passos orientam que o usuário pode continuar utilizando livremente o Diário de Hábitos.
- Não cria segundo ciclo automático nem inicia precocemente o futuro módulo Foco Total.

### 8.3. Relatório em PDF Oficial (`report.pdf`)

- Botão `Baixar relatório dos 30 dias (PDF)` consome `GET /api/v1/adaptation/me/report.pdf`.
- Checkbox opcional: "Incluir condições de saúde e medicamentos que informei na avaliação", iniciando desmarcada (`includeHealthDetails=false`).
- Resposta tratada estritamente como `Blob` binário e transferida diretamente via URL de objeto temporária (`relatorio-adaptacao-30-dias.pdf`).
- **Segurança e Privacidade:** O documento PDF jamais é salvo em `localStorage`, cookies ou enviado a serviços externos.

---

## 9. Como Executar e Validar

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

Contrato HTTP canônico, adaptador, paginação e fontes: [Diário integrado](../docs/diary.md). O backend retorna snapshots e totais autoritativos; edição/exclusão e trocas de data não fabricam consumo zero.

