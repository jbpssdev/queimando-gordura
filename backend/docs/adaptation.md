# Adaptação de 30 Dias — Checkpoint 6C

Implementação do motor de criação, elegibilidade, ciclo temporal e persistência da Adaptação de 30 dias no backend NestJS.

## 1. Contratos de API

Todos os endpoints residem sob o prefixo `/api/v1/adaptation` e exigem autenticação via Firebase ID Token validado (`FirebaseAuthGuard`) e e-mail confirmado (`VerifiedEmailGuard`). A identidade é derivada exclusivamente das credenciais verificadas no servidor.

| Método e Endpoint                   | Resposta / Comportamento                                                                                                                                                                                                                                                                                 |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/adaptation/me/preview` | Consulta a Avaliação Inicial e retorna a elegibilidade para as modalidades Padrão e Intensificada, além de avisos estáveis.                                                                                                                                                                              |
| `POST /api/v1/adaptation/me/start`  | Recebe `{ mode, timeZone }`. Valida fuso horário IANA, confere elegibilidade e cria o plano em transação atômica. Responde `201 Created` na primeira criação e `200 OK` na repetição idempotente da mesma solicitação. Responde `409 Conflict` se houver tentativa de alterar parâmetros de plano ativo. |
| `GET /api/v1/adaptation/me`         | Retorna o plano ativo ou concluído com 30 dias de calendário, estado temporal calculado dinamicamente pelo relógio do servidor, progresso e avisos. Retorna `404 Not Found` caso nenhum plano tenha sido iniciado.                                                                                       |

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

## 4. Persistência Firestore

- Documento armazenado em: `users/{uid}/adaptations/initial`.
- Acesso direto via cliente é categoricamente negado pelas regras de segurança do Firestore; todas as leituras e escritas ocorrem através da API NestJS.
- Transações atômicas impedem início duplicado e verificam a revisão atual da avaliação antes da criação.

Contrato integrado e testes: [guia canônico](../../docs/adaptation.md). Progresso conta dias civis anteriores (0% no Dia 1, 96,7% no Dia 30 e 100% após o fim). Disponibilidade nunca significa liberação médica; a meta calórica continua null e Intensificada indisponível.
