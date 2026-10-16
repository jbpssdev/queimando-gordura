# Roadmap

## Entregue

- Fundação `8ae3b26`, integração de identidade/perfis `2288209` e Firebase Cloud DEV `9d4d998`.
- Checkpoint 5C: frontend `3ac502a` e backend `23493d6` integrados. Avaliação Inicial com Corpo, Saúde, Rotina, Alimentação e Revisão; salvamento e retomada; IMC, TMB, GET heurístico, referências de peso e segurança; resultados versionados por usuário.
- Integração real Angular → Nest → Firestore comprovada com emuladores oficiais e dados temporários. Sem nova escrita Cloud neste checkpoint. [Contrato, limites e testes](assessment.md).

## Checkpoint 6 — próximo escopo a especificar

Definir contratos do acompanhamento/Adaptação de 30 dias, consentimento e minimização dos dados, retenção/exclusão, histórico e salvaguardas antes de implementar calendário ou recomendações. Preservar o backend como autoridade e não ativar automaticamente déficit ou modalidades intensificadas com base em autodeclarações.

Revisão especializada dos fatores heurísticos de energia continua necessária antes de gerar recomendações. Google pessoal e entrega de e-mails exigem validação interativa. A CI GitHub continua bloqueada por cobrança externa, com workflow preservado.

Agentes futuros podem criar branches a partir da main integrada, respeitando worktrees, contratos e propriedade de arquivos em AGENTS.md. Mudanças no contrato devem atualizar tipos de transporte, adaptador e testes reais na mesma integração.

## Posterior — não implementado

Calendário e plano Adaptação; catálogo alimentar/preparos; registros diários em gramas, calorias/macros/fibras; exercícios registrados; histórico semanal de peso/gráficos; ajustes rastreáveis e PDF. Depois: Foco Total, controle glicêmico, exames e sono.

As rotas de avaliação agora são funcionais; Adaptação continua somente apresentação de módulo futuro. Roadmap não autoriza implementar etapas posteriores.
