import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEARNED_CATEGORIES_KEY = '@mlc_offline:learned_categories';

export const STANDARD_CATEGORIES = [
  'Mercearia',
  'Hortifruti',
  'Frios e Laticínios',
  'Açougue',
  'Padaria',
  'Bebidas',
  'Limpeza',
  'Higiene Pessoal',
  'Farmácia',
  'Medicamentos',
  'Outros',
];

const LEGACY_CATEGORY_MAP = {
  higiene: 'Higiene Pessoal',
  'higiene pessoal': 'Higiene Pessoal',
  laticinios: 'Frios e Laticínios',
  'frios e laticinios': 'Frios e Laticínios',
  frios: 'Frios e Laticínios',
  carnes: 'Açougue',
  acougue: 'Açougue',
  farmacia: 'Farmácia',
  medicamentos: 'Medicamentos',
  remedios: 'Medicamentos',
  mercearia: 'Mercearia',
  hortifruti: 'Hortifruti',
  padaria: 'Padaria',
  bebidas: 'Bebidas',
  limpeza: 'Limpeza',
  outros: 'Outros',
};

export const CATEGORY_META = {
  Mercearia: {
    icon: 'basket-shopping',
    color: '#2563EB',
    softBg: 'rgba(37, 99, 235, 0.13)',
  },
  Hortifruti: {
    icon: 'apple-whole',
    color: '#16A34A',
    softBg: 'rgba(22, 163, 74, 0.13)',
  },
  'Frios e Laticínios': {
    icon: 'cheese',
    color: '#D97706',
    softBg: 'rgba(217, 119, 6, 0.14)',
  },
  'Laticínios': {
    icon: 'cheese',
    color: '#D97706',
    softBg: 'rgba(217, 119, 6, 0.14)',
  },
  'Açougue': {
    icon: 'drumstick-bite',
    color: '#DC2626',
    softBg: 'rgba(220, 38, 38, 0.13)',
  },
  Carnes: {
    icon: 'drumstick-bite',
    color: '#DC2626',
    softBg: 'rgba(220, 38, 38, 0.13)',
  },
  Padaria: {
    icon: 'bread-slice',
    color: '#B45309',
    softBg: 'rgba(180, 83, 9, 0.14)',
  },
  Bebidas: {
    icon: 'wine-bottle',
    color: '#0891B2',
    softBg: 'rgba(8, 145, 178, 0.14)',
  },
  Limpeza: {
    icon: 'broom',
    color: '#7C3AED',
    softBg: 'rgba(124, 58, 237, 0.13)',
  },
  'Higiene Pessoal': {
    icon: 'pump-soap',
    color: '#DB2777',
    softBg: 'rgba(219, 39, 119, 0.13)',
  },
  Higiene: {
    icon: 'pump-soap',
    color: '#DB2777',
    softBg: 'rgba(219, 39, 119, 0.13)',
  },
  'Farmácia': {
    icon: 'kit-medical',
    color: '#0D9488',
    softBg: 'rgba(13, 148, 136, 0.14)',
  },
  Medicamentos: {
    icon: 'pills',
    color: '#E11D48',
    softBg: 'rgba(225, 29, 72, 0.13)',
  },
  Outros: {
    icon: 'box-open',
    color: '#64748B',
    softBg: 'rgba(100, 116, 139, 0.14)',
  },
};

