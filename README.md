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
- [Geração de Build / APK](#-geração-de-build--apk)

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

### 5. Backup Seletivo, Compartilhamento e Integração Android
- **Exportação Seletiva em `.json`:** Escolha exportar **Tudo**, **Apenas Listas de Compras** ou **Apenas Lembretes** — ideal tanto para backup quanto para compartilhar uma lista com outra pessoa.
- **Importação com Detecção Automática:** Valida a estrutura do arquivo e restaura apenas o escopo contido no backup sem apagar o restante dos dados.
- **Integração nativa Android ("Abrir com..."):** Arquivos `.json` recebidos por mensageiros ou gerenciadores de arquivos podem ser abertos diretamente no aplicativo para importação imediata.

### 6. Experiência do Usuário, Multi-Temas, Onboarding e Documentação Interna
- **Sistema Multi-Temas com Geometria Adaptativa (7 temas):** Seletor visual em **Configurações** com pré-visualização em dois tons e troca instantânea de paleta de cores, arredondamento de cantos e espessura de bordas:
  - **Claro Padrão** e **Noturno Padrão** (cantos suaves)
  - **AMOLED Escuro** (preto puro `#000000` com esmeralda)
  - **Rose Quartz** (tons suaves de rosa com cantos extra-arredondados)
  - **Azul Oceano** (azul gelo e oceano)
  - **Neon Matrix** e **Cyberpunk Neon** (paletas neon de alto contraste com geometria reta/tech)
- **Onboarding de Primeiro Acesso:** Fluxo guiado em etapas na primeira abertura explicando os pilares do app (persistido em `@mlc_offline:onboarding_completed`).
- **Telas de Ajuda e Sobre:** Acessíveis em **Configurações**, oferecendo um guia passo a passo em linguagem simples para usuários leigos (`Ajuda`) e informações de versão, privacidade 100% offline e link do repositório oficial (`Sobre`).
- **Resiliência e Performance:** Proteção global com `<ErrorBoundary>` (tela amigável de recuperação sem perda de dados), otimização de renderização com `React.memo` nos itens das listas e confirmações seguras via `ConfirmModal`.

---

## 🔍 Leitura Inteligente de Etiquetas (OCR)

O aplicativo utiliza uma pipeline otimizada para etiquetas de prateleira brasileiras:

1. **Captura e Recorte Interativo (`CameraCaptureModal.js`):**
   - Captura via câmera nativa (`expo-image-picker`) seguida imediatamente pelo canvas interativo de recorte por gestos (`PanResponder`) já pré-posicionado na faixa central da etiqueta (captura parcial padrão).
2. **Pré-processamento (`tagPreprocess.js`):**
   - Normalização de contraste, binarização adaptativa e segmentação direcionada das áreas de título e preço.
3. **Motor OCR Offline:**
   - **Web:** Execução direta via `tesseract.js`.
   - **Mobile (Android/iOS):** Ponte headless via `react-native-webview` com Tesseract.js embarcado.
4. **Parser Inteligente e Múltiplos Preços (`labelParser.js`):**
   - Filtra ruídos como impostos (`IBPT`), códigos de barras e preços de referência fracionados.
   - Quando detecta mais de um valor na etiqueta (ex.: varejo e atacado), exibe um seletor rápido para o usuário escolher qual preço considerar antes de confirmar o produto.

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
│   │       └── SettingsModal.js              # Configurações (Multi-Temas, Backup, Ajuda e Sobre)
│   └── StyleSheet/                           # Paleta e estilos globais
└── src/
    ├── context/
    │   └── AppSettingsContext.js             # Contexto global de temas, geometria e sincronização de dados
    ├── theme/
    │   └── themes.js                         # 7 temas com paletas de cores e tokens de geometria adaptativa
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
    │   │   └── SobreScreen.js                # Informações do app, privacidade 100% offline e GitHub
    │   └── RelatorioScreen.js                # Resumo de Gastos com gráficos (Barras/Pizza) e filtros
    ├── services/
    │   ├── labelParser.js                    # Extração de preço(s), nome e unidade da etiqueta
    │   ├── tagPreprocess.js                  # Pré-processamento de imagem da etiqueta
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

## 📦 Geração de Build / APK

Para gerar um arquivo APK de testes ou build de produção via EAS:

```bash
# 1. Instalar o EAS CLI globalmente
npm install -g eas-cli

# 2. Fazer login na sua conta Expo
eas login

# 3. Gerar APK de preview para Android
eas build -p android --profile preview
```

---

## 📄 Licença

Este projeto está sob a licença [0BSD](LICENSE).
