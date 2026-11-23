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
import {
  RETENTION_DAY_OPTIONS,
  DEFAULT_RETENTION_DAYS,
} from '../../services/tagPhotoStorage';

const GUIDANCE_CARDS = [
  {
    key: 'lists',
    icon: 'list-check',
    title: 'Listas Inteligentes e Orçamento',
    desc: 'Crie listas de compras, defina limite de gastos e acompanhe o total em tempo real.',
  },
  {
    key: 'scanner',
    icon: 'barcode',
    title: 'Scanner Híbrido de Etiquetas',
    desc: 'Aponte a câmera para travar o código de barras, fotografe o preço e deixe o app preencher nome, valor e categoria automaticamente.',
  },
  {
    key: 'gallery',
    icon: 'file-zipper',
    title: 'Galeria e Backup Completo (.zip)',
    desc: 'Salve fotos comprimidas das etiquetas para conferir no caixa e exporte/restaure tudo em um único arquivo .zip.',
  },
  {
    key: 'privacy',
    icon: 'shield-halved',
    title: '100% Offline e Privado',
    desc: 'Funciona sem internet no mercado e mantém todos os seus dados salvos apenas no seu aparelho.',
  },
];

export default function OnboardingScreen({ onComplete, isReplay = false }) {
  const {
    colors,
    radiusCard,
    radiusButton,
    borderWidth,
    saveTagPhotos: initialSavePhotos,
    autoDeleteTagPhotos: initialAutoDelete,
    tagPhotoRetentionDays: initialRetentionDays,
    updatePhotoSettings,
  } = useAppSettings();
  const insets = useSafeAreaInsets();

  const [savePhotosChoice, setSavePhotosChoice] = useState(
    initialSavePhotos !== undefined ? Boolean(initialSavePhotos) : true
  );
  const [autoDeleteChoice, setAutoDeleteChoice] = useState(
    Boolean(initialAutoDelete)
  );
  const [retentionDaysChoice, setRetentionDaysChoice] = useState(
    initialRetentionDays || DEFAULT_RETENTION_DAYS
  );

  const finishOnboarding = async () => {
    await updatePhotoSettings({
      saveTagPhotos: savePhotosChoice,
      autoDeleteTagPhotos: savePhotosChoice ? autoDeleteChoice : false,
      tagPhotoRetentionDays: retentionDaysChoice,
    });
    onComplete?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact Top Header with 46px inline icon badge */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.primary,
            paddingTop: Math.max(insets.top, 16) + 8,
          },
        ]}
      >
        <View style={styles.headerInlineRow}>
          <View style={styles.compactIconBadge}>
            <FontAwesome6
              name="cart-shopping"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.headerTextCol}>
            <Text
              style={[styles.headerTitle, { color: colors.textoPrincipal }]}
              numberOfLines={1}
            >
              Minha Lista de Compras
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.textoPrincipal }]}
              numberOfLines={2}
            >
              Guia rápido para comprar com agilidade e sem surpresas no caixa
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Guidance & Photo Preferences */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionHeading, { color: colors.textoEscuro }]}>
          Como aproveitar ao máximo
        </Text>

        <View style={styles.cardsWrap}>
          {GUIDANCE_CARDS.map((item) => (
            <View
              key={item.key}
              style={[
                styles.guidanceCard,
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
                  styles.guidanceIconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name={item.icon}
                  size={16}
                  color={colors.badgeText || colors.principal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.guidanceTitle,
                    { color: colors.textoEscuro },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.guidanceDesc, { color: colors.textMuted }]}
                >
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Photo & Retention Preferences */}
        <View
          style={[
            styles.photoPrefCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
              borderRadius: radiusCard,
              borderWidth,
            },
          ]}
        >
          <View style={styles.photoPrefHeader}>
            <View
              style={[
                styles.photoPrefIconWrap,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6
                name="image"
                size={15}
                color={colors.badgeText || colors.principal}
              />
            </View>
            <Text
              style={[styles.photoPrefTitle, { color: colors.textoEscuro }]}
            >
              Preferências de Fotos das Etiquetas
            </Text>
          </View>

          <Text style={[styles.photoQuestion, { color: colors.textoEscuro }]}>
            Deseja salvar as fotos das etiquetas?
          </Text>
          <Text style={[styles.photoSubHint, { color: colors.textMuted }]}>
            As fotos são compactadas (~30 KB) no próprio aparelho para você
            conferir preços quando quiser.
          </Text>

          <View style={styles.choiceRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSavePhotosChoice(true)}
              style={[
                styles.choicePill,
                {
                  backgroundColor: savePhotosChoice
                    ? colors.principal
                    : colors.surfaceMuted,
                  borderColor: savePhotosChoice
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: Math.min(10, radiusButton),
                },
              ]}
            >
              <Text
                style={[
                  styles.choicePillText,
                  {
                    color: savePhotosChoice
                      ? colors.textoPrincipal
                      : colors.textoEscuro,
                  },
                ]}
              >
                Sim
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSavePhotosChoice(false)}
              style={[
                styles.choicePill,
                {
                  backgroundColor: !savePhotosChoice
                    ? colors.principal
                    : colors.surfaceMuted,
                  borderColor: !savePhotosChoice
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: Math.min(10, radiusButton),
                },
              ]}
            >
              <Text
                style={[
                  styles.choicePillText,
                  {
                    color: !savePhotosChoice
                      ? colors.textoPrincipal
                      : colors.textoEscuro,
                  },
                ]}
              >
                Não
              </Text>
            </TouchableOpacity>
          </View>

          {savePhotosChoice ? (
            <View
              style={[
                styles.followUpBlock,
                { borderTopColor: colors.borderColor },
              ]}
            >
              <Text
                style={[styles.photoQuestion, { color: colors.textoEscuro }]}
              >
                Deseja excluir as fotos automaticamente após um período?
              </Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAutoDeleteChoice(true)}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor: autoDeleteChoice
                        ? colors.principal
                        : colors.surfaceMuted,
                      borderColor: autoDeleteChoice
                        ? colors.principal
                        : colors.borderColor,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.choicePillText,
                      {
                        color: autoDeleteChoice
                          ? colors.textoPrincipal
                          : colors.textoEscuro,
                      },
                    ]}
                  >
                    Sim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAutoDeleteChoice(false)}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor: !autoDeleteChoice
                        ? colors.principal
                        : colors.surfaceMuted,
                      borderColor: !autoDeleteChoice
                        ? colors.principal
                        : colors.borderColor,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.choicePillText,
                      {
                        color: !autoDeleteChoice
                          ? colors.textoPrincipal
                          : colors.textoEscuro,
                      },
                    ]}
                  >
                    Não
                  </Text>
                </TouchableOpacity>
              </View>

              {autoDeleteChoice ? (
                <View style={styles.daysRow}>
                  {RETENTION_DAY_OPTIONS.map((days) => {
                    const active = retentionDaysChoice === days;
                    return (
                      <TouchableOpacity
                        key={days}
                        activeOpacity={0.8}
                        onPress={() => setRetentionDaysChoice(days)}
                        style={[
                          styles.dayPill,
                          {
                            backgroundColor: active
                              ? colors.principal
                              : colors.surfaceMuted,
                            borderColor: active
                              ? colors.principal
                              : colors.borderColor,
                            borderRadius: Math.min(10, radiusButton),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayPillText,
                            {
                              color: active
                                ? colors.textoPrincipal
                                : colors.textoEscuro,
                            },
                          ]}
                        >
                          {days} dias
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

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
            size={16}
            color={colors.principal}
            style={{ marginRight: 9, marginTop: 2 }}
          />
          <Text style={[styles.helpNoticeText, { color: colors.textoEscuro }]}>
            Você pode rever esta tela e o guia completo a qualquer momento em{' '}
            <Text style={{ fontWeight: 'bold' }}>Configurações &gt; Ajuda</Text>.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
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
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={finishOnboarding}
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
            {isReplay ? 'Salvar e Voltar' : 'Começar a Usar'}
          </Text>
          <FontAwesome6
            name="check"
            size={14}
            color={colors.textoPrincipal}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    flexShrink: 0,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    opacity: 0.92,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeading: {
    fontSize: 15.5,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardsWrap: {
    width: '100%',
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  guidanceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
    marginTop: 1,
    flexShrink: 0,
  },
  guidanceTitle: {
    fontSize: 14.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  guidanceDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  photoPrefCard: {
    padding: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  photoPrefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  photoPrefIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  photoPrefTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  photoQuestion: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  photoSubHint: {
    fontSize: 12,
    lineHeight: 16.5,
    marginBottom: 9,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choicePill: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choicePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  followUpBlock: {
    borderTopWidth: 1,
    marginTop: 11,
    paddingTop: 11,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  dayPill: {
    flexGrow: 1,
    minWidth: '21%',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  helpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
  },
  helpNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
