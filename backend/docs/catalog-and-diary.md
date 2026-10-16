# Catálogo Alimentar e Diário Persistente — Checkpoint 7B

Implementação da infraestrutura do catálogo nutricional brasileiro e do diário de hábitos (refeições, hidratação, atividades físicas e peso semanal) no backend NestJS.

---

## 1. Fontes Nutricionais Oficiais e Dados Utilizados

1. **TACO — Tabela Brasileira de Composição de Alimentos, 4ª edição revisada e ampliada**
   - **Autor institucional**: Núcleo de Estudos e Pesquisas em Alimentação (NEPA / Unicamp).
   - **Cobertura**: 597 alimentos oficiais catalogados.
   - **Nutrientes por 100g**: energia (kcal), proteínas (g), carboidratos (g), lipídios (g) e fibra alimentar (g).
   - **Diferenciação de preparo**: distinção estrita entre alimentos in natura, crus, cozidos, grelhados, assados e fritos (ex: arroz integral cozido possui ~123 kcal/100g; arroz integral cru possui ~359 kcal/100g).
   - **Preservação de valores ausentes**: valores reportados na TACO como não analisados (`NA`), traço (`Tr`) ou vazios são preservados como `null`. Em nenhuma hipótese valores desconhecidos são transformados em zero.

2. **Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil**
   - **Autor institucional**: Instituto Brasileiro de Geografia e Estatística (IBGE / POF 2008-2009).
   - **Equivalências**: 154 alimentos com medidas caseiras verificadas (ex: colher de sopa, concha média, escumadeira, xícara, unidade, fatia).
   - **Sem equivalências universais**: alimentos sem equivalência oficial comprovada aceitam exclusivamente registro em gramas (`g`), impedindo distorções arbitrárias de porções.

---

## 2. Regra Fundamental: Independência da Adaptação

O diário funciona independentemente do estado ou elegibilidade da Adaptação de 30 dias:
- Usuários com obesidade grau III, condições clínicas declaradas ou sem plano de adaptação iniciado possuem total acesso ao registro diário pessoal de alimentação, água, exercícios e peso.
- O registro de informações de hábitos é um direito do usuário e não requer liberação médica.
- Não são calculadas nem sugeridas metas calóricas automáticas.
- Exercícios físicos registrados no diário representam atividades reais concluídas e **não fabricam gasto calórico fictício nem subtraem calorias das refeições consumidas**.

---

## 3. Contratos de API

Todos os endpoints exigem autenticação via Firebase ID Token (`FirebaseAuthGuard`) e e-mail confirmado (`VerifiedEmailGuard`). A identidade é inferida unicamente do token verificado.

### 3.1 Catálogo de Alimentos (`/api/v1/foods`)

| Método e Endpoint               | Descrição / Comportamento |
| :------------------------------ | :------------------------ |
| `GET /api/v1/foods`             | Pesquisa alimentos no catálogo oficial e alimentos personalizados do usuário. Suporta normalização de acentos em português (ex: `feijao` encontra `Feijão`), busca case-insensitive, filtro por `category`, `limit` (padrão 20, máx 100) e `offset`. |
| `GET /api/v1/foods/:id`         | Retorna detalhes de alimento oficial TACO (`taco_*`) ou personalizado próprio (`custom_*`). Retorna 404 para alimentos de outros usuários. |
| `POST /api/v1/foods/me`         | Cria alimento personalizado pertencente exclusivamente ao usuário autenticado. Retorna `201 Created`. |
| `PATCH /api/v1/foods/me/:id`    | Atualiza alimento personalizado próprio. Bloqueia alteração de alimentos oficiais TACO com `403 Forbidden`. |
| `DELETE /api/v1/foods/me/:id`   | Exclui logicamente (`deletedAt`) alimento personalizado próprio, preservando integridade das refeições anteriores. |

### 3.2 Diário Pessoal (`/api/v1/diary`)

