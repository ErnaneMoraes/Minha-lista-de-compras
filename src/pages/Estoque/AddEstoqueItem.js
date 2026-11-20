import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from '../../../components/StyleSheet/Colors';
import globalStyles from '../../../components/StyleSheet/Styles';
import {
  CATEGORIES,
  UNITS,
  addPantryItem,
  parseDecimal,
} from '../../storage/shoppingStorage';

export default function AddEstoqueItem({ navigation }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minQuantity, setMinQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Mercearia');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome do produto.');
      setSuccess('');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await addPantryItem({
        name: trimmed,
        quantity: parseDecimal(quantity),
        minQuantity: Math.max(0, parseDecimal(minQuantity) || 1),
        unit,
        category,
      });
      setName('');
      setQuantity('1');
      setMinQuantity('1');
      setUnit('un');
      setCategory('Mercearia');
      setSuccess(`"${trimmed}" adicionado à sua despensa!`);
    } catch (err) {
      console.error('Erro ao adicionar à despensa:', err);
      setError('Não foi possível salvar o produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={globalStyles.screen}
      contentContainerStyle={localStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={globalStyles.contentContainer}>
        <View style={localStyles.card}>
          <Text style={localStyles.title}>Novo produto na despensa</Text>
          <Text style={localStyles.subtitle}>
            Cadastre itens que você mantém em casa para receber alerta quando estiverem acabando.
          </Text>

          {success ? (
            <View style={localStyles.successBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FontAwesome6 name="circle-check" size={16} color={AppColors.principal} />
                <Text style={localStyles.successText}>{success}</Text>
              </View>
              <TouchableOpacity
                style={localStyles.viewLinkBtn}
                onPress={() => navigation.navigate('EstoqueList')}
              >
                <Text style={localStyles.viewLinkText}>Ver despensa</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View style={localStyles.errorBanner}>
              <Text style={localStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={localStyles.fieldGroup}>
            <Text style={localStyles.label}>Nome do produto *</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Ex: Café em pó, Feijão, Sabão em pó..."
              placeholderTextColor={AppColors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
                if (success) setSuccess('');
              }}
            />
          </View>

          <View style={localStyles.row}>
            <View style={[localStyles.fieldGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={localStyles.label}>Quantidade atual</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="1"
                placeholderTextColor={AppColors.textMuted}
                keyboardType="decimal-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View style={[localStyles.fieldGroup, { flex: 1 }]}>
              <Text style={localStyles.label}>Quantidade mínima</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="1"
                placeholderTextColor={AppColors.textMuted}
                keyboardType="decimal-pad"
                value={minQuantity}
                onChangeText={setMinQuantity}
              />
            </View>
          </View>

          <View style={localStyles.fieldGroup}>
            <Text style={localStyles.label}>Unidade</Text>
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

          <View style={localStyles.fieldGroup}>
            <Text style={localStyles.label}>Categoria</Text>
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

          <TouchableOpacity
            style={localStyles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={AppColors.textoPrincipal} />
            ) : (
              <>
                <FontAwesome6 name="check" size={16} color={AppColors.textoPrincipal} />
                <Text style={localStyles.saveButtonText}>Salvar na Despensa</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginBottom: 16,
    lineHeight: 19,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.verdeSuave,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    color: AppColors.principal,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  viewLinkBtn: {
    backgroundColor: AppColors.principal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  viewLinkText: {
    color: AppColors.textoPrincipal,
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: AppColors.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: AppColors.logoutRed,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textoEscuro,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.principal,
    height: 50,
    borderRadius: 12,
    marginTop: 6,
  },
  saveButtonText: {
    color: AppColors.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