export function normalizeTextKey(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCategoryName(category) {
  if (!category) return 'Outros';
  const raw = String(category).trim();
  if (STANDARD_CATEGORIES.includes(raw)) return raw;
  const key = normalizeTextKey(raw);
  return LEGACY_CATEGORY_MAP[key] || 'Outros';
}

export function getCategoryMeta(category) {
  const normalized = normalizeCategoryName(category);
  return CATEGORY_META[normalized] || CATEGORY_META.Outros;
}

// Comprehensive ~420-keyword supermarket & pharmacy dictionary (accent-insensitive)
const RAW_CATEGORY_KEYWORDS = {
  Medicamentos: [
    'dipirona',
    'paracetamol',
    'ibuprofeno',
    'dorflex',
    'neosaldina',
    'vitamina',
    'vitamina c',
    'vitamina d',
    'multivitaminico',
    'xarope',
    'omeprazol',
    'pantoprazol',
    'antialergico',
    'loratadina',
    'desloratadina',
    'allegra',
    'polaramine',
    'amoxicilina',
    'azitromicina',
    'antibiotico',
    'anti-inflamatorio',
    'antiinflamatorio',
    'nimesulida',
    'cetoprofeno',
    'diclofenaco',
    'prednisona',
    'prednisolona',
    'dexametasona',
    'buscopan',
    'luftal',
    'simeticona',
    'dramin',
    'eno',
    'sal de fruta',
    'estomazil',
    'epocler',
    'engov',
    'aspirina',
    'aas',
    'benegrip',
    'cimegripe',
    'resfenol',
    'vick',
    'strepsils',
    'pastilha garganta',
    'colirio',
    'lacrima',
    'neosoro',
    'rinossoro',
    'sorine',
    'naridrin',
    'losartana',
    'atenolol',
    'captopril',
    'hidroclorotiazida',
    'metformina',
    'glifage',
    'insulina',
    'sinvastatina',
    'rosuvastatina',
    'levotiroxina',
    'puran',
    'clonazepam',
    'rivotril',
    'sertralina',
    'fluoxetina',
    'escitalopram',
    'melatonina',
    'pomada antibiotica',
    'nebacimed',
    'nebacetin',
    'bepantol',
    'hipoglos',
    'nistatina',
    'cetoconazol',
    'fluconazol',
    'albendazol',
    'annita',
    'enterogermina',
    'floratil',
    'probiotico',
    'remedio',
    'comprimido',
    'capsula',
    'analgesico',
    'antitermico',
    'antigripal',
    'relaxante muscular',
    'torsilax',
    'mioflex',
    'salonpas',
  ],
  'Farmácia': [
    'curativo',
    'band-aid',
    'bandaid',
    'band aid',
    'algodao',
    'soro fisiologico',
    'gaze',
    'compressa de gaze',
    'esparadrapo',
    'micropore',
    'fita microporosa',
    'termometro',
    'oximetro',
    'aparelho de pressao',
    'fralda',
    'fralda descartavel',
    'fralda infantil',
    'fralda geriatrica',
    'lenco umedecido',
    'lencos umedecidos',
    'teste de gravidez',
    'teste covid',
    'autoteste',
    'seringa',
    'agulha',
    'luva descartavel',
    'mascara descartavel',
    'agua oxigenada',
    'merthiolate',
    'antisseptico',
    'alcool 70',
    'alcool em gel',
    'repelente',
    'off repelente',
    'exposis',
    'suplemento',
    'whey protein',
    'creatina',
    'colageno',
    'omega 3',
    'barra de proteina',
    'atadura',
    'faixa elastica',
    'joelheira',
    'toboqueira',
    'bolsa termica',
    'inalador',
    'nebulizador',
    'pilha aparelho',
    'preservativo',
    'camisinha',
    'lubrificante intimo',
    'chupeta',
    'mamadeira',
    'pomada assadura',
  ],
  'Higiene Pessoal': [
    'sabonete',
    'sabonete liquido',
    'sabonete intimo',
    'shampoo',
    'xampu',
    'condicionador',
    'mascara capilar',
    'creme de pentear',
    'creme para pentear',
    'tintura cabelo',
    'gel fixador',
    'creme dental',
    'pasta de dente',
    'escova de dente',
    'escova dental',
    'fio dental',
    'enxaguante bucal',
    'antisseptico bucal',
    'listerine',
    'colgate',
    'oral-b',
    'sensodyne',
    'desodorante',
    'antitranspirante',
    'rexona',
    'dove',
    'nivea',
    'papel higienico',
    'absorvente',
    'protetor diario',
    'absorvente interno',
    'ob',
    'intimus',
    'always',
    'protetor solar',
    'bloqueador solar',
    'hidratante',
    'creme hidratante',
    'locao hidratante',
    'oleo corporal',
    'cotonete',
    'hastes flexiveis',
    'aparelho de barbear',
    'gilete',
    'gillette',
    'lamina de barbear',
    'espuma de barbear',
    'creme de barbear',
    'pos barba',
    'cera depilatoria',
    'creme depilatorio',
    'esmalte',
    'acetona',
    'removedor de esmalte',
    'lixa de unha',
    'cortador de unha',
    'perfume',
    'colonia',
    'talco',
    'talco antisseptico',
    'lenço de papel',
    'lenco de papel',
    'saboneteira',
    'bucha vegetal',
    'esponja de banho',
  ],
  Hortifruti: [
    'cenoura',
    'batata',
    'batata doce',
    'batata inglesa',
    'banana',
    'banana prata',
    'banana nanica',
    'tomate',
    'tomate cereja',
    'cebola',
    'cebola roxa',
    'maca',
    'alface',
    'rucula',
    'agriao',
    'couve',
    'couve-flor',
    'brocolis',
    'repolho',
    'espinafre',
    'acelga',
    'alho',
    'alho poro',
    'laranja',
    'limao',
    'tangerina',
    'mexerica',
    'pokan',
    'uva',
    'morango',
    'mamao',
    'melancia',
    'melao',
    'abacaxi',
    'manga',
    'abacate',
    'pera',
    'pessego',
    'ameixa',
    'kiwi',
    'maracuja',
    'goiaba',
    'caju',
    'acerola',
    'coco verde',
    'abobora',
    'abobrinha',
    'berinjela',
    'chuchu',
    'pepino',
    'pimentao',
    'quiabo',
    'vagem',
    'beterraba',
    'mandioca',
    'aipim',
    'macaxeira',
    'inhame',
    'cara',
    'rabanete',
    'nabo',
    'gengibre',
    'hortela',
    'coentro',
    'salsinha',
    'cebolinha',
    'cheiro verde',
    'cheiro-verde',
    'manjericao',
    'alecrim',
    'milho verde',
    'cogumelo',
    'shimeji',
    'champignon',
    'ovos',
    'ovo',
    'duzia de ovos',
    'fruta',
    'verdura',
    'legume',
  ],
  'Frios e Laticínios': [
    'leite',
    'leite integral',
    'leite desnatado',
    'leite semidesnatado',
    'leite zero lactose',
    'leite em po',
    'ninho',
    'queijo',
    'mussarela',
    'mucarela',
    'queijo prato',
    'queijo minas',
    'queijo coalho',
    'parmesao',
    'queijo ralado',
    'provolone',
    'gorgonzola',
    'ricota',
    'cottage',
    'cream cheese',
    'requeijao',
    'catupiry',
    'manteiga',
    'margarina',
    'qualy',
    'doriana',
    'iogurte',
    'danone',
    'yakult',
    'leite fermentado',
    'bebida lactea',
    'achocolatado pronto',
    'toddynho',
    'creme de leite',
    'leite condensado',
    'chantilly',
    'nata',
    'presunto',
    'apresuntado',
    'peito de peru',
    'blanquet',
    'mortadela',
    'salame',
    'salsicha',
    'linguica calabresa',
    'bacon fatiado',
    'massa de pastel',
    'massa fresca',
    'nhoque',
    'lasanha congelada',
    'pizza congelada',
    'pao de queijo congelado',
    'nuggets',
    'hamburguer congelado',
    'sorvete',
    'acai',
  ],
  'Açougue': [
    'carne',
    'carne moida',
    'carne bovina',
    'alcatra',
    'patinho',
    'acem',
    'coxao mole',
    'coxao duro',
    'picanha',
    'contra file',
    'contra-file',
    'contrafile',
    'file mignon',
    'maminha',
    'fraldinha',
    'cupim',
    'costela',
    'musculo',
    'lagarto',
    'paleta',
    'bife',
    'figado',
    'bucho',
    'dobradinha',
    'frango',
    'peito de frango',
    'file de frango',
    'file de peito',
    'coxa',
    'sobrecoxa',
    'asa de frango',
    'tulipa',
    'coracao de frango',
    'frango inteiro',
    'carne suina',
    'porco',
    'bisteca',
    'lombo',
    'pernil',
    'costelinha suina',
    'panceta',
    'toucinho',
    'bacon',
    'linguica',
    'linguica toscana',
    'linguica de frango',
    'paio',
    'carne seca',
    'charque',
    'jerked beef',
    'carne de sol',
    'peixe',
    'tilapia',
    'file de tilapia',
    'salmao',
    'merluza',
    'bacalhau',
    'sardinha fresca',
    'camarao',
    'lula',
    'marisco',
  ],
  Padaria: [
    'pao',
    'pao frances',
    'pao de forma',
    'pao integral',
    'pao de queijo',
    'pao de cachorro quente',
    'pao de hamburguer',
    'pao sirio',
    'bisnaguinha',
    'baguete',
    'ciabatta',
    'croissant',
    'torrada',
    'bolo',
    'bolo pronto',
    'rosca',
    'sonho',
    'panetone',
    'chocotone',
    'pao doce',
    'broa',
    'torta',
    'salgado',
    'coxinha',
    'empada',
    'esfiha',
    'quiche',
    'rap10',
    'tortilha',
  ],
  Bebidas: [
    'agua',
    'agua mineral',
    'agua com gas',
    'agua de coco',
    'refrigerante',
    'coca-cola',
    'coca cola',
    'guarana',
    'fanta',
    'sprite',
    'pepsi',
    'soda',
    'agua tonica',
    'suco',
    'suco de uva',
    'suco de laranja',
    'nectar',
    'suco em po',
    'tang',
    'clight',
    'energetico',
    'red bull',
    'monster',
    'isotonico',
    'gatorade',
    'cha gelado',
    'matte leao',
    'cerveja',
    'heineken',
    'brahma',
    'skol',
    'antarctica',
    'amstel',
    'stella artois',
    'budweiser',
    'corona',
    'spaten',
    'vinho',
    'vinho tinto',
    'vinho branco',
    'espumante',
    'champagne',
    'whisky',
    'vodka',
    'gin',
    'cachaca',
    'licor',
  ],
  Limpeza: [
    'detergente',
    'ype',
    'limpol',
    'minuano',
    'sabao',
    'sabao em po',
    'sabao liquido',
    'sabao em barra',
    'sabao de coco',
    'omo',
    'tixan',
    'brilhante',
    'ariel',
    'downy',
    'comfort',
    'amaciante',
    'agua sanitaria',
    'candida',
    'qboa',
    'cloro',
    'alvejante',
    'vanish',
    'desinfetante',
    'pinho sol',
    'veja',
    'multiuso',
    'limpador',
    'limpa vidro',
    'limpa aluminio',
    'desengordurante',
    'cif',
    'sapolio',
    'lustra moveis',
    'cera para piso',
    'esponja',
    'esponja de louca',
    'scotch-brite',
    'palha de aco',
    'bombril',
    'assolan',
    'pano de chao',
    'pano multiuso',
    'perfex',
    'flanela',
    'vassoura',
    'rodo',
    'pa de lixo',
    'balde',
    'escova de limpeza',
    'saco de lixo',
    'luva de limpeza',
    'pedra sanitaria',
    'pato purific',
    'harpic',
    'odorizador',
    'bom ar',
    'glade',
    'inseticida',
    'sbp',
    'raid',
    'baygon',
    'naftalina',
    'prendedor de roupa',
  ],
  Mercearia: [
    'arroz',
    'arroz branco',
    'arroz parboilizado',
    'arroz integral',
    'feijao',
    'feijao carioca',
    'feijao preto',
    'feijao fradinho',
    'lentilha',
    'grao de bico',
    'ervilha',
    'milho de pipoca',
    'pipoca',
    'acucar',
    'acucar refinado',
    'acucar cristal',
    'acucar mascavo',
    'acucar demerara',
    'adocante',
    'sal',
    'sal grosso',
    'cafe',
    'cafe em po',
    'cafe soluvel',
    'capsula de cafe',
    'filtro de cafe',
    'cha',
    'cha de camomila',
    'cha mate',
    'macarrao',
    'espaguete',
    'parafuso',
    'penne',
    'miojo',
    'lamen',
    'massa para lasanha',
    'oleo',
    'oleo de soja',
    'oleo de girassol',
    'oleo de milho',
    'oleo de canola',
    'azeite',
    'azeite de oliva',
    'vinagre',
    'farinha',
    'farinha de trigo',
    'farinha de mandioca',
    'farinha de rosca',
    'farinha panko',
    'farofa',
    'fuba',
    'amido de milho',
    'maizena',
    'polvilho',
    'tapioca',
    'aveia',
    'granola',
    'cereal',
    'sucrilhos',
    'achocolatado',
    'nescau',
    'toddy',
    'chocolate em po',
    'cacau em po',
    'fermento',
    'bicarbonato',
    'gelatina',
    'pudim',
    'mistura para bolo',
    'leite de coco',
    'coco ralado',
    'molho de tomate',
    'extrato de tomate',
    'passata',
    'ketchup',
    'catchup',
    'mostarda',
    'maionese',
    'hellmanns',
    'molho ingles',
    'molho shoyu',
    'shoyu',
    'molho de pimenta',
    'azeitona',
    'palmito',
    'milho em conserva',
    'seleta de legumes',
    'atum',
    'atum ralado',
    'sardinha em lata',
    'caldo knorr',
    'tempero',
    'oregano',
    'pimenta do reino',
    'colorau',
    'paprica',
    'cominho',
    'canela',
    'cravo',
    'louro',
    'biscoito',
    'bolacha',
    'biscoito recheado',
    'cream cracker',
    'agua e sal',
    'wafer',
    'cookies',
    'salgadinho',
    'batata palha',
    'amendoim',
    'castanha',
    'nozes',
    'chocolate',
    'barra de chocolate',
    'bombom',
    'bala',
    'chiclete',
    'doce de leite',
    'goiabada',
    'geleia',
    'mel',
    'pasta de amendoim',
    'nutella',
    'papel aluminio',
    'filme pvc',
    'papel toalha',
    'guardanapo',
    'palito de dente',
    'fosforo',
    'vela',
    'carvao',
    'racao',
    'petisco pet',
    'areia de gato',
  ],
};

// Pre-build normalized phrase and word index sorted by length descending (longest match first)
const BUILTIN_ENTRIES = [];
for (const [category, keywords] of Object.entries(RAW_CATEGORY_KEYWORDS)) {
  for (const kw of keywords) {
    const norm = normalizeTextKey(kw);
    if (norm) {
      BUILTIN_ENTRIES.push({
        keyword: norm,
        category,
        wordCount: norm.split(' ').length,
        length: norm.length,
      });
    }
  }
}
BUILTIN_ENTRIES.sort((a, b) => b.length - a.length);

let learnedCache = {};
let isLearnedLoaded = false;

export async function loadLearnedCategories() {
  try {
    const raw = await AsyncStorage.getItem(LEARNED_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        learnedCache = parsed;
      }
    }
    isLearnedLoaded = true;
  } catch {
    isLearnedLoaded = true;
  }
  return learnedCache;
}

