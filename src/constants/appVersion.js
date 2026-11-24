export const APP_VERSION = '1.0.4';
export const APP_BUILD_TAG = '2026.11.23-material-you';

/**
 * Histórico de atualizações (mais recente no topo).
 * Para futuras versões (1.0.5, 1.1.0, etc.), basta adicionar uma nova entrada no início do array.
 */
export const APP_CHANGELOG = [
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
