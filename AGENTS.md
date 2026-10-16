# Orientações de trabalho

- Respeite a arquitetura em `docs/architecture.md` e trabalhe somente no escopo solicitado. Funcionalidades do roadmap não são autorização para implementá-las.
- Stack: Angular 22 standalone, Tailwind 4, Spartan UI, Nest REST e Firebase. Não adicionar React, Angular Material, PrimeNG, AngularFire sem necessidade, Nx, Turborepo, Prisma, Redis, Docker ou concorrentes sem justificativa e escopo explícito.
- Use os componentes Spartan existentes em `frontend/src/app/shared/ui`. Adicione outros pelo gerador oficial a partir de `frontend/`; não recrie componentes nem instale o kit inteiro.
- Preserve arquivos/dados e alterações legítimas. Nunca apresente dados fictícios como reais ou anuncie uma verificação que não executou.
- Não crie Git nas aplicações, submódulos acidentais ou lockfiles internos. Geradores Angular/Nest devem usar `--skip-git`.
- Worktrees podem ter **arquivo** `.git` apontando ao repositório principal. Nunca apagar metadados, worktrees ou arquivos `.git` legítimos. Verifique branch, status e remote antes de ações de publicação; não faça force push nem sobrescreva alterações remotas.
- Não faça commits ou pushes salvo quando a tarefa solicitar. Não configure orquestração extra. Preserve trabalho em `main`/worktrees conforme escopo da tarefa.
- Não execute auditorias extensas a cada pequena alteração. Use validações direcionadas; reserve `npm run validate` e regressão integrada para checkpoints importantes.
- Atualize README e documentação quando comportamento, comandos, ambiente ou arquitetura mudarem.
- Dependências via npm workspaces a partir da raiz e um único lockfile. Não compartilhar indiscriminadamente tsconfigs Angular e Nest.
- TypeScript strict, imports de tipos explícitos quando exigidos, nomes descritivos, componentes pequenos, Signals para estado local adequado e serviços para integrações. Imports externos antes de internos; usar organização do editor quando útil, sem criar ferramentas extras só para ordenar imports.
- Backend: controllers HTTP, services para regras, DTOs para entrada, providers para infraestrutura. Evite abstrações sem uso e acoplamento entre módulos.
- Identidade vem do token Firebase validado. Autorize toda operação no backend; Admin ignora regras Firestore. Nunca confiar em `userId` do cliente. Sem Admin/segredos no navegador ou tokens em logs.
- Sem duplicação de lógica crítica: cálculos persistidos têm referência no backend.
- Não encerre processos de outros projetos nem modifique globalmente o Windows. Em caso de porta ocupada, informe o conflito ou use porta de teste isolada quando viável.

## Trabalho paralelo futuro e worktrees

Esta seção orienta sessões futuras; não é instrução para delegar esta tarefa. Quando paralelismo estiver autorizado, delimite propriedade dos arquivos: frontend e backend em worktrees separadas, com contratos HTTP acordados antes das mudanças. Uma única pessoa/agente integra arquivos compartilhados (`package.json`, `package-lock.json`, CI, docs comuns e Firebase). Evite dois processos npm modificando o mesmo lockfile; após integrar manifests, regenere o lockfile uma única vez e valide os dois workspaces. Use portas locais distintas por worktree via configuração, nunca encerrando processos alheios. Revise diffs, integre mudanças de forma segura e execute validação proporcional ao conjunto integrado.
