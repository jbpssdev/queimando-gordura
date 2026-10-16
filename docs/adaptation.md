# Adaptação — integração do checkpoint 6C

Entregas `cc505ee` (frontend) e `fbbdc94` (backend), base `6848206`. Página `/adaptacao`, acessível pelo painel e pelos resultados da Avaliação Inicial. Esta entrega organiza um período de 30 dias; não prescreve dieta, exercícios ou déficit calórico.

## Jornada e modalidades

1. Autenticar e confirmar e-mail; completar perfil básico e Avaliação Inicial.
2. Consultar a prévia da API, com recomendação organizacional, motivos e avisos.
3. Selecionar Padrão e confirmar manualmente o início. Visitar a página não cria plano.
4. Recuperar o mesmo plano após reload e acompanhar o calendário de 30 dias consecutivos.

Elegibilidade é decidida exclusivamente no backend:

| Contexto declarado                                          | Padrão                                                      | Intensificada |
| ----------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| Sem alertas específicos declarados                          | Disponível como organização de rotina, sem liberação médica | Indisponível  |
| IMC >= 40 isolado                                           | Disponível, com orientação multidisciplinar necessária      | Indisponível  |
| Qualquer condição adicional declarada ou medicação contínua | Bloqueada; orientação profissional prévia                   | Indisponível  |
| Saúde desconhecida, gestação ou lactação                    | Bloqueada; avaliação especializada                          | Indisponível  |
| Sintomas urgentes                                           | Bloqueada; orientação presencial imediata                   | Indisponível  |
| Avaliação ausente, incompleta ou alterada sem recálculo     | Não inicia; completar ou recalcular                         | Indisponível  |

A ausência de doenças informadas não comprova saúde clínica. A política da avaliação continua exigindo cautela para IMC >= 40; permitir um calendário organizacional Padrão não libera déficit, exercícios intensos ou prescrição. Qualquer condição declarada, inclusive texto livre, recebe cautela nos dois módulos. `allowsAutomaticCaloricDeficit` e `allowsIntensifiedAdaptation` continuam falsos. `calorieTargetAvailable` é falso e `calorieTarget` é sempre null. Não há política clínica validada para Intensificada ou metas numéricas.

TMB usa **Mifflin-St Jeor**, não Harris-Benedict. GET usa a heurística documentada na [avaliação](assessment.md); o intervalo de ±8% não é precisão clínica ou intervalo de confiança comprovado.

## Contrato HTTP

Todos exigem Firebase ID Token validado e e-mail confirmado. UID provém somente do token.

