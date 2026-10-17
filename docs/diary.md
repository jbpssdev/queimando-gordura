# Diário da Adaptação — checkpoint 7C

Integra frontend `3218577` e backend `7791032`, sobre main `30add66`. Rota `/diario`, também acessível pelo painel e pelos dias da Adaptação. A conta deve estar autenticada, com e-mail confirmado e perfil básico preenchido na interface. O backend exige identidade verificada; não exige plano ou elegibilidade clínica para registrar informações pessoais.

## Catálogo real e rastreabilidade

Catálogo completo de **597 alimentos** da TACO, 4ª edição revisada e ampliada (NEPA/UNICAMP, 2011). Não é uma amostra demonstrativa. Cada código da fonte mantém identidade própria, nome e preparo, distinguindo cru/cozido/grelhado/frito etc. O arquivo oficial é publicado em [Publicações do NEPA](https://nepa.unicamp.br/publicacoes/), com [Excel institucional](https://www.nepa.unicamp.br/arquivo/uploads/taco-4a-edicao/taco-4a-edicao-2/) e [publicação PDF](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf). O expediente permite reprodução parcial ou total com citação da fonte.

Energia em kcal e proteína/carboidrato/lipídios/fibra em gramas, por **100 g de parte comestível**. Valores vêm das colunas D/F/I/G/J da planilha `CMVCol taco3`, preservando sua precisão numérica. Cada alimento registra `sourceCode`, URL e referências de células. Metadados e SHA-256 do Excel estão em `backend/src/modules/foods/data/sources.json`. Conferência independente somente leitura:

```sh
python backend/scripts/verify-taco-source.py caminho/taco-oficial.xlsx
```

O verificador confere hash, todos os códigos/nomes e as 2.985 células nutricionais. Não exige biblioteca Python extra. Excel não integra o bundle nem é baixado em runtime. TACO é o catálogo oficial imutável embarcado na API; a importação reproduz o mesmo conjunto no Firestore. A API não aceita alterações de dados oficiais pela interface.

`NA`, `Tr`, vazios e valores não quantificáveis permanecem null. Zero numérico legítimo continua zero. Quatro carboidratos residuais negativos na planilha (códigos 288, 322, 337 e 400) ficam null nos cálculos; os números brutos e a justificativa ficam em `sourceNutrientNotes`. Não são transformados em zero ou positivos inventados. Há valores desconhecidos em 6 energias, 21 proteínas, 19 carboidratos, 37 lipídios e 242 fibras.

## Medidas caseiras verificadas

Fonte: [IBGE, POF 2008-2009 — Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil](https://biblioteca.ibge.gov.br/visualizacao/livros/liv50000.pdf). Foram conferidos nove valores em três alimentos; as medidas entregues sem referência verificável foram retiradas. Os outros 594 alimentos continuam disponíveis **somente em gramas**, sem extrapolação universal.

| Alimento TACO             | Medida                                                                   | Gramas        | Referência no PDF do IBGE      |
| ------------------------- | ------------------------------------------------------------------------ | ------------- | ------------------------------ |
| 1 — Arroz integral cozido | Colher de sopa cheia / concha média cheia / escumadeira média cheia      | 20 / 117 / 59 | p.36, código6300201, preparo99 |
| 3 — Arroz tipo1 cozido    | Colher de sopa cheia / concha média cheia / escumadeira média cheia      | 25 / 100 / 85 | p.35, código6300101, preparo99 |
| 567 — Feijão preto cozido | Colher de sopa cheia / concha média cheia / colher de arroz/servir cheia | 17 / 140 / 35 | p.43, código6303102, preparo99 |

São equivalências da tabela para aquele alimento/contexto, não garantias do peso de qualquer utensílio doméstico. Quando houver precisão necessária, utilizar pesagem. Cada medida transporta sua referência da fonte. Medidas de alimentos personalizados são **informadas pelo usuário/rótulo** e não são atribuídas ao IBGE.

## Refeições e histórico nutricional

Montagem com múltiplos alimentos em gramas ou medida cadastrada daquele alimento; quantidades decimais, edição, exclusão e retomada após reload. Identificador da medida fica em cada ingrediente, evitando utilizar a última medida selecionada para todos os alimentos.

Regra de cálculo: nutriente da porção = nutriente por100g × gramas /100. A API converte medidas e soma ingredientes/refeições **sem arredondar valores intermediários**. Arredondamento ocorre somente na apresentação. A interface pode mostrar uma prévia identificada antes de salvar; os resultados persistidos e totais após alterações vêm do backend.

Cada refeição guarda snapshot de nome, preparo, fonte, nutrientes por100g, quantidade, medida/equivalências disponíveis, peso convertido e nutrientes calculados. Alterar ou excluir um alimento personalizado não reescreve o passado. Ao editar uma quantidade de ingrediente já registrado, a API utiliza seu snapshot original; novos ingredientes são resolvidos no catálogo vigente.

Totais possuem `{value,isComplete}` por nutriente. Se parte dos itens tem valor desconhecido, a soma dos conhecidos permanece marcada parcial. Se nenhum é conhecido, value=null. Sem refeições, `hasEntries:false` e nutrientes null, nunca uma declaração de ingestão zero. A interface sinaliza totais parciais e distingue erro, carregamento e dia vazio confirmado. Não cria refeições ou persistência fictícias em falhas404/503.

## Água, exercícios e peso

Água em ml, com lançamentos individuais e exclusão. O total é do volume **registrado**, não meta ou garantia de consumo. Atalhos de recipientes não são recomendações de ingestão.

Atividades registram tipo cardio/strength/other, descrição, duração1–720min e intensidade light/moderate/vigorous. Não estimam gasto calórico, não descontam calorias de refeições e não prescrevem exercício. Edição e exclusão ficam no mesmo proprietário.

Peso20–500kg, um documento por data civil, com atualização explícita. A interface apresenta acompanhamento semanal, sem inventar pesagem para semanas ausentes, penalizar ausências ou recalcular avaliações históricas automaticamente.

## Contratos HTTP

Prefixo `/api/v1`, JSON camelCase, Bearer Firebase ID Token e e-mail confirmado. UID vem exclusivamente do token; userId em DTO é rejeitado.

| Endpoint                                            | Operação                                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/foods?query=&limit=&offset=&category=`        | Catálogo oficial + personalizados próprios, `items,total,limit,offset,hasMore`; limit1–100, offset0–10000, busca até120 caracteres com acentos normalizados |
| GET `/foods/:id`                                    | Detalhe oficial ou personalizado próprio; outro usuário recebe404                                                                                           |
| POST `/foods/me`                                    | Personalizado com nutrientes por100g e `householdMeasures:[{id,label,grams,source?}]`                                                                       |
| PATCH / DELETE `/foods/me/:id`                      | Editar / excluir logicamente personalizado; oficiais são imutáveis403                                                                                       |
| GET `/diary/me?date=YYYY-MM-DD`                     | Refeições, `nutritionTotals`, `water:{entries,totalMl}`, atividades, peso e `hasAnyEntries`                                                                 |
| GET `/diary/me/summary?from=&to=`                   | Até62 dias civis, `items` com indicadores reais; energia parcial sinalizada com `nutritionIsComplete`                                                       |
| POST `/diary/me/meals`                              | date, mealType, title?, items:[{foodId,amount,unit:g/household,householdMeasureId?}], clientRequestId?, timeZone?                                           |
| PATCH / DELETE `/diary/me/meals/:id`                | Edição com version e exclusão própria                                                                                                                       |
| POST / DELETE `/diary/me/water[/ :id]`              | Lançamento ou exclusão de água própria                                                                                                                      |
| POST / PATCH / DELETE `/diary/me/activities[/ :id]` | Criação, edição com version e exclusão de atividade própria                                                                                                 |
| PUT `/diary/me/weight`                              | Pesagem idempotente por date; weightKg, notes?, timeZone?                                                                                                   |
| DELETE `/diary/me/weight/:date`                     | Excluir pesagem própria; variante por query existente preservada                                                                                            |

MealType inclui breakfast, morning_snack, lunch, afternoon_snack, dinner, snack, supper e other. Frontend traduz description/intensity da API para title/perceivedIntensity de apresentação e paginação offset para o cursor interno, sem endpoints paralelos. Erros preservam code/reasons no filtro central: 400 entrada inválida/limites; 401 sem token ou expirado; 403 e-mail não confirmado ou tentativa de alterar catálogo oficial; 404 registro próprio inexistente; 409 chave idempotente com outro conteúdo ou conflito de revisão; 503 configuração/serviço indisponível.

Datas são civis reais YYYY-MM-DD, inclusive validação de dias de mês; timestamps ISO UTC. O fuso IANA informado descreve o contexto do registro e não altera implicitamente a data escolhida. A Adaptação conserva o fuso fixo do plano. Quantidade positiva com até10000g convertidos, no máximo100 ingredientes; medidas personalizadas até20, com IDs únicos e até5000g por medida. Não há equivalência automática entre ml e gramas de alimentos.

## Concorrência e segurança

Refeições, água e atividades usam IDs determinísticos por data/clientRequestId dentro do UID e transações Firestore. Repetir a mesma solicitação devolve o mesmo lançamento; reutilizar a chave para outro conteúdo retorna409. A UI envia chaves e bloqueia duplo envio enquanto salva. PATCH de refeições, atividades e personalizados suporta version; a interface envia a revisão recebida e conflitos exigem reload. Clientes legados que omitem version mantêm PATCH transacional, mas devem enviar a revisão para detectar edição desatualizada. PUT de peso tem semântica de substituição explícita por data, com createdAt preservado em transação.

Coleções privadas sob `users/{uid}`: customFoods, diary_meals, diary_water, diary_activities, diary_weights. Admin só no backend, regras Firestore negam acesso direto mesmo com cliente autenticado. Estado clínico e diário não vão ao localStorage. Troca de identidade limpa estado e cancela requisições pendentes. Erro ao consultar o catálogo não é tratado como coleção vazia. Não há metas calóricas automáticas ou liberação médica baseada no diário.

## Integração com Adaptação e execução

Resumo por data alimenta marcadores de alimentação, água, atividade e peso no calendário. Dias sem lançamentos mostram “Sem registros”; não viram dias concluídos nem zero ingestão. Diário funciona mesmo sem plano, com IMC>=40, condição clínica declarada ou Adaptação bloqueada; registrar informações não autoriza prescrição.

Da raiz: `npm ci`, depois `npm run dev:emulator` ou `npm run dev:cloud` com ADC externa/configuração DEV existente. Verifique4200/3100/9099/8080 antes; não encerre sessões alheias. `npm run validate` inclui lint, tipos, unitários, HTTP, builds, smoke e integração com emuladores em4201/3105; smoke4203/3105. Java e Chromium já preparados são necessários. Emuladores oficiais, identidades temporárias, tokens reais do emulador e limpeza individual por UID; testes não apagam coleções de terceiros.

```sh
# Validação do catálogo, sem rede ou gravação:
node backend/scripts/import-taco.mjs --dry-run
# Com emulador já iniciado, projeto demo exato e host local configurados:
node backend/scripts/import-taco.mjs --emulator
```

O runner integrado importa597 alimentos e repete a importação para confirmar idempotência. O importador cria somente documentos ausentes, não sobrescreve documentos divergentes nem apaga nada. Em Cloud exige lista explícita contendo apenas queimando-gordura-783e4, ADC, autorização FIREBASE_ALLOW_CATALOG_IMPORT=true, sem emuladores e sem NODE_ENV=production. Não há importação/deploy de produção. Neste checkpoint, o projeto Cloud DEV queimando-gordura-783e4 recebeu os 597 documentos oficiais: primeira execução criou597; repetição criou0 e confirmou597 inalterados. Nenhum usuário ou diário Cloud foi criado/alterado. A jornada do diário foi validada nos emuladores; sua validação Cloud ficou pendente no7C e foi realizada no [checkpoint8C](adaptation-progress.md). Produção não foi acessada.

## Validação do checkpoint 7C

`npm run validate` aprovado: **492 testes distintos**, sendo194 Angular,190 Nest,2 travas Cloud unitárias,84 HTTP,6 integrações backend/emuladores,13 fluxos de navegador/emuladores,2 smoke responsivos e1 teste de regras. Formatação, lint, tipos e builds aprovados. Casos externos ignorados na suíte HTTP foram executados separadamente nos emuladores; a suíte opcional de diário Cloud não foi executada. O verificador independente conferiu597 nomes/códigos e2.985 células do Excel oficial. Capturas em320/390/768/1440px ficam em `.tools/checkpoint7-evidence`, fora do Git. Servidores de teste e emuladores são encerrados, com limpeza individual dos registros temporários.

## Limites e Checkpoint 8

Ampliação das medidas caseiras exige correspondência documental alimento/preparo/gramas; não completar por estimativa. Revisão clínica, consentimento, minimização, retenção, exclusão/exportação e validação de uso real continuam necessários. Nutrientes de rótulos personalizados são autodeclarados; TACO é referência, não análise individual do prato. Fotos, receitas complexas, PDF final, nova modalidade clínica e metas automáticas não foram implementados. Checkpoint8 deverá especificar os próximos recursos sem inferir autorização deste roadmap. CI GitHub continua bloqueada externamente por cobrança; workflow preservado.
