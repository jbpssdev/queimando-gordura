# Avaliação Inicial — checkpoint 5C

Integra frontend `3ac502a` e backend `23493d6` sobre `9d4d998`. Avaliação em `/avaliacao`, resultados em `/avaliacao/resultados`. Calendário, planos e ativação da Adaptação não foram implementados.

## Etapas e dados

1. Corpo: data civil de nascimento, variável para a fórmula metabólica (inclusive não informada), altura em cm, peso em kg e tipo de balança. Apenas adultos entre 18 e 120 anos. Campos opcionais: peso desejado, cintura/pescoço/quadril em cm. Bioimpedância: gordura e água em %, massa muscular em kg e índice visceral inteiro; não substitui medição clínica. Balança comum não exige bioimpedância.
2. Saúde: condições conhecidas, ausência de condições conhecidas ou informação desconhecida; sintomas de alerta, medicamentos de uso contínuo, detalhes opcionais, gestação/lactação e acompanhamento. Autodeclarações não são diagnóstico nem comprovação de saúde clínica.
3. Rotina: padrão de trabalho, horas sentado, movimento cotidiano, passos e origem opcionais; musculação e cardio com dias/semana, minutos e intensidade. Sem treino: frequência/duração zero e intensidade `none`.
4. Alimentação: refeições/dia, regularidade, jejum prolongado, alimentação noturna, origem das refeições, balança culinária, bebidas adoçadas, álcool, dificuldades e limitação de orçamento. Preferências/restrições/alergias são opcionais no contrato; não há plano alimentar gerado.
5. Revisão, informações pendentes e solicitação dos cálculos ao servidor.

Cada botão de salvar persiste a seção pela API. Campos ainda não salvos permanecem apenas na instância do formulário e podem ser perdidos ao atualizar a página. Seções salvas são recuperadas do Firestore ao retornar; nenhum dado de saúde é salvo no localStorage. Durante carregamento ou falha inicial, o formulário não permite sobrescrever um rascunho que ainda não foi carregado. Troca de identidade limpa o estado e cancela consultas pendentes.

## Contrato HTTP

Todos os endpoints exigem Firebase ID Token validado e e-mail confirmado. UID é derivado do token; nenhum endpoint aceita UID do cliente para selecionar proprietário. O frontend também exige perfil básico completo para acessar as telas.

