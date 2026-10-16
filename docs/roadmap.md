# Roadmap

## Entregue — fundação e integração de identidade/perfil

- Fundação 8ae3b26: Angular standalone, Tailwind/Spartan, API Nest, ambientes, testes, CI e documentação.
- Frontend d315bc7: landing, cadastro, login e-mail/senha/Google, recuperação de senha, confirmação, guards e painel básico.
- Backend 08956d9: Admin SDK, guards de ID Token/e-mail, GET e PUT /api/v1/users/me, persistência em users/{uid}.
- Checkpoint 2 integra os históricos e o contrato, adiciona modo local reproduzível, renovação explícita do token, distinção entre perfil ausente e API indisponível e automação entre Angular, Nest e emuladores oficiais. Registros de teste são isolados e removidos individualmente.

A validação de emuladores não valida Firebase em nuvem. Google OAuth real, entrega de e-mails e IAM dependem de projeto Firebase real de desenvolvimento e configuração externa. CI GitHub continua bloqueada por cobrança; workflow preservado.

## Próximo checkpoint — desenvolvimento em paralelo com contrato acordado

Preparar e validar o projeto Firebase real de desenvolvimento, domínios/provedores e credenciais externas, sem confundir com produção. Definir o contrato e os requisitos de consentimento/minimização para perfis e avaliação inicial antes de implementar novas funcionalidades. Os agentes podem abrir novas branches a partir da main integrada; respeitar propriedade de arquivos e integração única de manifests/lockfile conforme AGENTS.md.

## Posterior — ainda não implementado

Avaliação corporal/rotina/objetivos; IMC e fórmulas estimativas com referência no backend; Adaptação de 30 dias; catálogo alimentar e preparos; registros diários, exercícios, histórico de peso e gráficos; ajustes auditáveis e relatório PDF. Depois: Foco Total, controle glicêmico, exames e sono.

As rotas Avaliação e Adaptação atuais são apenas avisos, sem questionários ou cálculos. Roadmap não é autorização para implementar módulos adicionais.