| Endpoint                            | Contrato                                                                                                                                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/api/v1/adaptation/me/preview` | `assessmentRevision`, `recommendedMode` (standard ou null), `modes.standard/intensified` com `available` e `reasons`, `calorieTargetAvailable:false`, `notices:[{code,message}]`                                                                           |
| GET `/api/v1/adaptation/me`         | Plano com `id`, `mode`, `status:active/completed`, `assessmentRevision`, `startedAt`, `timeZone`, `startLocalDate`, `day30LocalDate`, `currentDay`, `elapsedDays`, `remainingDays`, `calendarProgressPercent`, `calendar`, `calorieTarget:null`, `notices` |
| POST `/api/v1/adaptation/me/start`  | Entrada `{mode:standard, timeZone:America/Sao_Paulo}`; plano em 201 na criação ou 200 na repetição com mesmos parâmetros                                                                                                                                   |

Valores acima são strings JSON onde indicado. Modalidade `intensified` é reconhecida mas rejeitada com 422. Campos extras, UID fornecido pelo cliente e fusos inválidos retornam 400. O timezone deve ser um nome reconhecido de fuso IANA, não um offset numérico.

Erros padronizados preservam `code` e `reasons`: 401 token ausente/inválido/expirado; 403 e-mail não confirmado; 404 avaliação ou plano ausente; 422 avaliação incompleta ou modalidade bloqueada; 409 avaliação alterada após cálculo, alteração de parâmetros ou revisão modificada durante início; 503 serviço indisponível. A avaliação editada exige recálculo mesmo que todos os campos estejam preenchidos. Erros não autorizam iniciar nem criam estado fictício.

O frontend traduz o JSON canônico para modelos de apresentação em `core/adaptation/adaptation-adapter.ts`. Não calcula elegibilidade, datas do calendário ou progresso. Acrescenta somente rótulos de apresentação dos marcos 7, 14, 21 e 30. Falha de servidor não gera calendário local substituto. Trocar de identidade cancela requisições e limpa plano e prévia em memória.

## Datas, progresso e persistência

Documento único: `users/{uid}/adaptations/initial`. A transação garante início único, confere a revisão e o estado da avaliação antes de gravar. Repetir os mesmos parâmetros devolve o plano existente; não cria outro ciclo nem reinicia suas datas. Alterar fuso retorna 409. Histórico da avaliação é preservado, e o plano conserva `assessmentRevision` do início.

`startedAt` e metadados são timestamps UTC ISO 8601. `startLocalDate` é a data civil no fuso IANA detectado no navegador, calculada pelo servidor; o fuso fica fixo. Dia 30 = início + 29 dias civis, inclusive durante horário de verão, mudanças de mês e ano. `calendar` tem 30 itens `{dayNumber,localDate,temporalState:past/today/future}`.

O servidor deriva as métricas em cada consulta. No Dia 1: 0 dias anteriores e 0%; no Dia 30: 29 dias anteriores e 96,7%; após o Dia 30: 30 dias, 100% e status completed. `remainingDays` inclui o dia atual. Status completed indica apenas fim do período; não adesão, sucesso clínico ou tarefas realizadas. O documento original conserva status active de criação; a resposta calcula o estado temporal sem cron, escrita diária ou alteração artificial dos dados. Recarregar/consultar atualiza a apresentação.

Não há check-ins, refeições, ingestão, faltas presumidas, calorias consumidas, pesagens ou exercícios inventados. Dias passados não ganham checkmarks de tarefas concluídas. Marcos são temporais; Dia 14 é segunda semana, não metade exata de 30 dias.

## Execução e testes

Da raiz, com Node 24/npm 11 e dependências instaladas pelo lockfile:

```sh
npm ci
npm run dev:emulator
# Ou Cloud DEV já configurado com ADC externa:
npm run dev:cloud
# Validação transversal, com emuladores temporários:
npm run validate
```

Antes de iniciar aplicações, verifique se 4200/3100 já pertencem a uma sessão. Não encerre processos desconhecidos. A aplicação usual usa Angular4200/API3100, Auth9099 e Firestore8080. A suíte automatizada usa Angular4201/API3105; smoke4203/API3105. Requer Chromium e Java portátil/local já preparados. Suítes com servidores devem rodar sequencialmente; se portas dos emuladores estiverem ocupadas por outra sessão, não as encerre.

A jornada `scripts/integration/adaptation-flow.spec.ts` cria identidades oficiais no Auth Emulator, usa tokens reais do emulador, grava Avaliação pela API, inicia pelo Angular e confere Firestore. Verifica reload, idempotência, 30 datas controladas, virada da data local, conclusão, ausência de alvo calórico, isolamento e regras de acesso. Casos de segurança e regressões da avaliação/autenticação rodam na mesma suíte. Capturas em 320/390/768/1440px ficam em `.tools/checkpoint6-evidence` (ignorado pelo Git).

Somente o bootstrap `scripts/integration/serve-emulator-api.mjs` substitui ClockService através do provider de teste. Exige NODE_ENV=test, porta3105, projeto demo exato e hosts locais. Arquivo temporário ignorado controla apenas o relógio da Adaptação; nunca datas de documentos, autenticação, serviços Cloud ou bootstrap normal. Nenhuma rota de alteração de relógio existe no produto. A limpeza remove individualmente apenas usuários/documentos criados pela própria suíte e encerra servidores/emuladores de teste.

## Estado Firebase e limites

Checkpoint 6C validado com Firebase Emulator Suite; não executa testes de escrita ou destrutivos no Cloud. Configurações Cloud DEV/produção, credenciais externas e regras permanecem preservadas. Testes anteriores de autenticação/perfil Cloud não validam automaticamente esta nova Adaptação em Cloud. Produção não foi implantada. CI GitHub permanece bloqueada externamente por cobrança.

## Checkpoint 7 — previsto, não iniciado

Especificar contratos dos registros diários, alimentos/preparos, quantidades, pesagens e histórico; definir consentimento, minimização, exclusão/exportação e retenção antes de coletar dados reais. Rever política clínica e fatores de GET antes de recomendações numéricas ou Intensificada. Nenhuma dessas funcionalidades foi implementada nesta integração.
