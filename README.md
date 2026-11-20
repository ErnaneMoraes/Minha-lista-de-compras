# Minha Lista de Compras 🛒

Aplicativo móvel e web moderno, prático e **offline-first** para gerenciamento de listas de compras e controle financeiro em tempo real no supermercado. 

O aplicativo elimina a surpresa do valor total no caixa e a necessidade de contas ou conexão com a internet. Ele conta ainda com um sistema inteligente de **leitura de etiquetas de prateleira por câmera (OCR)**, capaz de identificar nome, preço e unidade de medida automaticamente.

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

Fazer compras de supermercado com calculadora manual ou anotações em papel é demorado, propenso a erros e cansativo. Além disso, muitos aplicativos exigem cadastro, login, internet e exibem anúncios intrusivos.

O **Minha Lista de Compras** resolve isso ao oferecer:
1. **Controle total de gastos em tempo real:** À medida que os produtos são colocados no carrinho físico, o total da compra é recalculado instantaneamente.
2. **Agilidade no registro:** Permite fotografar a etiqueta amarela de gôndola para preencher automaticamente nome e preço, sem digitação cansativa.
3. **Privacidade e autonomia (100% Offline):** Nenhum dado sai do aparelho. Não requer criação de conta nem conexão de rede para funcionar.

---

## 🚀 Funcionalidades Implementadas

### 1. Gestão de Listas (Tela Principal)
- **Criação, renomeação e exclusão** de múltiplas listas de compras.
- **Exibição organizada** com nome da lista, quantidade de itens e data de criação formatada no padrão brasileiro (`DD/MM/AAAA`).
- **Estado vazio amigável:** Tela de boas-vindas intuitiva no primeiro uso orientando a criação da primeira lista.
- **Botão de ação fixo:** Botão "+ Criar Nova Lista" sempre acessível no rodapé, sem depender de rolagem.

### 2. Gerenciamento de Produtos na Lista
- **Duas opções de inclusão:**
  - **Manual:** Formulário completo com nome do produto, preço unitário com máscara monetária em Real brasileiro (`R$ 0,00`), categoria, quantidade e descrição opcional.
  - **Câmera / OCR:** Botão rápido com ícone de câmera para captura ou seleção de foto da etiqueta da prateleira.
- **Seletor rápido de quantidade:** Botões `-` e `+` ao lado de cada produto para ajuste imediato:
  - Ao diminuir a quantidade para zero, o aplicativo solicita confirmação antes de remover o item.
- **Modal "Editar Item":** Toque em qualquer item da lista a qualquer momento para editar nome, preço, unidade (`un`, `kg`, `pct`, `cx`, etc.), categoria ou observações.
- **Rodapé Fixo com Totalizador:** Exibição destacada e permanente do **Valor Total da Compra (`R$ 0,00`)**, somando automaticamente `(preço unitário × quantidade)`.

### 3. Recursos Complementares
- **Controle de Despensa / Estoque:** Módulo para acompanhamento de itens estocados em casa com quantidade e data de validade.
- **Relatório de Gastos:** Histórico e resumo financeiro de compras já realizadas.

---

## 🔍 Leitura Inteligente de Etiquetas (OCR)

O aplicativo conta com uma pipeline sob medida para reconhecimento de etiquetas de gôndola brasileiras (como as tradicionais etiquetas amarelas térmicas):

1. **Pré-processamento da Imagem (`tagPreprocess.js`):**
   - Localização dos limites da etiqueta e correção de perspectiva.
   - Normalização de contraste local por imagem integral e binarização adaptativa.
   - Segmentação e recorte direcionado das regiões de **Título** e **Preço Gigante**.
2. **Motor de Reconhecimento Óptico:**
   - No **Navegador Web**: Execução direta via `tesseract.js`.
   - No **Mobile (Android/iOS)**: Ponte headless via `react-native-webview` com Tesseract.js embarcado, operando de forma 100% offline e sem dependências nativas complexas.
3. **Filtragem Inteligente de Ruídos (`labelParser.js`):**
   - Ignora linhas de impostos (`VL APROX TRIB (IBPT)`), preços de referência por unidade fracionada (`PREÇO LITRO R$ 22.000`), códigos de barras e campanhas promocionais.
   - Extrai o **Preço Principal Gigante** com precisão decimal.
   - Reconhece automaticamente a **Unidade de Medida** (`un`, `kg` ou `pct`) a partir da descrição ou indicação da etiqueta.
   - Abre diretamente o modal **"Editar Item"** pré-preenchido para conferência e confirmação rápida pelo usuário antes de salvar.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia / Pacote | Versão | Finalidade |
