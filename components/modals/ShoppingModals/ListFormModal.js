import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import ModalStyle from '../../StyleSheet/ModalStyle';
import globalStyles from '../../StyleSheet/Styles';
import CancelButton from '../../common/Buttons/CancelButton';
import SaveButton from '../../common/Buttons/SaveButton';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import {
  maskBRLInput,
  parseBRLInput,
  numberToBRLMask,
  formatDateBR,
} from '../../../src/storage/shoppingStorage';

function toValidDate(isoString) {
  if (!isoString) return new Date();
  const parsed = new Date(isoString);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function ListFormModal({
  visible,
  initialName = '',
  initialBudget = 0,
  initialDate = null,
  showDateField = false,
  title = 'Criar Nova Lista',
  onClose,
  onSubmit,
}) {
  const { colors, darkMode } = useAppSettings();
  const [name, setName] = useState('');
  const [budgetMasked, setBudgetMasked] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setBudgetMasked(numberToBRLMask(initialBudget));
      setSelectedDate(toValidDate(initialDate));
      setShowDatePicker(false);
      setError('');
    }
  }, [visible, initialName, initialBudget, initialDate]);

  const handleDateChange = (event, pickedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event?.type === 'dismissed') {
      return;
    }
    if (pickedDate && !Number.isNaN(pickedDate.getTime())) {
      setSelectedDate(pickedDate);
      if (error) setError('');
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome da lista.');
      return;
    }

    const parsedBudget = parseBRLInput(budgetMasked);
    const createdAtIso = showDateField
      ? selectedDate.toISOString()
      : new Date().toISOString();

    setError('');
    onSubmit({
      name: trimmed,
      budget: parsedBudget,
      createdAt: createdAtIso,
    });
  };

  const inputThemeStyle = {
    backgroundColor: colors.inputBackground,
    borderColor: colors.borderColor,
    color: colors.textoEscuro,
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
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[ModalStyle.modalTitle, { color: colors.textoEscuro }]}>
            {title}
          </Text>

          <View style={ModalStyle.modalInputContainer}>
            <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
              Nome da lista *
            </Text>
            <TextInput
              style={[globalStyles.input, inputThemeStyle]}
              placeholder="Ex: Compras do Mês, Feira, Churrasco..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
            />
          </View>

          <View style={ModalStyle.modalInputContainer}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 5,
              }}
            >
              <Text
                style={[
                  ModalStyle.modalLabel,
                  { color: colors.textoEscuro, marginBottom: 0 },
                ]}
              >
                Orçamento Máximo (R$)
              </Text>
              {budgetMasked ? (
                <TouchableOpacity onPress={() => setBudgetMasked('')}>
                  <Text
                    style={{
                      color: colors.logoutRed,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    Remover limite
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={[globalStyles.input, inputThemeStyle]}
              placeholder="Ex: 300,00 (Opcional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={budgetMasked}
              onChangeText={(text) => setBudgetMasked(maskBRLInput(text))}
              onSubmitEditing={showDateField ? undefined : handleSave}
            />
          </View>

          {showDateField ? (
            <View style={ModalStyle.modalInputContainer}>
              <Text
                style={[
                  ModalStyle.modalLabel,
                  { color: colors.textoEscuro },
                ]}
              >
                Data da lista *
              </Text>

              {Platform.OS === 'web' ? (
                <View
                  style={[
                    globalStyles.input,
                    inputThemeStyle,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                >
                  <input
                    type="date"
                    value={selectedDate.toISOString().slice(0, 10)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const [y, m, d] = val.split('-').map(Number);
                        const next = new Date(y, m - 1, d, 12, 0, 0);
                        if (!Number.isNaN(next.getTime())) {
                          setSelectedDate(next);
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: colors.textoEscuro,
                      fontSize: 15,
                    }}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      globalStyles.input,
                      inputThemeStyle,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 14,
                      },
                    ]}
                    accessibilityLabel="Selecionar data da lista"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FontAwesome6
                        name="calendar-days"
                        size={15}
                        color={colors.principal}
                      />
                      <Text
                        style={{
                          color: colors.textoEscuro,
                          fontSize: 15,
                          fontWeight: '600',
                          marginLeft: 10,
                        }}
                      >
                        {formatDateBR(selectedDate.toISOString())}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.principal,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      Alterar
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker ? (
                    <View style={{ marginTop: 6 }}>
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant={darkMode ? 'dark' : 'light'}
                        onChange={handleDateChange}
                      />
                      {Platform.OS === 'ios' ? (
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                          style={{
                            alignSelf: 'flex-end',
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.principal,
                              fontWeight: 'bold',
                              fontSize: 13,
                            }}
                          >
                            Confirmar data
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {error ? (
            <Text
              style={{
                color: colors.logoutRed,
                fontSize: 13,
                marginBottom: 8,
                alignSelf: 'flex-start',
                fontWeight: '600',
              }}
            >
              {error}
            </Text>
          ) : null}

          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton onPress={onClose} style={ModalStyle.modalButton} />
            <SaveButton onPress={handleSave} style={ModalStyle.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
