import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../context/AppSettingsContext';

const SLIDES = [
  {
    key: 'welcome',
    icon: 'cart-shopping',
    badge: 'Boas-vindas',
    title: 'Controle total das suas compras',
    subtitle:
      'Organize suas listas de supermercado, acompanhe o valor do carrinho em tempo real e nunca mais tenha surpresas no caixa.',
    highlights: [
      {
        icon: 'list-check',
        title: 'Listas com ou sem orçamento',
        desc: 'Defina um limite de gastos opcional e receba alertas visuais se estiver perto ou acima do orçamento.',
      },
      {
        icon: 'filter',
        title: 'Organização por status',
        desc: 'Filtre entre Todas, Em aberto e Finalizadas. Ao terminar a compra, finalize para salvar no histórico.',
      },
      {
        icon: 'calculator',
        title: 'Soma automática no rodapé',
        desc: 'Cada produto adicionado atualiza o valor total na hora, com ajuste rápido de quantidade usando - e +.',
      },
    ],
  },
  {
    key: 'camera',
    icon: 'camera',
    badge: 'Agilidade no Mercado',
    title: 'Adicione manualmente ou pela câmera',
    subtitle:
      'Cadastre produtos digitando normalmente ou fotografe a etiqueta da prateleira para preencher preço e nome automaticamente.',
    highlights: [
      {
        icon: 'crop-simple',
        title: 'Leitura inteligente de etiquetas',
        desc: 'Tire foto da etiqueta, ajuste o recorte se desejar e o app identifica o preço. Se houver mais de um valor, você escolhe qual usar.',
      },
      {
        icon: 'tags',
        title: 'Categoria preenchida sozinha',
        desc: 'O dicionário local reconhece centenas de produtos e aprende automaticamente suas preferências.',
      },
      {
        icon: 'pen-to-square',
        title: 'Edição rápida a qualquer momento',
        desc: 'Toque em qualquer item da lista para ajustar nome, preço, unidade, categoria ou observação.',
      },
    ],
  },
  {
    key: 'reminders',
    icon: 'clipboard-check',
    badge: 'Praticidade',
    title: 'Lembretes reutilizáveis e relatórios',
    subtitle:
      'Monte listas fixas do que costuma comprar e acompanhe para onde vai o seu dinheiro mês a mês.',
    highlights: [
      {
        icon: 'repeat',
        title: 'Listas de lembretes temáticas',
        desc: 'Crie listas como "Compra do Mês", "Farmácia" ou "Churrasco" sem precisar digitar tudo novamente.',
      },
      {
        icon: 'file-import',
        title: 'Importe direto na compra',
        desc: 'Dentro de uma lista de compras, toque no ícone de lembretes para importar itens manualmente ou já fotografando a etiqueta.',
      },
      {
        icon: 'chart-pie',
        title: 'Resumo de Gastos visual',
        desc: 'Acompanhe seus gastos por mês ou período com gráficos de barras e de pizza por categoria.',
      },
    ],
  },
  {
    key: 'privacy',
    icon: 'shield-halved',
    badge: '100% Offline e Seguro',
    title: 'Seus dados ficam só com você',
    subtitle:
      'O Minha Lista de Compras funciona totalmente sem internet, sem cadastro e sem enviar nada para servidores externos.',
    highlights: [
      {
        icon: 'mobile-screen-button',
        title: 'Armazenamento 100% local',
        desc: 'Todas as suas listas, preços e lembretes ficam salvos exclusivamente na memória do seu aparelho.',
      },
      {
        icon: 'file-export',
        title: 'Backup fácil em arquivo .json',
        desc: 'Em Configurações, exporte tudo ou apenas listas/lembretes para guardar uma cópia ou compartilhar com outra pessoa.',
      },
    ],
    helpNotice:
      'Você pode rever todas essas orientações e um guia passo a passo completo a qualquer momento em Configurações > Ajuda.',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, radiusCard, radiusButton, borderWidth } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);

  const currentSlide = SLIDES[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setStepIndex((prev) => Math.min(SLIDES.length - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setStepIndex((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Green Top Header Strip */}
      <View
        style={[
          styles.topBanner,
          {
            backgroundColor: colors.primary,
            paddingTop: Math.max(insets.top, 16) + 10,
          },
        ]}
      >
        <View style={styles.topBarRow}>
          <View style={styles.brandRow}>
            <FontAwesome6
              name="cart-shopping"
              size={16}
              color={colors.textoPrincipal}
            />
            <Text style={[styles.brandText, { color: colors.textoPrincipal }]}>
              Minha Lista de Compras
            </Text>
          </View>

          {!isLast ? (
            <TouchableOpacity
              onPress={() => onComplete?.()}
              style={styles.skipBtn}
              accessibilityLabel="Pular introdução"
            >
              <Text style={[styles.skipText, { color: colors.textoPrincipal }]}>
                Pular
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 52 }} />
          )}
        </View>

        <View style={styles.heroIconWrap}>
          <View style={styles.heroIconCircle}>
            <FontAwesome6
              name={currentSlide.icon}
              size={34}
              color={colors.primary}
            />
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {currentSlide.badge} • {stepIndex + 1}/{SLIDES.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Slide Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textoEscuro }]}>
          {currentSlide.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {currentSlide.subtitle}
        </Text>

        <View style={styles.cardsWrap}>
          {currentSlide.highlights.map((item) => (
            <View
              key={item.title}
              style={[
                styles.highlightCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.highlightIconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name={item.icon}
                  size={16}
                  color={colors.principal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.highlightTitle,
                    { color: colors.textoEscuro },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.highlightDesc, { color: colors.textMuted }]}
                >
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {currentSlide.helpNotice ? (
          <View
            style={[
              styles.helpNoticeBox,
              {
                backgroundColor: colors.verdeSuave,
                borderColor: colors.principal,
              },
            ]}
          >
            <FontAwesome6
              name="circle-info"
              size={18}
              color={colors.principal}
              style={{ marginRight: 10, marginTop: 1 }}
            />
            <Text
              style={[styles.helpNoticeText, { color: colors.textoEscuro }]}
            >
              {currentSlide.helpNotice}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Controls */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.borderColor,
            paddingBottom: Math.max(insets.bottom, 14) + 6,
          },
        ]}
      >
        {/* Progress Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, idx) => {
            const active = idx === stepIndex;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setStepIndex(idx)}
                style={[
                  styles.dot,
                  {
                    width: active ? 24 : 8,
                    backgroundColor: active
                      ? colors.principal
                      : colors.borderColor,
                  },
                ]}
                accessibilityLabel={`Ir para etapa ${idx + 1}`}
              />
            );
          })}
        </View>

        <View style={styles.buttonsRow}>
          {!isFirst ? (
            <TouchableOpacity
              onPress={handlePrev}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <FontAwesome6
                name="arrow-left"
                size={14}
                color={colors.textoEscuro}
              />
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textoEscuro },
                ]}
              >
                Anterior
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.principal,
                borderRadius: radiusButton,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryBtnText,
                { color: colors.textoPrincipal },
              ]}
            >
              {isLast ? 'Começar a Usar' : 'Próximo'}
            </Text>
            <FontAwesome6
              name={isLast ? 'check' : 'arrow-right'}
              size={14}
              color={colors.textoPrincipal}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBanner: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroIconWrap: {
    alignItems: 'center',
  },
  heroIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  cardsWrap: {
    width: '100%',
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  highlightIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  highlightDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  helpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 4,
  },
  helpNoticeText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  secondaryBtnText: {
    fontSize: 14.5,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15.5,
    fontWeight: 'bold',
  },
});