| :--- | :--- | :--- |
| **React Native** | `0.79.2` | Framework base para desenvolvimento mobile multiplataforma |
| **React** | `19.0.0` | Biblioteca de interface reativa |
| **Expo** | `^53.0.0` | Plataforma e ferramental de desenvolvimento e build |
| **@react-native-async-storage/async-storage** | `^2.1.2` | Armazenamento local persistente (Offline-First) |
| **@react-navigation/native** / **stack** | `^7.1.10` / `^7.3.3` | Navegação por pilha entre telas |
| **@react-navigation/drawer** / **bottom-tabs** | `^7.4.1` / `^7.3.14` | Navegação por gaveta e abas auxiliares |
| **expo-image-picker** | `~16.1.4` | Captura de fotos via câmera ou seleção da galeria |
| **react-native-webview** | `13.13.5` | Bridge para execução do motor OCR no ambiente mobile |
| **tesseract.js** | `^7.0.0` | Motor de Reconhecimento Óptico de Caracteres (OCR) |
| **@expo/vector-icons** / **FontAwesome6** | `^14.0.2` | Ícones padronizados da interface |
| **react-native-paper** | `4.9.2` | Componentes de interface e modais |
| **react-native-web** | `^0.20.0` | Suporte e compatibilidade para execução no navegador |

---

## 📁 Estrutura do Projeto

```text
Minha lista de compras/
├── App.js                               # Ponto de entrada, configuração de rotas e navegação
├── package.json                         # Dependências e scripts do projeto
├── components/
│   ├── common/                          # Botões e componentes compartilhados
│   │   ├── CancelButton.js              # Botão padrão de cancelar
│   │   ├── SaveButton.js                # Botão padrão de salvar
│   │   ├── DeleteButton.js              # Botão padrão de exclusão
│   │   ├── NativeOcrBridge.native.js    # Bridge OCR para dispositivos móveis (WebView)
│   │   └── NativeOcrBridge.web.js       # Bridge OCR para ambiente web
│   ├── modals/
│   │   └── ShoppingModals/              # Modais de interação do fluxo de compras
│   │       ├── ItemFormModal.js         # Modal "Editar Item" / "Adicionar Produto" (com máscara BRL)
│   │       ├── ListFormModal.js         # Modal para criar/renomear listas
│   │       ├── ConfirmModal.js          # Modal de confirmação (exclusão de itens/listas)
│   │       └── OcrProgressModal.js      # Modal com feedback visual do progresso de leitura da etiqueta
│   └── StyleSheet/                      # Estilização e identidade visual
│       ├── Colors.js                    # Paleta oficial de cores (Verde, Cinza, Ardósia)
│       ├── Styles.js                    # Estilos compartilhados de formulários e listas
│       ├── ModalStyle.js                # Estilos padronizados dos modais
│       ├── Button.js                    # Estilos de botões
│       └── headerStyle.js               # Estilos dos cabeçalhos das telas
└── src/
    ├── pages/
    │   ├── Listas/
    │   │   ├── ListasScreen.js          # Tela principal: listagem e gestão das listas de compras
    │   │   └── ListaDetalhesScreen.js   # Tela de detalhes: produtos, câmera OCR, seletores e total
    │   ├── Estoque/                     # Módulo de Despensa / Estoque doméstico
    │   │   ├── EstoqueScreen.js         # Visão geral do estoque
    │   │   ├── EstoqueList.js           # Listagem de itens em estoque
    │   │   └── AddEstoqueItem.js        # Adição de item ao estoque
    │   └── RelatorioScreen.js           # Tela de relatórios e histórico financeiro
    ├── services/                        # Regras de processamento e OCR
    │   ├── labelParser.js               # Parser de texto da etiqueta (preço, nome, unidade e filtros)
    │   ├── tagPreprocess.js             # Pré-processamento e recorte das regiões da etiqueta
    │   ├── labelOcr.web.js              # Serviço de OCR para plataforma Web
    │   └── labelOcr.native.js           # Serviço de OCR para plataforma Mobile
    └── storage/
        └── shoppingStorage.js           # Persistência com AsyncStorage, máscaras monetárias e datas
```

---

## 💻 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada: 18 ou superior)
- Gerenciador de pacotes `npm`
- Para testar no celular: aplicativo **Expo Go** instalado no seu smartphone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS](https://apps.apple.com/app/expo-go/id982107779))

### 1. Clonar o repositório e instalar as dependências
```bash
# Clone este repositório
git clone https://github.com/SEU-USUARIO/Minha-lista-de-compras.git

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
- **iOS:** Abra o aplicativo nativo da **Câmera** e toque na notificação para abrir no Expo Go.
*(Certifique-se de que o computador e o smartphone estejam conectados à mesma rede Wi-Fi).*

### 3. Executar no Navegador Web
```bash
npx expo start -w
# ou
npm run web
```
O aplicativo será aberto automaticamente no navegador padrão no endereço `http://localhost:8081`.

### 4. Executar em Emuladores
```bash
# Para emulador Android
npx expo start --android

# Para simulador iOS (requer macOS)
npx expo start --ios
```

---

## 📦 Geração de Build / APK

Para gerar um arquivo executável para testes ou distribuição física (APK):

```bash
# 1. Instalar o utilitário do Expo Application Services globalmente
npm install -g eas-cli

# 2. Fazer login na sua conta Expo
eas login

# 3. Configurar o projeto para build
eas build:configure

# 4. Gerar APK de preview para Android
eas build -p android --profile preview
```

---

## 📄 Licença

Este projeto está sob a licença [0BSD](LICENSE).
