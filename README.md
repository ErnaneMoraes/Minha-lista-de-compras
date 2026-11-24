# Minha Lista de Compras 🛒

Aplicativo móvel e web moderno, prático e **100% offline-first** para gerenciamento de listas de compras, listas de lembretes reutilizáveis e controle financeiro em tempo real no supermercado.

O aplicativo elimina a surpresa do valor total no caixa e dispensa cadastro, login ou conexão com a internet. Conta com **leitura inteligente de etiquetas de prateleira por câmera (OCR)** com recorte interativo, **categorização automática com aprendizado local**, **resumo visual de gastos** e **backup seletivo em `.json`** com suporte a "Abrir com..." no Android.

---

## 📌 Sumário
- [Problema que Resolve](#-problema-que-resolve)
- [Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [Leitura Inteligente de Etiquetas (OCR)](#-leitura-inteligente-de-etiquetas-ocr)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Geração de APK Android (Build & Download Automatizado)](#-geração-de-apk-android-build--download-automatizado)

---

## 💡 Problema que Resolve

Fazer compras com calculadora manual ou anotações em papel é demorado e propenso a erros. Além disso, muitos aplicativos exigem cadastro, dependem de internet ou exibem anúncios invasivos.

O **Minha Lista de Compras** resolve isso ao oferecer:
1. **Controle total de gastos em tempo real:** A cada produto adicionado, o total do carrinho é recalculado instantaneamente com alertas visuais de orçamento.
2. **Agilidade no registro:** Permite fotografar a etiqueta da gôndola, recortar com precisão e preencher preço e produto automaticamente — com escolha rápida caso haja múltiplos valores na etiqueta.
3. **Privacidade total (100% Offline):** Não possui servidores externos nem nuvem. Todos os dados ficam armazenados exclusivamente no aparelho do usuário, com portabilidade via arquivos `.json`.

---

## 🚀 Funcionalidades Implementadas

### 1. Gestão de Listas de Compras (`Minhas Compras`)
- **Criação, edição e exclusão** (individual ou em lote) de múltiplas listas de compras.
- **Orçamento opcional com alertas visuais:** Exibe avisos progressivos ao atingir 80% ou ultrapassar 100% do limite definido.
- **Filtros por status:** Abas rápidas para visualizar **Todas**, **Em aberto** ou **Finalizadas**.
- **Finalização e Reabertura:** Ao finalizar uma compra, ela fica protegida contra alterações acidentais e passa a compor o Resumo de Gastos; caso necessário, pode ser reaberta a qualquer momento com confirmação explícita.
- **Data customizável:** Exibe data no padrão brasileiro (`DD/MM/AAAA`), com opção de ajustar a data de referência.

### 2. Gerenciamento de Produtos na Lista
- **Barra de ação tripla no rodapé:** `[Lembretes]` | `[+ Adicionar Produto]` | `[Câmera]`.
- **Adição Manual:** Formulário completo com máscara monetária BRL (`R$ 0,00`), unidade de medida (`un`, `kg`, `pct`, `g`, `L`, `ml`, `cx`, `dz`), categoria e observação.
- **Categorização Automática Inteligente:** Dicionário local com mais de 420 palavras-chave (incluindo *Mercearia*, *Hortifruti*, *Frios e Laticínios*, *Açougue*, *Padaria*, *Bebidas*, *Limpeza*, *Higiene Pessoal*, *Farmácia*, *Medicamentos* e *Outros*) e **aprendizado local** que memoriza as categorias escolhidas pelo usuário.
- **Controle rápido de quantidade:** Botões `-` e `+` diretamente no card de cada produto, além de busca em tempo real e edição ao tocar no card.
- **Rodapé Fixo Totalizador:** Exibe permanentemente o valor total da compra, contagem de produtos/itens e status do orçamento.

### 3. Listas de Lembretes Reutilizáveis (`Lembretes`)
- **Listas temáticas:** Crie listas fixas como *"Compra do Mês"*, *"Farmácia"* ou *"Churrasco"* para reutilizar sempre que precisar.
- **Tela de detalhes padronizada:** Mesmo layout limpo das listas de compras, com cabeçalho verde, busca de itens, controle rápido de quantidade (`-` / `+` mínimo 1), edição ao toque e resumo total no rodapé.
- **Importação Inteligente para Compras:** Dentro de qualquer lista de compras, importe itens de qualquer lista de lembretes escolhendo entre **Tirar foto da etiqueta (OCR)** ou **Adicionar manualmente**, com rastreamento de itens já importados.

### 4. Resumo de Gastos (`Relatório`)
- **Filtros de período flexíveis:** **Mês atual**, **Selecionar mês** (seletor dedicado de mês/ano), **Últimos 3 meses**, **Últimos 6 meses**, **Últimos 12 meses** e **Período total**.
- **Gráficos interativos em SVG:** Alternância entre **Gráfico de Barras** (evolução financeira) e **Gráfico de Pizza** (distribuição detalhada por categoria com paleta de cores dedicada).
- **Indicadores financeiros:** Total gasto, média por compra e quantidade de compras finalizadas no período selecionado.

### 5. Fotos das Etiquetas Compactadas, Retenção e Galeria
- **Armazenamento Compactado Local:** Ao capturar uma etiqueta pela câmera/OCR (com salvamento ativado), o recorte é redimensionado (largura máx. `600px`) e salvo em JPEG leve (`compress: 0.65`, ~25–50 KB) em `tag_photos/`, guardando apenas a referência no item da lista.
- **Visualização Rápida nos Itens:** Produtos com foto exibem um ícone discreto de imagem no card e um botão **"Ver foto da etiqueta"** no modal de edição, abrindo visualização ampliável com detalhes do produto.
- **Política de Retenção Automática e Exclusão em Cascata:** Configurável no Onboarding inicial e em **Configurações > Fotos das Etiquetas**, com limpeza automática opcional após **30, 60, 90 ou 120 dias** e remoção automática dos arquivos `.jpg` quando o item ou a lista são excluídos.
- **Galeria de Etiquetas (`Configurações > Fotos das Etiquetas`):** Busca por nome do produto/lista, filtros por período (**Todas**, **Hoje**, **Últimos 7 dias**, **Últimos 30 dias**, **Selecionar mês**), visualização em tela cheia, seleção múltipla e exclusão em lote ou total com confirmação obrigatória (`ConfirmModal`).

### 6. Backup Compactado (`.zip` / `.json`), Exclusão Granular e Integração Android
- **4 Modos de Exportação:**
  - **Backup Completo (`.zip`):** Empacota `backup.json` (listas, histórico e lembretes) + todas as fotos das etiquetas em `etiquetas/*.jpg` usando `jszip`.
  - **Apenas Fotos das Etiquetas (`.zip`):** Exporta todas as fotos salvas junto a um `photos_manifest.json` com metadados dos produtos.
  - **Apenas Listas de Compras (`.json`)** e **Apenas Lembretes (`.json`):** Arquivos leves ideais para compartilhar listas rapidamente.
- **Importação Automática (`.zip` e `.json`) + Android "Abrir com...":** Detecta automaticamente o formato do arquivo (seja pelo seletor nas Configurações ou abrindo diretamente um `.zip` / `.json` no Android), restaura as imagens para `tag_photos/` e revincula os itens após confirmação.
- **Exclusão Granular (`Configurações > Excluir Dados`):** Permite apagar separadamente **Todas as Fotos das Etiquetas**, **Todas as Listas de Compras**, **Todas as Listas de Lembretes** ou **Todos os Dados do Aplicativo** (incluindo cache de produtos e logs de diagnóstico), sempre com `ConfirmModal` e botão de atalho **"Fazer Backup Antes"** nas exclusões em massa.

### 7. Experiência do Usuário, Multi-Temas, Onboarding e Documentação Interna
- **Configurações em Acordeões Recolhíveis:** Seções organizadas em acordeões (**Temas**, **Fotos das Etiquetas**, **Backup de Dados** e **Suporte e Informações**) que iniciam recolhidos para navegação limpa.
- **Sistema Multi-Temas com Geometria Adaptativa (8 temas + Personalizado):** Lista vertical com amostras bicolores e construtor completo do tema **Personalizado** (Modo Base, 12 cores principais, estilo das bordas e espessura do contorno):
  - **Claro Padrão** e **Noturno Padrão** (cantos suaves)
  - **AMOLED Escuro** (preto puro `#000000` com esmeralda)
  - **Rose Quartz** (tons suaves de rosa com cantos extra-arredondados)
  - **Azul Oceano** (azul gelo e oceano)
  - **Material You** (minimalista, cartográfico claro `#F1F3F4`, azul `#1A73E8`, botões/filtros em pílula, cartões brancos com superfícies flutuantes e preços tabulares)
  - **Neon Matrix** e **Cyberpunk Neon** (paletas neon de alto contraste com geometria reta/tech)
- **Onboarding Compacto e Revisitável:** Tela inicial de boas-vindas com cabeçalho enxuto, 4 guias práticos diretos ao ponto e configuração de fotos/retenção (persistida em `@mlc_offline:onboarding_completed`), podendo ser revista a qualquer momento pelo botão **"Rever Tela de Boas-Vindas (Onboarding)"** em **Configurações > Ajuda**.
- **Telas de Ajuda e Sobre (com Histórico de Atualizações):** Acessíveis em **Configurações**, oferecendo guia passo a passo (`Ajuda`) e informações de versão semântica (`v1.0.5`), **Histórico de Atualizações** centralizado (`src/constants/appVersion.js`), privacidade 100% offline e link do repositório oficial (`Sobre`).
- **Resiliência, Privacidade (LGPD) e Telemetria Local:** Proteção global com `<ErrorBoundary>`, logs técnicos locais anônimos em conformidade com a LGPD (com versão/build, registro de falhas e telemetria comparando preenchimento automático vs. editado manualmente, sem coleta de dados pessoais), otimização com `React.memo` e confirmações seguras via `ConfirmModal`.

---

## 🔍 Leitura Inteligente de Etiquetas (OCR)

O aplicativo utiliza uma pipeline otimizada para etiquetas de prateleira brasileiras:

1. **Câmera Integrada com Travamento de Código de Barras (EAN-13/EAN-8), Som Configurável e Auto-Enquadramento (`CameraCaptureModal.js`):**
   - Utiliza `CameraView` (`expo-camera`) em fluxo de 2 etapas sem pressa: ao apontar para um código de barras comercial (`ean13` ou `ean8`, validado por dígito verificador GS1 Módulo-10 e ignorando códigos de balança iniciados por `2`), o código fica **travado** na sessão (`Código lido: ...`) para o usuário poder afastar o celular e fotografar a etiqueta de preço inteira sem risco de sobrescrita acidental, com botão **`Recomeçar`** para limpar e ler outro código. Inclui ainda opção para silenciar o **Som da câmera ao fotografar** em **Configurações > Fotos das Etiquetas** e detecção automática dos limites da etiqueta no recorte interativo (`PanResponder`).
2. **Pré-processamento Adaptativo e Fallback para Etiquetas Amarelas (`NativeOcrBridge.native.js` / `labelOcr.native.js`):**
   - Normalização adaptativa de contraste com margem branca generosa (`48px`), upscaling mínimo de `1100px` e passada de fallback automática em escala de cinza limpa caso etiquetas amarelas recortadas rentes às bordas retornem pouco texto ou nenhum preço.
3. **Motor OCR Offline:**
   - **Web:** Execução direta via `tesseract.js`.
   - **Mobile (Android/iOS):** Ponte headless via `react-native-webview` com Tesseract.js embarcado.
4. **OCR Geométrico, Cartazes Promocionais e Etiquetas de Balança (`labelParser.js`):**
   - **Margem Superior Extra (`+12%`) e Normalização (`1000–1200px`):** Preserva títulos no topo da etiqueta e nitidez de centavos sobrescritos antes do OCR.
   - **Junção 2D de Centavos Sobrescritos:** Reúne reais em tipografia grande (`height >= 1.35x` mediana) com centavos sobrescritos à direita (`"9"` + `",49"` -> `9,49`; `"12"` + `",98"` -> `12,98`).
   - **Regras Promocionais e de Balança:** Exclui valores riscados ou secundários (`DE:`, `VALOR 100GR`, `VALOR KG`, `P/ NÃO COOPERADO`, `RS/kg`, `IBPT`, `TARA`, `PESO`), prioriza âncoras principais (`POR:`, `À VISTA`, `TOTAL`), protege contra leitura falsa de `R$` como dígito (`9` + `5,49` -> `5,49`) e descarta títulos ilegíveis retornando `""` limpo.
5. **Enriquecimento Híbrido Open Food Facts v2 (GS1 Brasil 789/790) + Cache Inteligente (`productLookupService.js`):**
   - **Fluxo 1 (GS1 Brasil 789/790 ou EAN-8 comercial + Módulo-10):** Aceita exclusivamente `EAN-13` brasileiro (`789`/`790`) ou `EAN-8` comercial lidos pela câmera nativa, com timeout de `6,5s` e 1 retry rápido (`1,5s`) apenas em erros transitórios de rede/5xx (nunca em `404`). Rejeita nomes numéricos/EAN vindos da API (ex.: `"7896045101641"`) preservando categoria/quantidade da API e revalida automaticamente categorias antigas no cache (`Outros`/`Hortifruti`).
   - **Sem EAN comercial ou etiquetas de balança (prefixo `2`):** Não realiza chamadas externas de busca textual, retornando imediatamente o resultado do OCR local (`origem: 'ocr_local'`) com filtro contra textos ilegíveis de moiré/reflexo (deixando o nome vazio para digitação limpa enquanto preserva o preço).
   - **Indicador Visual Discreto de Origem:** A miniatura da etiqueta no modal do produto exibe um ícone circular discreto no canto inferior esquerdo indicando a origem do preenchimento: **Globo** (Open Food Facts online), **Raio** (Cache Local sem rede) ou **Câmera** (Leitura Local por OCR).
   - **Baixo Consumo de Rede e Armazenamento:** Timeout de `6,5s` (`AbortController`), fallback 100% offline automático, cache local LRU ultracompacto limitado a `300` entradas (`< 25 KB`) e limpeza automática de arquivos temporários de OCR.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia / Pacote | Versão | Finalidade |
| :--- | :--- | :--- |
| **Expo** | `^58.0.0` | Plataforma, SDK e ferramental de desenvolvimento e build |
| **React Native** | `0.88.1` | Framework base multiplataforma (Android / iOS / Web) |
| **React** | `19.3.0` | Biblioteca de interface reativa |
| **@react-native-async-storage/async-storage** | `2.2.0` | Armazenamento local persistente (100% Offline-First) |
| **@react-navigation/native** / **stack** / **bottom-tabs** | `^7.x` | Navegação por pilha e abas inferiores |
| **expo-image-picker** / **expo-image-manipulator** | `~58.0.x` | Captura de fotos e recorte de etiquetas |
| **expo-file-system** / **expo-sharing** / **expo-document-picker** | `~58.0.x` | Exportação, compartilhamento e importação de backups `.json` |
| **react-native-svg** | `15.16.0` | Gráficos de barras e pizza no Resumo de Gastos |
| **react-native-webview** + **tesseract.js** | `14.0.1` / `^7.0.0` | Motor de Reconhecimento Óptico de Caracteres (OCR) |
| **@expo/vector-icons** (`FontAwesome6`) | `^15.0.2` | Ícones padronizados em toda a interface |

---

## 📁 Estrutura do Projeto

```text
Minha lista de compras/
├── App.js                                    # Raiz, navegação (Stack + Tabs), onboarding e deep link .json
├── app.json                                  # Configuração Expo, permissões, ícone adaptativo e intentFilters
├── package.json                              # Dependências (Expo SDK 58 / React Native 0.88)
├── components/
│   ├── common/
│   │   ├── Buttons/                          # Botões reutilizáveis (SaveButton, CancelButton, DeleteButton)
│   │   ├── ErrorBoundary.js                  # Tratamento global de erros de renderização com recuperação
│   │   ├── NativeOcrBridge.native.js         # Bridge OCR mobile (WebView)
│   │   └── NativeOcrBridge.web.js            # Bridge OCR web
│   ├── modals/
│   │   └── ShoppingModals/
│   │       ├── CameraCaptureModal.js         # Recorte interativo de foto da etiqueta
│   │       ├── ConfirmModal.js               # Modal padrão de confirmação
│   │       ├── ItemFormModal.js              # Formulário de produto/lembrete com máscara BRL
│   │       ├── ListFormModal.js              # Formulário de lista, orçamento e data
│   │       ├── OcrProgressModal.js           # Progresso visual da leitura OCR
│   │       ├── SettingsModal.js              # Configurações em acordeões (Temas, Fotos, Backup, Suporte)
│   │       └── TagPhotoPreviewModal.js       # Visualizador ampliável de fotos das etiquetas
│   └── StyleSheet/                           # Paleta e estilos globais
└── src/
    ├── context/
    │   └── AppSettingsContext.js             # Contexto global de temas, geometria e sincronização de dados
    ├── theme/
    │   └── themes.js                         # 8 temas com paletas de cores e tokens de geometria adaptativa
    ├── pages/
    │   ├── Listas/
    │   │   ├── ListasScreen.js               # Tela inicial: listas de compras, filtros e seleção em lote
    │   │   └── ListaDetalhesScreen.js        # Detalhes da compra: itens, OCR, lembretes e orçamento
    │   ├── Lembretes/
    │   │   ├── LembretesScreen.js            # Listagem de listas de lembretes reutilizáveis
    │   │   └── LembreteDetalhesScreen.js     # Detalhes padronizados da lista de lembretes
    │   ├── Onboarding/
    │   │   └── OnboardingScreen.js           # Fluxo guiado de boas-vindas no primeiro acesso
    │   ├── Settings/
    │   │   ├── AjudaScreen.js                # Guia passo a passo completo para usuários
    │   │   ├── GaleriaEtiquetasScreen.js     # Galeria de fotos das etiquetas com busca, filtros e exclusão
    │   │   └── SobreScreen.js                # Informações do app, privacidade 100% offline e GitHub
    │   └── RelatorioScreen.js                # Resumo de Gastos com gráficos (Barras/Pizza) e filtros
    ├── services/
    │   ├── backupArchiveService.js           # Exportação e importação de backups compactados (.zip e .json)
    │   ├── labelParser.js                    # Extração de preço(s), nome, unidade e EAN da etiqueta
    │   ├── productLookupService.js           # Enriquecimento híbrido Open Food Facts v2 + cache LRU
    │   ├── tagPreprocess.js                  # Pré-processamento de imagem da etiqueta
    │   ├── tagPhotoStorage.js                # Compactação, retenção, estatísticas e backup de fotos
    │   ├── labelOcr.native.js                # OCR para Android/iOS
    │   └── labelOcr.web.js                   # OCR para Web
    ├── storage/
    │   └── shoppingStorage.js                # Persistência AsyncStorage, backup seletivo e formatadores
    └── utils/
        └── categoryDictionary.js             # Dicionário local (+420 termos) e aprendizado de categorias
```

---

## 💻 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada: 18 ou superior)
- Gerenciador de pacotes `npm`
- Para testar no celular: aplicativo **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS](https://apps.apple.com/app/expo-go/id982107779))

### 1. Clonar o repositório e instalar as dependências
```bash
# Clone este repositório
git clone https://github.com/ErnaneMoraes/Minha-lista-de-compras.git

# Acesse a pasta do projeto
cd "Minha lista de compras"

# Instale as dependências
npm install
```

### 2. Executar no Smartphone via Expo Go
```bash
npx expo start
```
- Um QR Code será exibido no terminal.
- **Android:** Abra o app **Expo Go** e escaneie o código QR.
- **iOS:** Abra a **Câmera** e toque na notificação para abrir no Expo Go.

### 3. Executar no Navegador Web
```bash
npx expo start --web
# ou
npm run web
```

### 4. Executar em Emuladores
```bash
# Emulador Android
npx expo start --android

# Simulador iOS (requer macOS)
npx expo start --ios
```

---

## 📦 Geração de APK Android (Build & Download Automatizado)

O projeto inclui um script multiplataforma (`scripts/build-apk.js`) que lê automaticamente a versão atual em `app.json`, executa o build `preview` no EAS aguardando a conclusão e baixa o APK já renomeado na pasta local `builds/` (ignorada pelo Git):

```bash
# 1. Faça login na sua conta Expo (apenas na primeira vez)
npx eas-cli login

# 2. Gere e baixe automaticamente o APK versionado
npm run build:apk
```

Ao final do processo, o arquivo estará pronto em:

```text
builds/minha-lista-compras-v1.0.5.apk
```

> **Dica:** A pasta `builds/` e arquivos `*.apk` estão listados no `.gitignore` para evitar o versionamento acidental de binários no repositório.

---

## 📄 Licença

Este projeto está sob a licença [0BSD](LICENSE).