export function matchBuiltinDictionary(productName) {
  const norm = normalizeTextKey(productName);
  if (!norm || norm.length < 2) return null;

  const padded = ` ${norm} `;

  // 1. Exact or whole-phrase boundary match from longest keyword to shortest
  for (const entry of BUILTIN_ENTRIES) {
    if (padded.includes(` ${entry.keyword} `)) {
      return entry.category;
    }
  }

  // 2. Singular/plural stem prefix check on words >= 4 chars
  const tokens = norm.split(' ').filter((t) => t.length >= 4 && !/^\d/.test(t));
  for (const token of tokens) {
    const singular = token.endsWith('s') ? token.slice(0, -1) : token;
    for (const entry of BUILTIN_ENTRIES) {
      if (
        entry.wordCount === 1 &&
        (entry.keyword === singular ||
          (singular.length >= 5 && entry.keyword.startsWith(singular)))
      ) {
        return entry.category;
      }
    }
  }

  return null;
}

export function inferCategorySmart(productName) {
  const norm = normalizeTextKey(productName);
  if (!norm || norm.length < 2) return null;

  // Strip measure suffixes like 500ml, 1kg, 200g for cleaner matching
  const cleanNorm = norm
    .replace(/\b\d+\s*(ml|l|lt|kg|g|gr|mg|un|pct|cx)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Check user-learned associations first
  if (cleanNorm && learnedCache[cleanNorm]) {
    return normalizeCategoryName(learnedCache[cleanNorm]);
  }
  if (learnedCache[norm]) {
    return normalizeCategoryName(learnedCache[norm]);
  }

  // Check learned tokens
  const tokens = (cleanNorm || norm)
    .split(' ')
    .filter((t) => t.length >= 3 && !/^\d/.test(t));
  for (const token of tokens) {
    if (learnedCache[token]) {
      return normalizeCategoryName(learnedCache[token]);
    }
  }

  // 2. Check built-in 420+ keyword dictionary
  const builtin =
    matchBuiltinDictionary(cleanNorm) || matchBuiltinDictionary(norm);
  if (builtin) {
    return builtin;
  }

  return null;
}

export async function learnCategoryAssociation(productName, chosenCategory) {
  const normalizedCat = normalizeCategoryName(chosenCategory);
  if (!productName || !normalizedCat || normalizedCat === 'Outros') {
    return;
  }

  if (!isLearnedLoaded) {
    await loadLearnedCategories();
  }

  const builtinMatch = matchBuiltinDictionary(productName);
  if (builtinMatch === normalizedCat) {
    // Already known in built-in dictionary with the same category
    return;
  }

  const norm = normalizeTextKey(productName)
    .replace(/\b\d+\s*(ml|l|lt|kg|g|gr|mg|un|pct|cx)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!norm || norm.length < 3) return;

  const nextCache = { ...learnedCache, [norm]: normalizedCat };
  const firstWord = norm.split(' ')[0];
  if (
    firstWord &&
    firstWord.length >= 4 &&
    !/^\d/.test(firstWord) &&
    !matchBuiltinDictionary(firstWord)
  ) {
    nextCache[firstWord] = normalizedCat;
  }

  learnedCache = nextCache;
  try {
    await AsyncStorage.setItem(
      LEARNED_CATEGORIES_KEY,
      JSON.stringify(nextCache)
    );
  } catch {
    // Ignore storage write errors
  }
}
