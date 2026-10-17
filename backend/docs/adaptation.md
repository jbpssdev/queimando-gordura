# Adaptação de 30 Dias — Checkpoint 6C e Checkpoint 8B

Implementação do motor oficial de criação, elegibilidade, ciclo temporal, acompanhamento de progresso, conquistas determinísticas e relatório PDF da Adaptação de 30 dias no backend NestJS.

## 1. Contratos de API

Todos os endpoints residem sob o prefixo `/api/v1/adaptation` e exigem autenticação via Firebase ID Token validado (`FirebaseAuthGuard`) e e-mail confirmado (`VerifiedEmailGuard`). A identidade é derivada exclusivamente das credenciais verificadas no servidor.

| Método e Endpoint                                                | Resposta / Comportamento                                                                                                                                                                                                                                                                                 |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/adaptation/me/preview`                              | Consulta a Avaliação Inicial e retorna a elegibilidade para as modalidades Padrão e Intensificada, além de avisos estáveis.                                                                                                                                                                              |
| `POST /api/v1/adaptation/me/start`                               | Recebe `{ mode, timeZone }`. Valida fuso horário IANA, confere elegibilidade e cria o plano em transação atômica. Responde `201 Created` na primeira criação e `200 OK` na repetição idempotente da mesma solicitação. Responde `409 Conflict` se houver tentativa de alterar parâmetros de plano ativo. |
| `GET /api/v1/adaptation/me`                                      | Retorna o plano ativo ou concluído com 30 dias de calendário, estado temporal calculado dinamicamente pelo relógio do servidor, progresso e avisos. Retorna `404 Not Found` caso nenhum plano tenha sido iniciado.                                                                                       |
| `GET /api/v1/adaptation/me/progress`                             | Retorna consolidação de progresso temporal, participação por categoria no diário, 5 períodos semanais, histórico de pesagens com variação ponderal real, indicadores derivados (IMC e TMB) atualizados, conquistas determinísticas e a flag `reportAvailable`.                                           |
| `GET /api/v1/adaptation/me/report.pdf?includeHealthDetails=false`| Retorna relatório oficial em formato PDF A4 gerado no servidor. Rejeita com `422 Unprocessable Entity` (`REPORT_NOT_AVAILABLE`) antes da conclusão do Dia 30. Inclui detalhes de saúde autodeclarados e aviso destacado apenas quando `includeHealthDetails=true`.                                |

---

## 2. Separação de Riscos e Elegibilidade

O motor distingue explicitamente entre:

- **Necessidade de acompanhamento profissional**: comunicada via avisos informativos ou de precaução.
- **Elegibilidade para jornada de hábitos**: a modalidade Padrão foca em estruturação comportamental e rotina, sem prescrição de metas calóricas numéricas.
- **Elegibilidade para metas calóricas automáticas**: desativada integralmente nesta versão (`calorieTargetAvailable: false`, `calorieTarget: null`).
- **Elegibilidade para modalidade Intensificada**: permanentemente bloqueada nesta etapa (`available: false`, motivo `CLINICAL_POLICY_PENDING`).
- **Sintomas de urgência médica**: bloqueiam o início de qualquer plano e orientam atendimento médico presencial imediato (`EMERGENCY_SYMPTOMS_PRESENT`).

### Regra de Obesidade Grau 3 (IMC >= 40)

- **Isolada (sem condições adicionais declaradas, sem gravidez/lactação, sem sintomas de urgência)**: a modalidade Padrão é liberada (`available: true`), acompanhada de aviso de orientação profissional necessária (`OBESITY_CLASS_3_GUIDANCE`). A modalidade Intensificada permanece indisponível.
- **Acompanhada de qualquer condição declarada**: bloqueia a modalidade Padrão (`CLINICAL_CONDITION_RESTRICTION`).

---

## 3. Calendário e Regras Temporais

- **Dia 1**: Inicia na data civil local (`startLocalDate`) calculada no momento exato do clique de início no servidor, utilizando o fuso IANA fixado.
- **Dia 30**: Corresponde exatamente a `startLocalDate + 29 dias` civis (`day30LocalDate`), imune a variações de fuso e horário de verão.
- **Transição de Conclusão**: O plano transita dinamicamente para `status: completed` assim que a data local atual ultrapassa `day30LocalDate`. Não há dependência de cron ou jobs agendados.
- **Limites**: `currentDay` varia de 1 a 30 e nunca ultrapassa 30.
- **Calendário**: Contém rigorosamente 30 elementos com `dayNumber`, `localDate` (YYYY-MM-DD) e `temporalState` (`past`, `today`, `future`).

---

## 4. Regras de Progresso e Participação (Checkpoint 8B)

O backend distingue rigorosamente:
1. **Progresso temporal**: Dias civis decorridos desde a data de início até a data corrente (limitado a 30).
2. **Participação**: Contagem de datas civis distintas contendo pelo menos um registro voluntário de refeição, hidratação, atividade ou pesagem.
3. **Métricas por categoria**: Contagem de dias civis com registros de cada categoria (`daysWithMeals`, `daysWithWater`, `daysWithActivities`, `daysWithWeight`).
4. **Ausência de registros**: Dias sem registros significam estritamente ausência de informação lançada pelo usuário, nunca consumo zero de calorias, jejum forçado ou fracasso.

---

## 5. Períodos Semanais

Os 30 dias do plano são agrupados em 5 períodos civis:
- **Período 1**: Dias 1 a 7 (7 dias).
- **Período 2**: Dias 8 a 14 (7 dias).
- **Período 3**: Dias 15 a 21 (7 dias).
- **Período 4**: Dias 22 a 28 (7 dias).
- **Período 5 (Fechamento)**: Dias 29 e 30 (2 dias).

Cada período relata:
- Intervalo de datas civis.
- Dias transcorridos no período.
- Dias com registros gerais e por categoria.
- Pesagens ocorridas no intervalo.
- Resumo nutricional com indicação explícita de cobertura parcial (`isPartial: true`). Não são calculadas médias atribuindo 0 kcal a dias sem registro.

---

## 6. Evolução do Peso e Indicadores Derivados

- **Origem das pesagens**: Utiliza exclusivamente as pesagens salvas no `diary_weights` dentro do intervalo civil dos 30 dias.
- **Peso inicial declarado**: Mantido como referência separada originada na Avaliação Inicial (`initial_assessment`), nunca injetado artificialmente como pesagem do Dia 1.
- **Variação de peso (`weightDeltaKg`)**: Calculada somente quando existem pelo menos duas pesagens registradas no diário (`última - primeira`). Caso haja 0 ou 1 pesagem, o delta é retornado como `null` com o motivo (`INSUFFICIENT_MEASUREMENTS`).
- **Indicadores derivados**:
  - `currentBmi`: Calculado a partir da última pesagem do diário e da altura da avaliação.
  - `currentBmr`: Estimado pela fórmula de Mifflin-St Jeor para a idade e peso da última pesagem (quando o sexo biológico para fórmula for informado).
  - Oscilações de curto prazo não são interpretadas como perda ou ganho exclusivo de gordura nem atribuídas a exercícios.

---

## 7. Motor de Conquistas Determinísticas

O motor calcula 7 conquistas determinísticas e idempotentes a partir dos dados consolidados:
1. `FIRST_DIARY_ENTRY`: Pelo menos 1 data com registro no diário.
2. `FIRST_MEAL_ENTRY`: Pelo menos 1 dia com refeição registrada.
3. `FIRST_ACTIVITY_ENTRY`: Pelo menos 1 dia com atividade registrada.
4. `FIRST_WEIGHT_ENTRY`: Pelo menos 1 dia com pesagem registrada no diário.
5. `SEVEN_DISTINCT_DAYS_RECORDED`: Pelo menos 7 datas civis distintas com registros.
6. `FOURTEEN_DISTINCT_DAYS_RECORDED`: Pelo menos 14 datas civis distintas com registros.
7. `ADAPTATION_30_DAYS_COMPLETED`: Plano concluído (`status: completed`).

Novas contas sem lançamentos não desbloqueiam nenhuma conquista indevida. As conquistas são categorizadas em `unlocked` e `locked`.

---

## 8. Relatório PDF Oficial

O endpoint `GET /api/v1/adaptation/me/report.pdf` emite um documento binário A4 profissional gerado no servidor via builder puro e seguro, sem dependência de navegadores externos:
- **Disponibilidade**: Rejeitado com código 422 (`REPORT_NOT_AVAILABLE`) enquanto o plano estiver ativo. Liberado imediatamente após a conclusão dos 30 dias.
- **Cabeçalhos HTTP**: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="relatorio-adaptacao-30-dias.pdf"`, `Cache-Control: no-store`.
- **Conteúdo**:
  - Cabeçalho institucional e identificação do usuário/período.
  - Resumo temporal e métricas de participação com ressalva sobre dias vazios.
  - Dados corporais e valores de referência iniciais.
  - Tabela dos 5 períodos semanais com ressalvas de cobertura nutricional parcial.
  - Histórico de pesagens, delta ponderal e limitações metrológicas da balança.
  - Indicadores derivados (IMC e TMB).
  - Conquistas obtidas no período.
  - Seção clínica autodeclarada (apenas se `includeHealthDetails=true`), acompanhada de tarja destacada de aviso de que são dados autodeclarados e não diagnósticos.
  - Aviso legal completo atestando que o documento não substitui diagnóstico médico nem prescrição nutricional.
  - Rodapé em todas as páginas com numeração no formato "Página X de Y".

---

## 9. Persistência Firestore

- Documento do plano armazenado em: `users/{uid}/adaptations/initial`.
- Subcoleções consultadas no diário: `diary_meals`, `diary_water`, `diary_activities`, `diary_weights`.
- Acesso direto via cliente permanece categoricamente negado pelas regras de segurança do Firestore.
- Transações atômicas impedem duplicações e asseguram integridade concorrente.