| Método e endpoint                      | Resposta/comportamento                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/api/v1/assessments/me`           | `{ status, sections: { body, health, routine, nutrition }, revision, updatedAt, completedAt }`; seções podem ser parciais ou null no rascunho |
| PATCH `/api/v1/assessments/me`         | `{ section, data }`, patch parcial validado por DTO; incrementa revisão e invalida conclusão anterior                                         |
| POST `/api/v1/assessments/me/evaluate` | 201 com snapshot corporal, idade, IMC, TMB, GET, referências de peso, composição e segurança; idempotente para a revisão vigente              |
| GET `/api/v1/assessments/me/results`   | Resultado da revisão vigente; não retorna silenciosamente resultado antigo após edição                                                        |

Datas civis: `YYYY-MM-DD`, sem conversão para timestamp. Idade em anos completos com referência civil UTC na data do cálculo. Timestamps e datas de cálculo: ISO 8601 UTC. Campos opcionais omitidos são preservados; null remove o campo opcional. Chaves não previstas e números inválidos são rejeitados. A validação também confere a seção consolidada após o patch.

Nomes canônicos do backend estão em `backend/src/modules/assessment/types` e DTOs. O frontend mantém um contrato de transporte correspondente em `core/assessment/assessment-contract.ts`; `assessment-adapter.ts` traduz somente nomes, enumerações e formato visual. Não calcula IMC, TMB, GET, referências ou segurança.

| Campo no formulário                                             | Campo canônico da API                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| birthDate / biologicalSex / currentWeightKg                     | dateOfBirth / sexForMetabolicFormula / weightKg                                                          |
| uninformed                                                      | unavailable                                                                                              |
| waistCircumferenceCm / neckCircumferenceCm / hipCircumferenceCm | waistCm / neckCm / hipCm                                                                                 |
| bodyFatPercentage / bodyWaterPercentage / visceralFatLevel      | bodyFatPercent / bodyWaterPercent / visceralFatIndex                                                     |
| declarationType                                                 | hasNoKnownConditions + isConditionUnknown + conditions                                                   |
| warningSymptoms                                                 | symptoms; códigos explícitos como chest_pain, fainting, severe_shortness_of_breath e severe_palpitations |
| workRoutine                                                     | workPattern: sedentary, standing, light_active, heavy_labor                                              |
| musculação/cardio em campos de formulário                       | strengthTraining/cardioTraining: frequencyDaysPerWeek, durationMinutes, intensity                        |
| intense                                                         | high                                                                                                     |
| dailySteps / stepsSource                                        | averageStepsPerDay / stepSource: phone, smartwatch, estimate, unknown                                    |
| dailyMealsCount / mealScheduleRegularity / eatsAtDawn           | mealsPerDay / mealRegularity / nightEating                                                               |
| cookingHabit / sugaryDrinksHabit / alcoholConsumption           | mealSources / sweetenedDrinksFrequency / alcoholFrequency                                                |

Erros padronizados: 400 entrada inválida/menor de idade/UID injetado; 401 token ausente, inválido ou expirado; 403 e-mail não confirmado; 404 sem avaliação ou resultado; 409 resultado obsoleto ou revisão alterada durante cálculo; 422 informações essenciais pendentes, com `pendingItems`; 503 serviço indisponível. O navegador diferencia carregamento, salvamento, falha, ausência de resultados e necessidade de recálculo. Valores opcionais não impedem conclusão; variável metabólica não informada desabilita TMB/GET, mantendo os indicadores calculáveis.

## Fórmulas e limitações

- IMC = peso kg / (altura cm / 100)². Categorias pelos limites não arredondados: <18,5; <25; <30; <35; <40; ≥40. Exibição arredondada não define classificação. Indicador populacional, sujeito a limitações individuais e de composição corporal.
- Mifflin-St Jeor: `10 × peso + 6,25 × altura − 5 × idade + 5` para male e `−161` para female. Sem variável ou com resultado matematicamente inválido: TMB indisponível, com razão explícita.
- GET é uma **heurística do produto**, não uma equação clínica validada: TMB × fator de movimento (1,2/1,3/1,4/1,5), ajuste de −0,05 para trabalho sedentário com ≥8h sentado (piso 1,15) ou +0,05 para trabalho pesado (teto 1,6), mais média semanal de exercício limitada a 600 kcal/dia. Taxas por minuto: musculação leve/moderada/alta 3,5/5/6,5; cardio 4/6,5/9. Passos não são somados novamente. Faixa ±8% é heurística, não intervalo clínico de confiança. TMB e componentes intermediários conservam precisão até a saída final.
- Referência intermediária: peso atual ×0,95, sem prazo ou prescrição. Faixa populacional de peso: 18,5×altura² a 24,9×altura². Peso desejado é editável e analisado separadamente; não é imposto como peso ideal.
- Nenhum cálculo pode gerar NaN, Infinity ou resultado metabólico negativo. Estimativas não são diagnóstico, mínimo alimentar prescrito ou liberação para exercícios.

Referências primárias: [equação original de Mifflin-St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/), [indicadores de IMC da OMS](https://www.who.int/data/gho/data/themes/topics/indicator-groups/indicator-group-details/GHO/bmi-among-adults). Os fatores GET e ±8% são decisões heurísticas locais e precisam de revisão especializada antes de uso em recomendações futuras.

## Segurança e persistência

Persistência em `users/{uid}/assessments/initial`; resultados em `results/current` e `results/rev_{revision}`. Patches incrementam revisão e retornam a avaliação a `draft`. Recálculo cria novo snapshot, preservando anteriores. A transação confere novamente a revisão antes de persistir; avaliações concorrentes da mesma revisão reaproveitam o resultado. Não há edição ou leitura de dados de terceiros.

`safety` contém status, alertas e flags. Sintomas de alerta produzem orientação de atendimento; condições conhecidas, contexto clínico desconhecido, medicamentos, gestação/lactação ou obesidade grau III exigem orientação profissional. O valor legado `cleared` significa somente ausência de alerta específico nos dados declarados, **não aptidão clínica**. Neste checkpoint `allowsAutomaticCaloricDeficit` e `allowsIntensifiedAdaptation` permanecem falsos em todos os cenários. Nenhum plano é produzido.

Admin permanece somente no backend; Firestore direto continua bloqueado. Logs da aplicação registram falhas genéricas/códigos, sem dados do questionário ou tokens. Testes usam somente emuladores demo e contas temporárias únicas, removendo individualmente seus perfis, avaliação e snapshots. Nenhum teste desta integração escreve na nuvem DEV ou em dados preexistentes.

## Testar e continuar

`npm run validate` executa formatação, lint, tipos, unitários, HTTP, builds, smoke responsivo e integração real com emuladores. A integração usa frontend 4201 e API 3105 com proxy de teste; smoke usa 4203/3105, preservando a sessão normal 4200/3100. Os emuladores usam 9099/8080 e são encerrados após a execução. Screenshots locais em `.tools/checkpoint5-evidence` são ignoradas pelo Git.

Para visualizar, use `npm run dev:cloud` com sua própria autorização ADC existente, ou `npm run dev:emulator` em sessão separada com portas livres. O ambiente Firebase DEV/produção não foi alterado. A CI GitHub continua bloqueada por cobrança externa.

Checkpoint 6: especificar contratos, consentimentos e salvaguardas do acompanhamento/Adaptação antes de implementar calendário ou recomendações. Revisão clínica dos fatores heurísticos e validação humana de e-mail/Google continuam necessárias; este checkpoint não certifica algoritmos clínicos.

Validação executada: 252 testes aprovados pelo comando completo npm run validate. Os resultados incluem 3 cenários backend contra emuladores e a jornada real de avaliação no navegador. Pendências opcionais na tela de resultados vêm de pendingItems calculado pelo backend com todas as seções; informações já respondidas não são inferidas como ausentes pelo cliente. CI remota bloqueada por cobrança, não usada como evidência de aprovação.
