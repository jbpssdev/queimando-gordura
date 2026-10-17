# Produto — Queimando Gordura 1.0

Autenticação, perfil básico, Avaliação Inicial, calendário organizacional da Adaptação e diário pessoal estão integrados até o checkpoint 7C. Recomendações de emagrecimento permanecem planejadas.

Público inicial: adultos de 18 anos ou mais que desejam emagrecer. Identidade clara, moderna, limpa, quase minimalista, com cores alegres equilibradas e foco em dados/resultados; sem aparência de academia, excesso de sombras, gradientes ou cartões decorativos.

Autenticação implementada: e-mail/senha e Google via Firebase Authentication; integração Cloud DEV de e-mail/senha validada no checkpoint 4; Google pessoal e recebimento de mensagens continuam pendentes. Cadastro com nome, sobrenome, e-mail e credenciais de autenticação geridas pelo Firebase; sem telefone obrigatório e sem armazenar senhas no Firestore.

Avaliação inicial implementada: informações corporais, rotina, atividade cotidiana, exercícios, objetivos e dados de saúde relevantes fornecidos voluntariamente. Primeiro módulo: **Adaptação**, com duração de **30 dias**.

Acompanhamento: diário básico de refeições, água, atividades e peso implementado no7C. Evoluções planejadas:

- Alimentação diária com alimentos e preparos detalhados, quantidades em gramas, calorias, macronutrientes e fibras.
- Musculação e cardio por intensidade e duração.
- Atualização semanal de peso e gráficos.
- Ajustes fundamentados das estimativas, preservando histórico e rastreabilidade.
- Relatório final em PDF.

Módulos posteriores: **Foco Total**, controle glicêmico, exames e sono. Não criar funcionalidades desses módulos sem novo escopo autorizado.

## Privacidade e limites

O produto tratará dados pessoais e dados de saúde sensíveis. O desenho futuro deve contemplar LGPD, minimização, consentimento e transparência, controle individual de acesso, exportação/exclusão, segurança, integridade e rastreabilidade. Bases legais, retenção e avisos serão definidos antes de coletar dados reais, com revisão especializada quando necessária; este documento registra requisitos, não certifica conformidade.

IMC e fórmulas metabólicas são estimativas, não diagnósticos individuais. Algoritmos não devem produzir prescrições médicas, sugerir exercícios de risco ou considerar dados clínicos autodeclarados como garantia de segurança. Limitações e incertezas devem ser claras, conforme as salvaguardas e os limites documentados em [Avaliação Inicial](assessment.md).
