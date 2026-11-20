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
import { AppColors } from '../../StyleSheet/Colors';
import ModalStyle from '../../StyleSheet/ModalStyle';
import globalStyles from '../../StyleSheet/Styles';
import CancelButton from '../../common/Buttons/CancelButton';
import SaveButton from '../../common/Buttons/SaveButton';
import {
  CATEGORIES,
  UNITS,
  parseDecimal,
  maskBRLInput,
  parseBRLInput,
  numberToBRLMask,
} from '../../../src/storage/shoppingStorage';

export default function ItemFormModal({
  visible,
  initialItem = null,
  mode = 'edit',
  ocrHint = '',
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Outros');
  const [priceMasked, setPriceMasked] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        setName(initialItem.name || '');
        setQuantity(String(initialItem.quantity ?? 1));
        setUnit(initialItem.unit || 'un');
        setCategory(initialItem.category || 'Outros');
        setPriceMasked(numberToBRLMask(initialItem.price));
        setDescription(initialItem.description ?? initialItem.notes ?? '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('un');
        setCategory('Outros');
        setPriceMasked('');
        setDescription('');
      }
      setError('');
    }
  }, [visible, initialItem]);

  const handlePriceChange = (text) => {
    setPriceMasked(maskBRLInput(text));
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
      description: description.trim(),
    });
  };

  const modalTitle = mode === 'manual' ? 'Adicionar Produto' : 'Editar Item';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>{modalTitle}</Text>

          {mode === 'ocr' ? (
            <View
              style={[
                localStyles.ocrBanner,
                ocrHint ? localStyles.ocrBannerWarn : localStyles.ocrBannerOk,
              ]}
            >
              <FontAwesome6
                name={ocrHint ? 'circle-exclamation' : 'circle-check'}
                size={15}
                color={ocrHint ? AppColors.warning : AppColors.principal}
              />
              <Text
                style={[
                  localStyles.ocrBannerText,
                  { color: ocrHint ? AppColors.warning : AppColors.principal },
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
              <Text style={ModalStyle.modalLabel}>Nome do produto *</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Ex: Leite de Coco 500ml, Arroz..."
                placeholderTextColor={AppColors.textMuted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
              />
            </View>

            <View style={localStyles.row}>
              <View style={[ModalStyle.modalInputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={ModalStyle.modalLabel}>Preço unit. (R$) *</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="R$ 0,00"
                  placeholderTextColor={AppColors.textMuted}
                  keyboardType="numeric"
                  value={priceMasked}
                  onChangeText={handlePriceChange}
                />
              </View>

              <View style={[ModalStyle.modalInputContainer, { flex: 1 }]}>
                <Text style={ModalStyle.modalLabel}>Quantidade</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="1"
                  placeholderTextColor={AppColors.textMuted}
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    if (error) setError('');
                  }}
                />
              </View>
            </View>

            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Unidade</Text>
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
                      style={[localStyles.chip, active && localStyles.chipActive]}
                    >
                      <Text style={[localStyles.chipText, active && localStyles.chipTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Categoria</Text>
              <View style={localStyles.chipWrap}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[localStyles.chip, active && localStyles.chipActive]}
                    >
                      <Text style={[localStyles.chipText, active && localStyles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Descrição (opcional)</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Ex: Marca, tamanho, sabor, observação..."
                placeholderTextColor={AppColors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {error ? <Text style={localStyles.errorText}>{error}</Text> : null}
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
  ocrBannerOk: {
    backgroundColor: AppColors.verdeSuave,
  },
  ocrBannerWarn: {
    backgroundColor: AppColors.warningSoft,
  },
  ocrBannerText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
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
    backgroundColor: AppColors.surfaceMuted,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: AppColors.principal,
    borderColor: AppColors.principal,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textoEscuro,
  },
  chipTextActive: {
    color: AppColors.textoPrincipal,
  },
  errorText: {
    color: AppColors.logoutRed,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
