import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import ModalStyle from '../../StyleSheet/ModalStyle';
import globalStyles from '../../StyleSheet/Styles';
import CancelButton from '../../common/Buttons/CancelButton';
import SaveButton from '../../common/Buttons/SaveButton';
import TagPhotoPreviewModal from './TagPhotoPreviewModal';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import { getTagPhotoUri } from '../../../src/services/tagPhotoStorage';
import {
  startVoiceNameDictation,
  stopVoiceNameDictation,
  abortVoiceNameDictation,
  formatTranscribedProductName,
} from '../../../src/services/voiceInputService';
import {
  CATEGORIES,
  UNITS,
  parseDecimal,
  maskBRLInput,
  parseBRLInput,
  numberToBRLMask,
  normalizeCategoryName,
  inferCategorySmart,
  learnCategoryAssociation,
  loadLearnedCategories,
} from '../../../src/storage/shoppingStorage';

export default function ItemFormModal({
  visible,
  initialItem = null,
  mode = 'edit',
  ocrHint = '',
  requirePrice = true,
  customTitle = null,
  listName = '',
  onClose,
  onSubmit,
}) {
  const {
    colors,
    radiusCard,
    radiusButton,
    radiusInput,
    borderWidth,
    isMaterialYouTheme,
    simplifiedItemForm,
  } = useAppSettings();
  const [isSimplifiedSession, setIsSimplifiedSession] = useState(
    Boolean(simplifiedItemForm)
  );
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Outros');
  const [hasManualCategory, setHasManualCategory] = useState(false);
  const [priceMasked, setPriceMasked] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [usedVoiceForName, setUsedVoiceForName] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const categoryRef = useRef('Outros');
  const hasManualCategoryRef = useRef(false);
  const isApiLockedCategoryRef = useRef(false);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    hasManualCategoryRef.current = hasManualCategory;
  }, [hasManualCategory]);

  useEffect(() => {
    if (!isListeningVoice) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [isListeningVoice, pulseAnim]);

  useEffect(() => {
    return () => {
      abortVoiceNameDictation();
    };
  }, []);

  useEffect(() => {
    loadLearnedCategories();
  }, []);

  useEffect(() => {
    if (visible) {
      setIsSimplifiedSession(Boolean(simplifiedItemForm));
      if (initialItem) {
        const basePrice =
          Number(initialItem.price) > 0
            ? Number(initialItem.price)
            : Number(initialItem.retailPrice) > 0
              ? Number(initialItem.retailPrice)
              : Number(initialItem.wholesalePrice) || 0;

        const initName = initialItem.name || '';
        const rawCat = initialItem.category
          ? normalizeCategoryName(initialItem.category)
          : 'Outros';
        const smartCat =
          rawCat === 'Outros' && initName
            ? inferCategorySmart(initName) || 'Outros'
            : rawCat;

        setName(initName);
        setQuantity(String(initialItem.quantity ?? 1));
        setUnit(initialItem.unit || 'un');
        setCategory(smartCat);
        setHasManualCategory(Boolean(initialItem.id && smartCat !== 'Outros'));
        isApiLockedCategoryRef.current = Boolean(
          (initialItem.lookupOrigin === 'api' ||
            initialItem.lookupOrigin === 'cache') &&
            smartCat !== 'Outros'
        );
        setPriceMasked(numberToBRLMask(basePrice));
        setDescription(initialItem.description ?? initialItem.notes ?? '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('un');
        setCategory('Outros');
        setHasManualCategory(false);
        isApiLockedCategoryRef.current = false;
        setPriceMasked('');
        setDescription('');
      }
      setError('');
      setPhotoLoadError(false);
      setIsListeningVoice(false);
      setVoiceFeedback('');
      setUsedVoiceForName(false);
    } else {
      abortVoiceNameDictation();
      setIsListeningVoice(false);
      setVoiceFeedback('');
    }
  }, [visible, initialItem, simplifiedItemForm]);

  const handleToggleVoiceName = async () => {
    if (isListeningVoice) {
      stopVoiceNameDictation();
      setIsListeningVoice(false);
      return;
    }

    setVoiceFeedback('');
    setError('');

    const { started } = await startVoiceNameDictation({
      onStart: () => {
        setIsListeningVoice(true);
        setVoiceFeedback('');
      },
      onInterimResult: (partialText) => {
        const formatted = formatTranscribedProductName(partialText);
        if (formatted) {
          setName(formatted);
        }
      },
      onFinalResult: (finalText) => {
        const formatted = formatTranscribedProductName(finalText);
        if (!formatted) return;
        setName(formatted);
        setUsedVoiceForName(true);
        if (error) setError('');
        const canAutoCategorize =
          categoryRef.current === 'Outros' ||
          (!hasManualCategoryRef.current && !isApiLockedCategoryRef.current);
        if (canAutoCategorize) {
          const suggested = inferCategorySmart(formatted);
          if (suggested) {
            setCategory(suggested);
          }
        }
      },
      onEnd: () => {
        setIsListeningVoice(false);
      },
      onError: ({ code, message }) => {
        setIsListeningVoice(false);
        if (
          code === 'unavailable' ||
          code === 'not-allowed' ||
          code === 'service-not-allowed'
        ) {
          Alert.alert('Ditado por Voz', message);
        } else {
          setVoiceFeedback(message);
        }
      },
    });

    if (started) {
      setIsListeningVoice(true);
    }
  };

  const handleCloseModal = () => {
    abortVoiceNameDictation();
    setIsListeningVoice(false);
    setVoiceFeedback('');
    onClose?.();
  };

  const handleNameChange = (text) => {
    setName(text);
    if (error) setError('');
    if (!hasManualCategory) {
      const suggested = inferCategorySmart(text);
      if (suggested) {
        setCategory(suggested);
      } else if (!text.trim()) {
        setCategory('Outros');
      }
    }
  };

  const handleSelectCategory = (cat) => {
    setCategory(cat);
    setHasManualCategory(true);
  };

  const handlePriceChange = (text) => {
    const masked = maskBRLInput(text);
    setPriceMasked(masked);
    if (error) setError('');
  };

  const handleAdjustQuantity = (delta) => {
    const current = parseDecimal(quantity) || 1;
    const next = Math.max(1, Math.round((current + delta) * 100) / 100);
    setQuantity(String(next));
    if (error) setError('');
  };

  const handleSave = async () => {
    if (isListeningVoice) {
      abortVoiceNameDictation();
      setIsListeningVoice(false);
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome do produto.');
      return;
    }

    const parsedPrice = requirePrice ? parseBRLInput(priceMasked) : 0;
    if (requirePrice && parsedPrice <= 0) {
      setError('Informe o preço unitário em Real (maior que R$ 0,00).');
      return;
    }

    const parsedQty = parseDecimal(quantity);
    if (parsedQty <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    const finalCategory = normalizeCategoryName(category);
    await learnCategoryAssociation(trimmedName, finalCategory);

    setError('');
    onSubmit({
      name: trimmedName,
      quantity: parsedQty,
      unit,
      category: finalCategory,
      price: parsedPrice,
      description: description.trim(),
      notes: description.trim(),
      nameInputOrigin: usedVoiceForName ? 'voice' : 'typed',
      sourceReminderId: initialItem?.sourceReminderId || null,
      ...(initialItem?.photoFilename
        ? {
            photoFilename: initialItem.photoFilename,
            photoCapturedAt: initialItem.photoCapturedAt || null,
          }
        : {}),
    });
  };

  const modalTitle =
    customTitle || (mode === 'manual' ? 'Adicionar Produto' : 'Editar Item');
  const savedPhotoUri =
    (initialItem?.photoFilename
      ? getTagPhotoUri(initialItem.photoFilename)
      : null) ||
    initialItem?.tempPhotoUri ||
    null;
  const inputThemeStyle = {
    backgroundColor: colors.inputBackground,
    borderColor: colors.borderColor,
    color: colors.textoEscuro,
    borderRadius: radiusInput,
    borderWidth,
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCloseModal}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View
          style={[
            ModalStyle.modalView,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
              borderWidth,
              borderRadius: radiusCard,
            },
          ]}
        >
          <View style={localStyles.headerTitleRow}>
            <Text
              style={[
                ModalStyle.modalTitle,
                localStyles.headerTitleText,
                { color: colors.textoEscuro },
              ]}
              numberOfLines={1}
            >
              {modalTitle}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSimplifiedSession((prev) => !prev)}
              style={[
                localStyles.simplifiedPill,
                {
                  backgroundColor: isSimplifiedSession
                    ? colors.verdeSuave
                    : colors.surfaceMuted,
                  borderColor: isSimplifiedSession
                    ? colors.principal
                    : colors.borderColor,
                },
              ]}
              accessibilityRole="switch"
              accessibilityState={{ checked: Boolean(isSimplifiedSession) }}
              accessibilityLabel={
                isSimplifiedSession
                  ? 'Alternar para modo completo'
                  : 'Alternar para modo simplificado'
              }
            >
              <FontAwesome6
                name={isSimplifiedSession ? 'check' : 'sliders'}
                size={11}
                color={
                  isSimplifiedSession
                    ? colors.badgeText || colors.principal
                    : colors.textMuted
                }
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  localStyles.simplifiedPillText,
                  {
                    color: isSimplifiedSession
                      ? colors.badgeText || colors.principal
                      : colors.textMuted,
                  },
                ]}
              >
                Simplificado
              </Text>
            </TouchableOpacity>
          </View>

          {savedPhotoUri && !photoLoadError ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setShowPhotoPreview(true)}
              style={{
                width: '100%',
                height: 90,
                marginBottom: 12,
                borderRadius: radiusCard,
                borderWidth,
                borderColor: colors.borderColor,
                backgroundColor: colors.surfaceMuted,
                overflow: 'hidden',
                position: 'relative',
              }}
              accessibilityLabel="Ampliar foto da etiqueta"
            >
              <Image
                source={{ uri: savedPhotoUri }}
                resizeMode="cover"
                style={{ width: '100%', height: '100%' }}
                onError={() => setPhotoLoadError(true)}
              />
              {mode === 'ocr' || initialItem?.lookupOrigin ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 8,
                    bottom: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0,0,0,0.32)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={
                    initialItem?.lookupOrigin === 'api'
                      ? 'Origem: Open Food Facts (Online)'
                      : initialItem?.lookupOrigin === 'cache'
                        ? 'Origem: Cache Local'
                        : 'Origem: Leitura Local (OCR)'
                  }
                >
                  <FontAwesome6
                    name={
                      initialItem?.lookupOrigin === 'api'
                        ? 'globe'
                        : initialItem?.lookupOrigin === 'cache'
                          ? 'bolt'
                          : 'camera'
                    }
                    size={12}
                    color="rgba(255,255,255,0.92)"
                  />
                </View>
              ) : null}
              <View
                style={{
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <FontAwesome6
                  name="magnifying-glass-plus"
                  size={13}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
            </TouchableOpacity>
          ) : null}

          {mode === 'ocr' ? (
            <View
              style={[
                localStyles.ocrBanner,
                {
                  backgroundColor: ocrHint
                    ? colors.warningSoft
                    : colors.verdeSuave,
                  borderRadius: Math.min(10, radiusButton),
                },
              ]}
            >
              <FontAwesome6
                name={ocrHint ? 'circle-exclamation' : 'circle-check'}
                size={15}
                color={ocrHint ? colors.warning : colors.principal}
              />
              <Text
                style={[
                  localStyles.ocrBannerText,
                  { color: ocrHint ? colors.warningText : colors.principal },
                ]}
              >
                {ocrHint || 'Etiqueta lida! Confira os dados antes de salvar.'}
              </Text>
              {!(savedPhotoUri && !photoLoadError) ? (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 8,
                  }}
                >
                  <FontAwesome6
                    name={
                      initialItem?.lookupOrigin === 'api'
                        ? 'globe'
                        : initialItem?.lookupOrigin === 'cache'
                          ? 'bolt'
                          : 'camera'
                    }
                    size={11}
                    color="#FFFFFF"
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            style={{ width: '100%' }}
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={ModalStyle.modalInputContainer}>
              <Text
                style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}
                numberOfLines={1}
              >
                Nome do produto *
              </Text>
              <View style={localStyles.nameInputWrap}>
                <TextInput
                  style={[
                    globalStyles.input,
                    inputThemeStyle,
                    localStyles.nameInputFull,
                    isListeningVoice && {
                      borderColor: colors.danger || colors.logoutRed,
                    },
                  ]}
                  placeholder="Ex: Dipirona, Leite, Sabonete, Arroz..."
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(text) => {
                    if (voiceFeedback) setVoiceFeedback('');
                    handleNameChange(text);
                  }}
                />
                <Animated.View
                  style={[
                    localStyles.inlineMicOverlay,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={handleToggleVoiceName}
                    style={[
                      localStyles.voiceMicBtn,
                      {
                        backgroundColor: isListeningVoice
                          ? `${colors.danger || colors.logoutRed}20`
                          : 'rgba(128, 128, 128, 0.10)',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isListeningVoice
                        ? 'Parar ditado por voz'
                        : 'Ditar nome do produto'
                    }
                  >
                    <FontAwesome6
                      name={isListeningVoice ? 'stop' : 'microphone'}
                      size={isListeningVoice ? 12 : 15}
                      color={
                        isListeningVoice
                          ? colors.danger || colors.logoutRed
                          : colors.textSecondary || colors.textMuted
                      }
                      style={{ opacity: isListeningVoice ? 0.95 : 0.55 }}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              {isListeningVoice ? (
                <View style={localStyles.voiceStatusRow}>
                  <View
                    style={[
                      localStyles.voiceRecordingDot,
                      { backgroundColor: colors.danger || colors.logoutRed },
                    ]}
                  />
                  <Text
                    style={[
                      localStyles.voiceStatusText,
                      { color: colors.danger || colors.logoutRed },
                    ]}
                  >
                    Ouvindo...
                  </Text>
                </View>
              ) : voiceFeedback ? (
                <Text
                  style={[
                    localStyles.voiceFeedbackText,
                    { color: colors.warningText || colors.textMuted },
                  ]}
                >
                  {voiceFeedback}
                </Text>
              ) : null}
            </View>

            {requirePrice ? (
              <View style={localStyles.row}>
                <View
                  style={[
                    ModalStyle.modalInputContainer,
                    { flex: 1, marginRight: 10 },
                  ]}
                >
                  <Text
                    style={[
                      ModalStyle.modalLabel,
                      localStyles.singleLineLabel,
                      { color: colors.textoEscuro },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Preço (R$) *
                  </Text>
                  <TextInput
                    style={[globalStyles.input, inputThemeStyle]}
                    placeholder="R$ 0,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={priceMasked}
                    onChangeText={handlePriceChange}
                  />
                </View>

                <View style={[ModalStyle.modalInputContainer, { flex: 1.1 }]}>
                  <Text
                    style={[
                      ModalStyle.modalLabel,
                      localStyles.singleLineLabel,
                      { color: colors.textoEscuro },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Quantidade *
                  </Text>
                  <View
                    style={[
                      localStyles.qtyControlWrap,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.borderColor,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleAdjustQuantity(-1)}
                      style={[
                        localStyles.qtyStepBtn,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                      accessibilityLabel="Diminuir quantidade"
                    >
                      <FontAwesome6
                        name="minus"
                        size={13}
                        color={colors.textoEscuro}
                      />
                    </TouchableOpacity>

                    <TextInput
                      style={[
                        localStyles.qtyInput,
                        { color: colors.textoEscuro },
                      ]}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={quantity}
                      onChangeText={(text) => {
                        setQuantity(text);
                        if (error) setError('');
                      }}
                    />

                    <TouchableOpacity
                      onPress={() => handleAdjustQuantity(1)}
                      style={[
                        localStyles.qtyStepBtn,
                        { backgroundColor: colors.verdeSuave },
                      ]}
                      accessibilityLabel="Aumentar quantidade"
                    >
                      <FontAwesome6
                        name="plus"
                        size={13}
                        color={colors.principal}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={ModalStyle.modalInputContainer}>
                <Text
                  style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}
                  numberOfLines={1}
                >
                  Quantidade *
                </Text>
                <View
                  style={[
                    localStyles.qtyControlWrap,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleAdjustQuantity(-1)}
                    style={[
                      localStyles.qtyStepBtn,
                      { backgroundColor: colors.surfaceMuted },
                    ]}
                    accessibilityLabel="Diminuir quantidade"
                  >
                    <FontAwesome6
                      name="minus"
                      size={13}
                      color={colors.textoEscuro}
                    />
                  </TouchableOpacity>

                  <TextInput
                    style={[
                      localStyles.qtyInput,
                      { color: colors.textoEscuro },
                    ]}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={quantity}
                    onChangeText={(text) => {
                      setQuantity(text);
                      if (error) setError('');
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => handleAdjustQuantity(1)}
                    style={[
                      localStyles.qtyStepBtn,
                      { backgroundColor: colors.verdeSuave },
                    ]}
                    accessibilityLabel="Aumentar quantidade"
                  >
                    <FontAwesome6
                      name="plus"
                      size={13}
                      color={colors.principal}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isSimplifiedSession ? (
              <>
                <View style={ModalStyle.modalInputContainer}>
                  <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                    Unidade
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={localStyles.chipRow}
                  >
                    {UNITS.map((u) => {
                      const active = unit === u;
                      return (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnit(u)}
                          style={[
                            localStyles.chip,
                            {
                              backgroundColor: active
                                ? colors.principal
                                : colors.surfaceMuted,
                              borderColor: active
                                ? colors.principal
                                : colors.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.chipText,
                              {
                                color: active
                                  ? colors.textoPrincipal
                                  : colors.textoEscuro,
                              },
                            ]}
                          >
                            {u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={ModalStyle.modalInputContainer}>
                  <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                    Categoria
                  </Text>
                  <View style={localStyles.chipWrap}>
                    {CATEGORIES.map((cat) => {
                      const active = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => handleSelectCategory(cat)}
                          style={[
                            localStyles.chip,
                            {
                              backgroundColor: active
                                ? colors.principal
                                : colors.surfaceMuted,
                              borderColor: active
                                ? colors.principal
                                : colors.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.chipText,
                              {
                                color: active
                                  ? colors.textoPrincipal
                                  : colors.textoEscuro,
                              },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={ModalStyle.modalInputContainer}>
                  <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                    Descrição
                  </Text>
                  <TextInput
                    style={[globalStyles.input, inputThemeStyle]}
                    placeholder="Ex: Marca, tamanho, sabor... (Opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </>
            ) : null}

            {error ? (
              <Text style={[localStyles.errorText, { color: colors.logoutRed }]}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton
              onPress={handleCloseModal}
              style={ModalStyle.modalButton}
            />
            <SaveButton onPress={handleSave} style={ModalStyle.modalButton} />
          </View>
        </View>
      </View>

      <TagPhotoPreviewModal
        visible={showPhotoPreview}
        photoUri={savedPhotoUri}
        productName={name || initialItem?.name || 'Produto'}
        listName={listName}
        price={parseBRLInput(priceMasked) || Number(initialItem?.price) || 0}
        capturedAt={initialItem?.photoCapturedAt || null}
        onClose={() => setShowPhotoPreview(false)}
      />
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  headerTitleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  headerTitleText: {
    flex: 1,
    marginBottom: 0,
    textAlign: 'left',
  },
  simplifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  simplifiedPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  nameInputWrap: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  nameInputFull: {
    width: '100%',
    paddingRight: 40,
    marginBottom: 0,
  },
  inlineMicOverlay: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceMicBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  voiceRecordingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  voiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  voiceFeedbackText: {
    fontSize: 12,
    marginTop: 5,
    lineHeight: 16,
  },
  singleLineLabel: {
    fontSize: 15,
    marginBottom: 6,
  },
  ocrBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  ocrBannerText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  qtyControlWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  qtyStepBtn: {
    width: 34,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    flex: 1,
    height: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
