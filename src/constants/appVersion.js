export const APP_VERSION = '1.0.7';
export const APP_BUILD_TAG = '2026.11.24-voice-minimal';

/**
 * Histórico de atualizações (mais recente no topo).
 * Para futuras versões (1.0.8, 1.1.0, etc.), basta adicionar uma nova entrada no início do array.
 */
export const APP_CHANGELOG = [
  {
    version: '1.0.7',
    date: '24/11/2026',
    title: 'Microfone Minimalista Interno e Proteção para Expo Go',
    highlights: [
      'Botão de microfone redesenhado como ícone minimalista translúcido integrado na borda direita interna do campo "Nome do produto", mantendo largura total para digitação.',
      'Blindagem do módulo nativo de reconhecimento de voz em voiceInputService.js para evitar erros no Expo Go e exibir aviso amigável em PT-BR.',
    ],
  },
  {
    version: '1.0.6',
    date: '23/11/2026',
    title: 'Ditado por Voz no Campo Nome do Produto',
    highlights: [
      'Adicionado botão de microfone exclusivo ao lado do campo "Nome do produto" no formulário de itens (adição manual, edição e conferência pós-câmera) com reconhecimento de voz em português (pt-BR).',
      'Feedback visual pulsante ("Ouvindo... fale o nome do produto"), transcrição parcial em tempo real, capitalização automática e sugestão inteligente de categoria após o ditado.',
      'Fallback gracioso em PT-BR quando executado em ambientes sem módulo nativo de voz (como Expo Go) e encerramento automático do microfone ao fechar o modal.',
    ],
  },
  {
    version: '1.0.5',
    date: '23/11/2026',
    title: 'Automação de Build e Download Versionado do APK',
    highlights: [
      'Adicionado o script multiplataforma "npm run build:apk" (scripts/build-apk.js) para gerar o APK preview no EAS e salvá-lo automaticamente com o número da versão em builds/.',
      'Atualização do .gitignore (ignorando builds/ e *.apk) e da documentação técnica do projeto.',
    ],
  },
  {
    version: '1.0.4',
    date: '23/11/2026',
    title: 'Tema Material You e Refinamentos de Interface',
    highlights: [
      'Tema cartográfico minimalista renomeado para "Material You" ("Minimalista, cartográfico e com superfícies flutuantes"), mantendo migração transparente para quem já utilizava o tema salvo.',
      'Sincronização da versão 1.0.4 no aplicativo, documentação e registros de diagnóstico técnico.',
    ],
  },
  {
    version: '1.0.3',
    date: '23/11/2026',
    title: 'Novo Tema Google Maps (Minimalista e Cartográfico)',
    highlights: [
      'Adicionado o tema selecionável "Google Maps" em Configurações > Temas com paleta oficial cartográfica (#F1F3F4, #1A73E8, #1E8E3E, #F9AB00, #D93025).',
      'Geometria em pílula para botões, filtros e campos de busca, combinada com cartões brancos de elevação flutuante suave e divisores sutis (#E8EAED).',
      'Tipografia equilibrada com pesos 600, espaçamento sutil e dígitos tabulares (tabular-nums) nos valores de preços.',
    ],
  },
  {
    version: '1.0.2',
    date: '23/11/2026',
    title: 'Testador de API com Câmera EAN e Diagnóstico Organizado',
    highlights: [
      'Reorganização dos Logs de Diagnóstico em 4 subpartes visuais claras (Ambiente & Versão, Testador de API, Exportação & Manutenção e Histórico de Eventos).',
      'Novo testador de consulta na API Open Food Facts com entrada manual de EAN e leitura direta de código de barras pela câmera.',
      'Exibição detalhada de status HTTP, tempo de resposta, categoria sugerida e prévia estruturada dos dados retornados.',
    ],
  },
  {
    version: '1.0.1',
    date: '23/11/2026',
    title: 'OCR Geométrico, GS1 Brasil e Telemetria de Diagnóstico',
    highlights: [
      'OCR geométrico aprimorado com leitura de centavos sobrescritos em cartazes e etiquetas promocionais (DE / POR).',
      'Regras reforçadas para etiquetas de balança (priorizando TOTAL sobre R$/kg) e proteção contra leitura falsa do símbolo R$.',
      'Validação GS1 Brasil (prefixos 789/790 + Módulo-10) com retry automático e filtro de nomes numéricos da API.',
      'Telemetria anônima (LGPD) comparando preenchimento automático vs. edição manual no diagnóstico técnico.',
      'Exclusão total de dados em Configurações agora também limpa completamente logs de diagnóstico e cache de produtos.',
    ],
  },
  {
    version: '1.0.0',
    date: '15/11/2026',
    title: 'Lançamento Inicial 100% Offline-First',
    highlights: [
      'Gestão completa de listas de compras, orçamento em tempo real, lembretes reutilizáveis e resumo de gastos com gráficos.',
      'Câmera integrada com leitor de código de barras, recorte interativo de etiquetas, galeria compactada e backup completo (.zip e .json).',
      'Sistema multi-temas com geometria adaptativa e privacidade total sem servidores ou cadastro.',
    ],
  },
];