| Método e Endpoint                       | Descrição / Comportamento |
| :-------------------------------------- | :------------------------ |
| `POST /api/v1/diary/me/meals`           | Registra refeição. Converte porções para gramas, calcula nutrientes proporcionalmente a 100g, calcula totais com indicação de cobertura completa (`isComplete`), salva snapshot imutável dos alimentos e suporta idempotência via `clientRequestId`. |
| `PATCH /api/v1/diary/me/meals/:id`      | Atualiza refeição existente e recalcula snapshots e totais nutricionais. |
| `DELETE /api/v1/diary/me/meals/:id`     | Remove registro de refeição. |
| `POST /api/v1/diary/me/water`           | Registra consumo de água em ml. Suporta múltiplos registros diários com totalização e idempotência via `clientRequestId`. |
| `DELETE /api/v1/diary/me/water/:id`     | Remove registro de água. |
| `POST /api/v1/diary/me/activities`      | Registra atividade física realizada (tipo, duração em minutos e intensidade). Não inventa calorias queimadas. |
| `PATCH /api/v1/diary/me/activities/:id` | Atualiza registro de atividade física própria. |
| `DELETE /api/v1/diary/me/activities/:id`| Remove registro de atividade física. |
| `PUT /api/v1/diary/me/weight`           | Registra ou atualiza pesagem na data civil `YYYY-MM-DD` de forma idempotente. |
| `DELETE /api/v1/diary/me/weight/:date`  | Remove pesagem da data civil (suporta param e query `?date=YYYY-MM-DD`). |
| `GET /api/v1/diary/me?date=YYYY-MM-DD`  | Retorna consolidado da data civil: refeições com snapshots, totais nutricionais com indicador de cobertura (`isComplete`), registros e soma de água, atividades, pesagem e indicador `hasAnyEntries`. Quando não há refeições, retorna `hasEntries: false` e calorias nulas (não afirma 0 kcal). |
| `GET /api/v1/diary/me/summary?from=...` | Retorna resumo compacto por dia civil no intervalo (`hasMealEntries`, `totalKcal`, `hasWaterEntries`, `totalWaterMl`, `hasActivities`, `hasWeightEntry`, `weightKg`) para alimentar os marcadores visuais do calendário. |

---

## 4. Snapshots Imutáveis e Tratamento de Ausências

1. **Fórmula Matemática da Porção**:
   $$\text{Nutriente da Porção} = \frac{\text{Nutriente por } 100\text{g} \times \text{Peso em Gramas}}{100}$$

2. **Snapshot Imutável**:
   Cada item gravado em `diary_meals` armazena `foodId`, `name`, `preparation`, `category`, `source`, `nutrientsPer100g`, `amount`, `unit`, `householdMeasureLabel`, `weightG` e `calculatedNutrients`.
   Mesmo que um alimento personalizado seja modificado ou excluído no futuro, o histórico nutricional gravado na refeição permanece inalterado.

3. **Valores Ausentes e Parciais**:
   Se um alimento possui um nutriente com valor `null` na fonte (como fibra não determinada), o cálculo do item preserva `null`. O total da refeição soma os valores conhecidos e define `isComplete: false` para aquele nutriente.

---

## 5. Estrutura no Cloud Firestore

Subcoleções privadas associadas ao UID autenticado:
- `users/{uid}/customFoods/{foodId}`
- `users/{uid}/diary_meals/{mealId}`
- `users/{uid}/diary_water/{waterId}`
- `users/{uid}/diary_activities/{activityId}`
- `users/{uid}/diary_weights/{date}` (documento identificado pela data civil YYYY-MM-DD)

O catálogo oficial TACO pode residir na coleção raiz `foods/{foodId}` através do script idempotente `scripts/import-taco.mjs`.

---

## 6. Procedimento de Importação TACO

O script `backend/scripts/import-taco.mjs` realiza a validação e importação idempotente:
```bash
# Modo de validação (dry-run, nenhuma gravação)
node scripts/import-taco.mjs --dry-run

# Importação no Firestore Emulator
node scripts/import-taco.mjs --emulator

# Importação controlada no Cloud DEV (somente projeto queimando-gordura-783e4)
node scripts/import-taco.mjs --cloud-dev
```
A importação utiliza lotes (`batches`) de até 400 documentos com `merge: true`, nunca destrói documentos preexistentes e requer projeto DEV explicitamente validado.
