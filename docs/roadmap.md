# Roadmap

## Entregue — identidade, perfis e integração Cloud DEV

- Fundação `8ae3b26`: Angular standalone, Tailwind/Spartan, Nest, ambientes, testes e CI.
- Integração `2288209`: frontend `d315bc7` e backend `08956d9`, contrato de autenticação/perfil e automação com emuladores.
- Checkpoint 4 integra frontend `7b4782a` (Minha Conta, Google popup/redirect e tratamento de erros) e backend `42f7a39` (ADC/Cloud e contratos HTTP).
- Configuração real do app Web, Authentication E-mail/Senha e Google habilitados, Firestore Cloud DEV existente e regras restritivas consultados. Nenhum recurso de infraestrutura recriado ou deploy de regras.
- Smoke Cloud real de API: cadastro, ID Tokens, PUT/GET autenticados, confirmação por código oficial, isolamento e Firestore direto negado; limpeza individual verificada.
- Emuladores permanecem separados de Cloud e os builds padrão de produção não apontam permanentemente para DEV.

## Próximo checkpoint recomendado

Concluir a validação interativa de Google com uma conta autorizada e entrega/recuperação de e-mail em caixa postal real; revisar quotas e políticas de e-mail de desenvolvimento sem habilitar faturamento. Estabilizar essa experiência antes de novos domínios. Configuração e limitações em [Firebase Cloud DEV](firebase-cloud-dev.md).

Depois, definir contratos de consentimento, minimização de dados e requisitos da avaliação inicial antes de autorizar implementação. Agentes futuros podem abrir branches a partir da main integrada, respeitando propriedade de arquivos, lockfile único e worktrees conforme AGENTS.md. CI GitHub continua bloqueada por cobrança; workflow preservado.

## Posterior — ainda não implementado

Avaliação corporal/rotina/objetivos; IMC e fórmulas estimativas com referência no backend; Adaptação de 30 dias; catálogo alimentar e preparos; registros diários, exercícios, histórico de peso e gráficos; ajustes auditáveis e PDF. Depois: Foco Total, controle glicêmico, exames e sono.

Avaliação e Adaptação atuais são apenas avisos. Roadmap não autoriza implementar esses módulos.
