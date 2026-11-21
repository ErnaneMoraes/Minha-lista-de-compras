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
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import {
  CATEGORIES,
  UNITS,
  parseDecimal,
  maskBRLInput,
  parseBRLInput,
  numberToBRLMask,
  formatCurrency,
} from '../../../src/storage/shoppingStorage';

export default function ItemFormModal({
  visible,
  initialItem = null,
  mode = 'edit',
  ocrHint = '',
  onClose,
  onSubmit,
}) {
  const { colors } = useAppSettings();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Outros');
  const [priceType, setPriceType] = useState('varejo'); // 'varejo' | 'atacado'
  const [detectedRetailPrice, setDetectedRetailPrice] = useState(0);
  const [detectedWholesalePrice, setDetectedWholesalePrice] = useState(0);
  const [priceMasked, setPriceMasked] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        const initType =
          initialItem.priceType === 'atacado' ? 'atacado' : 'varejo';
        const rPrice = Number(initialItem.retailPrice) || 0;
        const wPrice = Number(initialItem.wholesalePrice) || 0;
        const basePrice =
          Number(initialItem.price) > 0
            ? Number(initialItem.price)
            : initType === 'atacado' && wPrice > 0
            ? wPrice
            : rPrice;

        setName(initialItem.name || '');
        setQuantity(String(initialItem.quantity ?? 1));
        setUnit(initialItem.unit || 'un');
        setCategory(initialItem.category || 'Outros');
        setPriceType(initType);
        setDetectedRetailPrice(rPrice);
        setDetectedWholesalePrice(wPrice);
        setPriceMasked(numberToBRLMask(basePrice));
        setDescription(initialItem.description ?? initialItem.notes ?? '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('un');
        setCategory('Outros');
        setPriceType('varejo');
        setDetectedRetailPrice(0);
        setDetectedWholesalePrice(0);
        setPriceMasked('');
        setDescription('');
      }
      setError('');
    }
  }, [visible, initialItem]);

  const handleSelectPriceType = (nextType) => {
    setPriceType(nextType);
    if (nextType === 'atacado' && detectedWholesalePrice > 0) {
      setPriceMasked(numberToBRLMask(detectedWholesalePrice));
      if (error) setError('');
    } else if (nextType === 'varejo' && detectedRetailPrice > 0) {
      setPriceMasked(numberToBRLMask(detectedRetailPrice));
      if (error) setError('');
    }
  };

  const handlePriceChange = (text) => {
    const masked = maskBRLInput(text);
    setPriceMasked(masked);
    const numeric = parseBRLInput(masked);
    if (priceType === 'atacado') {
      setDetectedWholesalePrice(numeric);
    } else {
      setDetectedRetailPrice(numeric);
    }
    if (error) setError('');
  };

  const handleAdjustQuantity = (delta) => {
    const current = parseDecimal(quantity) || 1;
    const next = Math.max(1, Math.round((current + delta) * 100) / 100);
    setQuantity(String(next));
    if (error) setError('');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome do produto.');
      return;
    }

    const parsedPrice = parseBRLInput(priceMasked);
    if (parsedPrice <= 0) {
      setError('Informe o preço unitário em Real (maior que R$ 0,00).');
      return;
    }

    const parsedQty = parseDecimal(quantity);
    if (parsedQty <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    setError('');
    onSubmit({
      name: trimmedName,
      quantity: parsedQty,
      unit,
      category,
      price: parsedPrice,
      priceType,
      retailPrice:
        priceType === 'varejo' ? parsedPrice : detectedRetailPrice,
      wholesalePrice:
        priceType === 'atacado' ? parsedPrice : detectedWholesalePrice,
      description: description.trim(),
    });
  };

  const modalTitle = mode === 'manual' ? 'Adicionar Produto' : 'Editar Item';
  const inputThemeStyle = {
    backgroundColor: colors.inputBackground,
    borderColor: colors.borderColor,
    color: colors.textoEscuro,
  };

  const hasDualPricesDetected =
    detectedRetailPrice > 0 &&
    detectedWholesalePrice > 0 &&
    Math.abs(detectedRetailPrice - detectedWholesalePrice) >= 0.01;

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
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[ModalStyle.modalTitle, { color: colors.textoEscuro }]}>
            {modalTitle}
          </Text>

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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={ModalStyle.modalInputContainer}>
              <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                Nome do produto *
              </Text>
              <TextInput
                style={[globalStyles.input, inputThemeStyle]}
                placeholder="Ex: Leite de Coco 500ml, Arroz..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
              />
            </View>

            <View style={ModalStyle.modalInputContainer}>
              <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                Tipo de Preço
              </Text>
              <View
                style={[
                  localStyles.priceTypeRow,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectPriceType('varejo')}
                  style={[
                    localStyles.priceTypeOption,
                    priceType === 'varejo' && {
                      backgroundColor: colors.principal,
                    },
                  ]}
                >
                  <FontAwesome6
                    name={priceType === 'varejo' ? 'circle-dot' : 'circle'}
                    size={13}
                    color={
                      priceType === 'varejo'
                        ? colors.textoPrincipal
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      localStyles.priceTypeText,
                      {
                        color:
                          priceType === 'varejo'
                            ? colors.textoPrincipal
                            : colors.textoEscuro,
                      },
                    ]}
                  >
                    Varejo
                    {detectedRetailPrice > 0
                      ? ` (${formatCurrency(detectedRetailPrice)})`
                      : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectPriceType('atacado')}
                  style={[
                    localStyles.priceTypeOption,
                    priceType === 'atacado' && {
                      backgroundColor: colors.principal,
                    },
                  ]}
                >
                  <FontAwesome6
                    name={priceType === 'atacado' ? 'circle-dot' : 'circle'}
                    size={13}
                    color={
                      priceType === 'atacado'
                        ? colors.textoPrincipal
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      localStyles.priceTypeText,
                      {
                        color:
                          priceType === 'atacado'
                            ? colors.textoPrincipal
                            : colors.textoEscuro,
                      },
                    ]}
                  >
                    Atacado
                    {detectedWholesalePrice > 0
                      ? ` (${formatCurrency(detectedWholesalePrice)})`
                      : ''}
                  </Text>
                </TouchableOpacity>
              </View>
              {hasDualPricesDetected ? (
                <Text
                  style={[
                    localStyles.dualPriceHint,
                    { color: colors.principal },
                  ]}
                >
                  2 preços identificados na etiqueta! Alterne entre Varejo e Atacado para aplicar.
                </Text>
              ) : null}
            </View>

            <View style={localStyles.row}>
              <View style={[ModalStyle.modalInputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
                  Preço unit. (R$) *
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

              <View style={[ModalStyle.modalInputContainer, { flex: 1.15 }]}>
                <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
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
                      onPress={() => setCategory(cat)}
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
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
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
  priceTypeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  priceTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  priceTypeText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  dualPriceHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
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
