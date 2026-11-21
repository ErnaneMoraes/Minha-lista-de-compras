import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
  const { colors, radiusCard, radiusButton, radiusInput, borderWidth } =
    useAppSettings();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Outros');
  const [hasManualCategory, setHasManualCategory] = useState(false);
  const [priceMasked, setPriceMasked] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  useEffect(() => {
    loadLearnedCategories();
  }, []);

  useEffect(() => {
    if (visible) {
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
        setPriceMasked(numberToBRLMask(basePrice));
        setDescription(initialItem.description ?? initialItem.notes ?? '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('un');
        setCategory('Outros');
        setHasManualCategory(false);
        setPriceMasked('');
        setDescription('');
      }
      setError('');
    }
  }, [visible, initialItem]);

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
  const savedPhotoUri = initialItem?.photoFilename
    ? getTagPhotoUri(initialItem.photoFilename)
    : null;
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
      onRequestClose={onClose}
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
          <Text style={[ModalStyle.modalTitle, { color: colors.textoEscuro }]}>
            {modalTitle}
          </Text>

          {savedPhotoUri ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPhotoPreview(true)}
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                paddingHorizontal: 12,
                marginBottom: 10,
                backgroundColor: colors.verdeSuave,
                borderColor: colors.principal,
                borderWidth: 1,
                borderRadius: radiusButton,
              }}
              accessibilityLabel="Ver foto da etiqueta salva"
            >
              <FontAwesome6
                name="image"
                size={14}
                color={colors.badgeText || colors.principal}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: 'bold',
                  color: colors.badgeText || colors.principal,
                }}
              >
                Ver foto da etiqueta
              </Text>
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
              <TextInput
                style={[globalStyles.input, inputThemeStyle]}
                placeholder="Ex: Dipirona, Leite, Sabonete, Arroz..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={handleNameChange}
              />
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

            {error ? (
              <Text style={[localStyles.errorText, { color: colors.logoutRed }]}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton onPress={onClose} style={ModalStyle.modalButton} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
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
