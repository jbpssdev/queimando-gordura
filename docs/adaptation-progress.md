# Evolução e conclusão da Adaptação — checkpoint 8C

Integra frontend `80147d9` e backend `915bceb`, sobre `c185f0f`. Avaliação Inicial, diário, Adaptação Padrão, evolução, conquistas e relatório estão implementados. Foco Total, nova modalidade clínica e metas calóricas automáticas permanecem futuros e não foram iniciados.

## Jornada e contratos

Autentique, confirme o e-mail, complete o perfil e as cinco etapas da Avaliação Inicial. Inicie manualmente a modalidade Padrão em `/adaptacao`. Registre alimentação, água, atividades e peso em `/diario`; consulte `/adaptacao/progresso`. Depois do encerramento temporal, `/adaptacao/conclusao` apresenta o resumo e o download autenticado do PDF. Os registros continuam disponíveis depois do ciclo; não se cria outro plano automaticamente.

- GET `/api/v1/adaptation/me/progress`: `id`, `mode`, `status: active|completed`, `currentDay`, `startDate`, `endDate`, `timeZone`, `elapsedDays`, `remainingDays`, `calendarProgressPercent`, `participation`, `weeklyPeriods`, `weightEvolution`, `derivedIndicators`, `achievements:{unlocked,locked}`, `reportAvailable`, `notices`.
- GET `/api/v1/adaptation/me/report.pdf?includeHealthDetails=false`: PDF sob demanda, disponível somente depois do Dia30. `true` inclui explicitamente condições, sintomas e medicamentos autodeclarados; o padrão exclui essa seção.
- Endpoints de avaliação, início da Adaptação, catálogo e diário permanecem os documentados nos respectivos guias.

O adapter Angular traduz o transporte real para apresentação; não calcula elegibilidade, nutrição persistida, IMC, TMB, participação ou concessão de conquistas. Cada semana recebe dias civis e indicadores reais do backend. Erros:401 identidade inválida/ausente;403 e-mail não confirmado;404 plano próprio inexistente;400 query inválida;422 relatório ainda indisponível;503 infraestrutura indisponível. Erros não são apresentados como histórico vazio bem-sucedido.

## Tempo e participação

ClockService injetável é a autoridade temporal. Plano mantém seu fuso IANA e30 datas civis. Dia1:0% do tempo concluído; Dia30:96,7%; depois de encerrar o Dia30 (Dia31):100% e relatório disponível. Não se contam blocos arbitrários de24h. Períodos:1–7,8–14,15–21,22–28,29–30; registros fora do ciclo ou em datas futuras ao relógio da API não geram progresso atual nem conquistas.

Participação conta datas distintas com refeições, água, atividades ou peso; várias entradas na mesma data não viram vários dias. Tempo transcorrido não prova participação. Dias vazios não significam ingestão zero, jejum, falha ou exercício concluído.

Conquistas são derivadas dos registros existentes: primeiro registro, primeira refeição, primeira atividade, primeira pesagem,7 e14 datas distintas; uma conquista separada identifica somente encerramento temporal. Não há recompensa por emagrecimento, restrição energética ou uma alegada liberação clínica. Excluir registros pode alterar os critérios derivados. `unlockedAt` fornece a data civil de referência do critério (e a data civil posterior ao Dia30 para encerramento), sem inventar timestamp de concessão persistida.

## Pesagens, fórmulas e limitações

O gráfico utiliza somente pesagens reais do diário e preserva a distância temporal entre datas, sem preencher dias ausentes. Peso declarado da avaliação aparece separado. Com menos de duas pesagens não há delta. Com duas ou mais, delta=última−primeira pesagem do diário, sem arredondar antes da apresentação.

IMC=peso/altura² (altura em metros), com classificação e limitações do módulo assessment. TMB usa Mifflin-St Jeor:10×kg+6,25×cm−5×idade, somando5 para sexo masculino ou subtraindo161 para feminino. Sexo indisponível/dados essenciais ausentes impedem o cálculo correspondente. Idade é calculada na data civil da pesagem. Altura/sexo/peso declarado e indicadores iniciais usam a revisão que iniciou o plano, preservada no snapshot da Avaliação Inicial, mesmo após alterações posteriores. A avaliação histórica não é reescrita pelas pesagens.

Esses valores são estimativas de referência; não constituem diagnóstico, prescrição ou precisão clínica comprovada. Não há GET recalculado ou meta calórica numérica nova neste checkpoint. Oscilações na balança não comprovam perda de gordura. Questionário sem alertas não comprova saúde nem libera modalidades.

