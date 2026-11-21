import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import { useAppSettings } from '../../context/AppSettingsContext';

const HELP_SECTIONS = [
  {
    id: 'lists',
    icon: 'cart-shopping',
    title: '1. Como usar as Listas de Compras',
    steps: [
      {
        label: 'Criar uma nova lista:',
        text: 'Na tela inicial "Minhas Compras", toque em "+ Criar Nova Lista". Dê um nome (ex.: "Mercado da Semana") e, se desejar, informe um valor de orçamento para acompanhar seu limite.',
      },
      {
        label: 'Filtrar por status:',
        text: 'Use as abas no topo ("Todas", "Em aberto" e "Finalizadas") para encontrar rapidamente suas compras atuais ou antigas.',
      },
      {
        label: 'Editar nome, data ou orçamento:',
        text: 'Dentro de uma lista aberta, toque no ícone de lápis no cabeçalho verde (ou toque na barra de total no rodapé) para alterar o nome, a data ou o orçamento.',
      },
      {
        label: 'Finalizar e Reabrir:',
        text: 'Quando terminar a compra no caixa, toque em "Finalizar" no topo. A lista fica protegida contra alterações e entra no Resumo de Gastos. Se precisar corrigir algo depois, toque em "Reabrir".',
      },
    ],
  },
  {
    id: 'products',
    icon: 'camera',
    title: '2. Modos de Preenchimento de Produtos',
    steps: [
      {
        label: 'Adicionar manualmente:',
        text: 'Toque no botão central "+ Adicionar Produto", digite o nome e o preço. O app sugere automaticamente a categoria (ex.: Hortifruti, Mercearia, Farmácia) e aprende se você escolher outra categoria.',
      },
      {
        label: 'Ajustar quantidades rapidamente:',
        text: 'Use os botões "-" e "+" diretamente no card de cada produto para somar ou diminuir unidades. O valor total da compra é recalculado na hora.',
      },
      {
        label: 'Usar a Câmera / Recorte de Etiqueta:',
        text: 'Toque no ícone de câmera à direita na barra inferior para fotografar a etiqueta da prateleira. Ajuste a área verde sobre a etiqueta e confirme para ler o preço automaticamente.',
      },
      {
        label: 'Etiquetas com mais de um preço:',
        text: 'Quando a etiqueta tiver preço de varejo e atacado (ou dois valores diferentes), o app mostra as opções detectadas para você escolher com um toque qual valor deseja considerar.',
      },
    ],
  },
  {
    id: 'reminders',
    icon: 'clipboard-check',
    title: '3. Como usar os Lembretes',
    steps: [
      {
        label: 'Criar listas temáticas reutilizáveis:',
        text: 'Acesse a aba "Lembretes" e crie listas organizadas por ocasião, como "Compra do Mês", "Farmácia", "Churrasco" ou "Higiene Pessoal".',
      },
      {
        label: 'Gerenciar itens de lembrete:',
        text: 'Toque em uma lista de lembretes para abrir seus itens. Você pode buscar, adicionar novos itens, ajustar quantidades com "-" e "+" e editar tocando no card.',
      },
      {
        label: 'Importar para uma lista de compras:',
        text: 'Dentro de qualquer lista de compras aberta, toque no ícone de prancheta (lembrete) à esquerda na barra inferior. Escolha a lista e o item desejado.',
      },
      {
        label: 'Escolher entre Manual ou Câmera:',
        text: 'Ao tocar no item de lembrete, você decide se quer adicioná-lo manualmente (digitando o preço) ou já abrir a câmera para fotografar a etiqueta na prateleira.',
      },
    ],
  },
  {
    id: 'reports',
    icon: 'chart-pie',
    title: '4. Resumo de Gastos e Backup (.json)',
    steps: [
      {
        label: 'Acompanhar gastos por período:',
        text: 'Na aba "Resumo de Gastos", filtre por "Mês atual", "Selecionar mês" (para consultar qualquer mês específico), últimos 3, 6, 12 meses ou "Período total".',
      },
      {
        label: 'Gráficos de Barras e Pizza:',
        text: 'Alterne entre o gráfico de Barras (evolução dos gastos) e o gráfico de Pizza (distribuição detalhada por categoria).',
      },
      {
        label: 'Exportar Backup (.zip e .json):',
        text: 'Abra Configurações > Backup de Dados > "Exportar Dados (Backup)". Você pode gerar um Backup Completo (.zip com listas, lembretes e fotos), Apenas Fotos das Etiquetas (.zip) ou arquivos leves .json de Listas de Compras ou Lembretes.',
      },
      {
        label: 'Importar e Compartilhar:',
        text: 'Para restaurar, use "Importar Backup (Restaurar)" nas Configurações ou abra diretamente um arquivo .zip ou .json recebido no celular usando "Abrir com... Minha Lista de Compras".',
      },
    ],
  },
  {
    id: 'photos',
    icon: 'images',
    title: '5. Fotos das Etiquetas e Galeria',
    steps: [
      {
        label: 'Salvamento compactado no aparelho:',
        text: 'Quando ativado, cada etiqueta fotografada é salva localmente em formato JPEG leve (~30 KB) para que você possa conferir o preço da prateleira a qualquer momento.',
      },
      {
        label: 'Ver foto direto no item:',
        text: 'Itens com foto exibem um ícone discreto de imagem ao lado do preço. Toque no ícone (ou no botão "Ver foto da etiqueta" ao editar o produto) para ampliar a foto.',
      },
      {
        label: 'Exclusão automática por tempo:',
        text: 'Em Configurações > Fotos das Etiquetas, você pode ativar a limpeza automática após 30, 60, 90 ou 120 dias para manter o aparelho sempre leve.',
      },
      {
        label: 'Galeria de Etiquetas, Backup .zip e Exclusão de Dados:',
        text: 'Na Galeria de Etiquetas você busca por produto, filtra por data/mês e gerencia suas fotos. No Backup Completo (.zip) ou de Apenas Fotos (.zip), todas as imagens vão compactadas e são restauradas automaticamente. Em Configurações > Excluir Dados, você também pode limpar apenas fotos, listas, lembretes ou zerar o app com confirmação segura e atalho para fazer backup antes.',
      },
    ],
  },
];

