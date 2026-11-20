import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from '../../../components/StyleSheet/Colors';
import globalStyles from '../../../components/StyleSheet/Styles';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import {
  loadPantry,
  updatePantryQuantity,
  deletePantryItem,
  sendPantryItemToActiveList,
} from '../../storage/shoppingStorage';

export default function EstoqueList({ navigation }) {
  const [pantry, setPantry] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchPantry = useCallback(async () => {
    try {
      const data = await loadPantry();
      setPantry(data);
    } catch (error) {
      console.error('Erro ao carregar despensa:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPantry();
    const unsubscribe = navigation.addListener('focus', fetchPantry);
    return unsubscribe;
  }, [navigation, fetchPantry]);

  const handleChangeQuantity = async (itemId, delta) => {
    const updated = await updatePantryQuantity(itemId, delta);
    setPantry(updated);
  };

  const handleSendToList = async (item) => {
    const result = await sendPantryItemToActiveList(item);
    setFeedback(`"${result.itemName}" adicionado à lista "${result.listName}".`);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const updated = await deletePantryItem(itemToDelete.id);
    setPantry(updated);
    setItemToDelete(null);
  };

  const lowStockCount = pantry.filter(
    (item) => Number(item.quantity) <= Number(item.minQuantity)
  ).length;

  const renderPantryItem = ({ item }) => {
    const isLow = Number(item.quantity) <= Number(item.minQuantity);

    return (
      <View style={localStyles.card}>
        <View style={localStyles.cardTop}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={localStyles.nameRow}>
              <Text style={localStyles.itemName}>{item.name}</Text>
              {isLow ? (
                <View style={localStyles.lowBadge}>
                  <Text style={localStyles.lowBadgeText}>Acabando</Text>
                </View>
              ) : null}
            </View>
            <View style={localStyles.metaRow}>
              <View style={localStyles.categoryBadge}>
                <Text style={localStyles.categoryText}>{item.category || 'Outros'}</Text>
              </View>
              <Text style={localStyles.qtyInfo}>
                Em casa: <Text style={localStyles.qtyBold}>{item.quantity} {item.unit}</Text> • Mín: {item.minQuantity}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setItemToDelete(item)}
            style={localStyles.deleteIcon}
            accessibilityLabel={`Remover ${item.name} da despensa`}
          >
            <FontAwesome6 name="trash-can" size={16} color={AppColors.logoutRed} />
          </TouchableOpacity>
        </View>

        <View style={localStyles.cardBottom}>
          <View style={localStyles.stepper}>
            <TouchableOpacity
              onPress={() => handleChangeQuantity(item.id, -1)}
              style={localStyles.stepperBtn}
            >
              <FontAwesome6 name="minus" size={13} color={AppColors.textoEscuro} />
            </TouchableOpacity>
            <Text style={localStyles.stepperValue}>
              {item.quantity} {item.unit}
            </Text>
            <TouchableOpacity
              onPress={() => handleChangeQuantity(item.id, 1)}
              style={localStyles.stepperBtn}
            >
              <FontAwesome6 name="plus" size={13} color={AppColors.textoEscuro} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={localStyles.sendButton}
            onPress={() => handleSendToList(item)}
          >
            <FontAwesome6 name="cart-plus" size={13} color={AppColors.textoPrincipal} />
            <Text style={localStyles.sendButtonText}>+ Lista</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.screen}>
      <View style={[globalStyles.contentContainer, { flex: 1, paddingHorizontal: 16 }]}>
        <View style={localStyles.headerCard}>
          <View>
            <Text style={localStyles.headerTitle}>Controle da Despensa</Text>
            <Text style={localStyles.headerSubtitle}>
              {pantry.length} {pantry.length === 1 ? 'produto' : 'produtos'} •{' '}
              {lowStockCount > 0
                ? `${lowStockCount} em nível baixo`
                : 'Tudo abastecido'}
            </Text>
          </View>
          <TouchableOpacity
            style={localStyles.addShortcut}
            onPress={() => navigation.navigate('AddEstoqueItem')}
          >
            <FontAwesome6 name="plus" size={14} color={AppColors.principal} />
            <Text style={localStyles.addShortcutText}>Novo</Text>
          </TouchableOpacity>
        </View>

        {feedback ? (
          <View style={localStyles.banner}>
            <FontAwesome6 name="circle-check" size={16} color={AppColors.principal} />
            <Text style={localStyles.bannerText}>{feedback}</Text>
            <TouchableOpacity onPress={() => setFeedback('')}>
              <FontAwesome6 name="xmark" size={14} color={AppColors.principal} />
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading ? (
          <View style={localStyles.centered}>
            <ActivityIndicator size="large" color={AppColors.principal} />
          </View>
        ) : pantry.length === 0 ? (
          <View style={localStyles.centered}>
            <FontAwesome6 name="box-open" size={40} color={AppColors.textMuted} />
            <Text style={localStyles.emptyTitle}>Despensa vazia</Text>
            <Text style={localStyles.emptySubtitle}>
              Adicione os produtos que costuma ter em casa para acompanhar quando estiverem acabando.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pantry}
            keyExtractor={(item) => item.id}
            renderItem={renderPantryItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <ConfirmModal
        visible={Boolean(itemToDelete)}
        title="Remover da Despensa"
        message={`Deseja remover "${itemToDelete?.name || ''}" da despensa?`}
        confirmLabel="Remover"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
  },
  headerSubtitle: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  addShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.verdeSuave,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addShortcutText: {
    color: AppColors.principal,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.verdeSuave,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    color: AppColors.principal,
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginRight: 8,
  },
  lowBadge: {
    backgroundColor: AppColors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: AppColors.warning,
  },
  lowBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: AppColors.warning,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: AppColors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textMuted,
  },
  qtyInfo: {
    fontSize: 13,
    color: AppColors.textMuted,
  },
  qtyBold: {
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
  },
  deleteIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.surfaceMuted,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    minWidth: 52,
    textAlign: 'center',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.principal,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  sendButtonText: {
    color: AppColors.textoPrincipal,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
});