Resumos nutricionais somam apenas os valores conhecidos dos snapshots existentes. Energia inteiramente desconhecida permanece null; zero legítimo permanece zero. Dados incompletos e períodos sem refeições são identificados; não se produzem médias com dias vazios. A soma preserva precisão; PDF e UI arredondam somente ao exibir.

## PDF e privacidade

Gerado em memória no backend, sem URL pública, armazenamento permanente ou cache público. Requer token Firebase validado, e-mail confirmado e UID do proprietário. Download e progresso usam Cache-Control no-store. Não confiar em UID enviado pelo navegador.

Relatório inclui período/fuso/emissão, participação, valores iniciais, cinco períodos semanais, histórico de peso, conquistas e limitações. Informações clínicas opcionais ficam excluídas por padrão e exigem checkbox explícito em cada tela; nenhuma preferência clínica é gravada no localStorage. Um PDF baixado continua sendo arquivo pessoal sensível: o proprietário decide seu compartilhamento.

Tabelas quebram textos, mantêm margens e repetem cabeçalhos nas novas páginas. Acentuação portuguesa e versões padrão/com dados opcionais são verificadas com relatórios temporários, parsing, renderização e inspeção visual. Nome do perfil vem de firstName/lastName; detalhes corporais iniciais vêm da revisão histórica, não de um formulário alterado posteriormente.

## Catálogo: esclarecimento da divergência154 ×3

A planilha TACO oficial contém composição por100g, não266 equivalências domésticas prontas. O arquivo entregue em `7791032` tinha597 alimentos,154 com medidas e266 equivalências. Ele citava genericamente IBGE/POF, sem associação documental suficiente alimento/preparo/gramas. Por exemplo, arroz integral tinha colher25g e concha130g; as referências verificadas do IBGE utilizadas no checkpoint7C indicam20g e117g. Feijão preto tinha concha86g; a medida documentada mantida é concha média cheia140g.

No checkpoint7C (`c185f0f`), somente nove equivalências verificadas foram preservadas: três para cada arroz integral cozido, arroz tipo1 cozido e feijão preto cozido. Não se afirma que a publicação inteira do IBGE só contém nove medidas: a cobertura verificada e incorporada ao aplicativo é essa. Os outros594 alimentos usam gramas. Consulte [fontes e nove conversões](diary.md).

Conferência8C: arquivo atual597/3/9; importação Emulator597/3/9; Firestore Cloud DEV597/3/9, com as equivalências comparadas individualmente ao arquivo; API paginada597/3/9; UI utiliza exclusivamente os arrays retornados, oferecendo três opções para o feijão verificado e nenhuma equivalência inventada. Não houve reimportação Cloud, alteração de alimentos oficiais ou restauração das266 entradas anteriores.

## Execução e testes

Da raiz, `npm ci`; `npm run dev:cloud` inicia Angular4200 e Nest3100 com a configuração DEV/ADC externa existente. Separados: `npm run dev:frontend:cloud` e `npm run dev:backend:cloud`. Modo local: `npm run dev:emulator`, com Auth9099/Firestore8080. Não misturar tokens ou bases dos dois modos. Verifique as portas e preserve sessões alheias.

`npm run validate` executa formatação, lint, tipos, unitários, HTTP isolado, builds, smoke responsivo e regressão completa com emuladores. Requer Java21+ e Chromium já preparados. Integrações usam4201/3105, smoke4203/3105; não encerram processos desconhecidos. Relógio controlado existe somente no bootstrap de teste demo e na injeção de testes; não é habilitado no Cloud/produção nem modifica o relógio do Windows.

`npm run test:cloud`, com FIREBASE_ALLOW_CLOUD_TEST=true e ADC/configuração DEV, exige lista explícita contendo apenas queimando-gordura-783e4, sem emuladores e sem NODE_ENV=production. Testes reais usam identidades descartáveis e removem exclusivamente documentos/subcoleções e contas criados por eles. Não apagam coleções oficiais ou dados de terceiros.

Neste checkpoint, duas integrações API/SDK no Cloud DEV validaram autenticação e diário/progresso com persistência real, consulta repetida, catálogo, privacidade e limpeza. O plano Cloud permaneceu no Dia1; PDF final e passagem de30 dias foram testados em emuladores, sem adulterar documentos ou relógios da nuvem. Mocks dos testes unitários/HTTP não substituem essas integrações.

## Pendências para lançamento

Teste manual do proprietário no localhost, validação clínica das políticas, consentimento/privacidade/retenção/exportação/exclusão e ampliação documental de medidas caseiras. Entrega real de e-mail e Google pessoal mantêm suas verificações interativas. Nenhum deploy de produção ou Foco Total foi iniciado. GitHub Actions continua bloqueado por cobrança externa, com workflow preservado.
