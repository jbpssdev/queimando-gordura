# Segurança e privacidade

## Controles atuais

- Firestore nega todas as leituras e gravações diretas, inclusive autenticadas; teste automatizado usa somente emuladores.
- Firebase desativado por padrão; SDKs são inicializados somente nos modos explicitamente configurados e nenhum login é simulado. `uid` usado nos testes de regras é contexto exclusivo do emulador, não identidade real.
- Projeto demo e hosts loopback fixos nos scripts dos emuladores. Sem credenciais, deploy, coleções ou dados de produção.
- Admin SDK apenas backend. Não enviar credenciais, chaves privadas ou variáveis de servidor ao navegador.
- `.env`, chaves, contas administrativas, logs, builds, caches e dependências são ignorados. `.env.example` é versionado sem segredos.
- CORS por lista explícita, sem curingas; produção exige HTTPS. Não representa controle de acesso contra clientes fora do navegador.
- Entrada validada globalmente, propriedades adicionais rejeitadas, erros consistentes, mensagens internas ocultas. Não registrar tokens, cabeçalhos, corpos sensíveis ou credenciais. Health não expõe dependências ou segredos.
- Encerramento via hooks Nest; desenvolvimento não encerra processos alheios. CI sem segredos de produção e sem deploy.

`FIREBASE_MODE=disabled` não habilita acesso anônimo a dados: as telas de autenticação exibem configuração ausente e os endpoints de perfil retornam 503. Modos emulator/production inicializam os SDKs após validar configuração; somente o emulador foi validado de ponta a ponta neste checkpoint. Integração futura deve falhar de forma segura ao solicitar funcionalidade sem configuração válida. Produção Firebase exige projeto não demo e caminho absoluto para arquivo de credenciais externo existente; não copiar o arquivo ao repositório. A estratégia poderá evoluir para identidade de workload quando a hospedagem for definida.

## Requisitos antes de dados reais

- Verificar ID tokens, validade/revogação conforme política; extrair proprietário do token, nunca de `userId` enviado pelo cliente.
- Autorizar todas as operações no backend: Admin SDK não depende de regras Firestore. Negar por padrão, isolar por usuário e testar tentativas entre usuários.
- Definir bases legais, consentimentos específicos quando aplicáveis, informação acessível sobre finalidade e política de retenção. Saúde é dado sensível; coletar somente o necessário e permitir recusar dados opcionais.
- Implementar exportação individual e exclusão com validação de identidade, incluindo backups e retenções justificadas.
- Restringir acesso administrativo, gerir segredos externamente, TLS, rate limiting quando surgirem endpoints públicos de risco, e revisão de dependências antes de publicação de serviço.
- Definir recuperação, backups e resposta a incidentes. Preservar integridade/histórico, versões de fórmulas e rastreabilidade dos ajustes sem perpetuar dados após exclusão legítima.
- Auditoria de acesso minimizada, segregada e com retenção definida; evitar dados clínicos em logs e métricas.

Estes são requisitos de implementação futura, não declaração de conformidade LGPD. O perfil básico armazena nome, sobrenome, e-mail e autodeclaração de maioridade; dados corporais e de saúde não são coletados neste checkpoint. Limitações clínicas e funcionais estão em [product.md](product.md).

## Dependências no checkpoint 0

A verificação em 16/10/2026 encontrou zero alertas nas dependências de produção (`npm audit --omit=dev`). Permanecem alertas transitivos em ferramentas de desenvolvimento: `braces`/`micromatch`/`ts-morph` no gerador Spartan e no Firebase CLI, além de OpenTelemetry e uuid no Firebase CLI. Alguns não têm correção upstream; não aplicar downgrade ou atualizações major indiscriminadas com `npm audit fix --force`. Não fornecer padrões/arquivos não confiáveis a essas ferramentas e reavaliar suas versões antes de publicar serviços reais.

Overrides mantêm gRPC em patch corrigido e Undici 7 corrigido, e fixam a família de dependências transitivas Nx do gerador Spartan na versão compatível. **Nx não foi adotado como ferramenta do monorepo**: não há configuração, scripts ou orquestração Nx. Seus pacotes são exigidos internamente pelo gerador oficial Spartan 1.7.0. Remover esses overrides quando os pacotes de origem incorporarem as correções e após validação direcionada.

No checkpoint 2, AuthGuard verifica Firebase ID Tokens e UsersService deriva o documento exclusivamente do uid autenticado. GET exige e-mail confirmado; PUT permite completar cadastro pré-confirmação. Testes reais comprovam isolamento entre identidades, rejeição de uid injetado e regras de negação do Firestore web. Tokens não são registrados em logs e traces/HAR dos testes de autenticação são desativados. Privacidade, retenção, exportação/exclusão e revisão de nuvem continuam requisitos antes de coleta de dados sensíveis.