export default function AjudaScreen() {
  const { colors, radiusCard, borderWidth } = useAppSettings();
  const insets = useSafeAreaInsets();

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={globalStyles.contentContainer}>
          {/* Intro Card */}
          <View
            style={[
              styles.introCard,
              {
                backgroundColor: colors.verdeSuave,
                borderColor: colors.principal,
              },
            ]}
          >
            <View
              style={[
                styles.introIconWrap,
                { backgroundColor: colors.principal },
              ]}
            >
              <FontAwesome6
                name="book-open"
                size={18}
                color={colors.textoPrincipal}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introTitle, { color: colors.textoEscuro }]}>
                Guia Rápido de Uso
              </Text>
              <Text style={[styles.introDesc, { color: colors.textoEscuro }]}>
                Tudo o que você precisa para aproveitar ao máximo o Minha Lista
                de Compras, explicado de forma simples e passo a passo.
              </Text>
            </View>
          </View>

          {/* Guide Sections */}
          {HELP_SECTIONS.map((section) => (
            <View
              key={section.id}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconBox,
                    { backgroundColor: colors.verdeSuave },
                  ]}
                >
                  <FontAwesome6
                    name={section.icon}
                    size={16}
                    color={colors.principal}
                  />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: colors.textoEscuro }]}
                >
                  {section.title}
                </Text>
              </View>

              {section.steps.map((step, idx) => (
                <View
                  key={step.label}
                  style={[
                    styles.stepRow,
                    idx === section.steps.length - 1 && { marginBottom: 0 },
                  ]}
                >
                  <View
                    style={[
                      styles.bulletDot,
                      { backgroundColor: colors.principal },
                    ]}
                  />
                  <Text style={[styles.stepText, { color: colors.textMuted }]}>
                    <Text
                      style={[styles.stepLabel, { color: colors.textoEscuro }]}
                    >
                      {step.label}{' '}
                    </Text>
                    {step.text}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Extra Tip Card */}
          <View
            style={[
              styles.tipCard,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <FontAwesome6
              name="lightbulb"
              size={16}
              color={colors.principal}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <Text style={[styles.tipText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: 'bold', color: colors.textoEscuro }}>
                Dica:{' '}
              </Text>
              Em Configurações você também pode personalizar a aparência do
              aplicativo escolhendo entre 7 temas exclusivos (incluindo Claro,
              Noturno, AMOLED Escuro, Rose Quartz, Azul Oceano, Neon Matrix e
              Cyberpunk Neon).
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 15,
    marginBottom: 14,
  },
  introIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  introTitle: {
    fontSize: 16.5,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  introDesc: {
    fontSize: 13,
    lineHeight: 18.5,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 11,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  stepLabel: {
    fontWeight: 'bold',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
