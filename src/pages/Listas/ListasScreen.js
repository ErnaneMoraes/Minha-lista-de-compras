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
import ListFormModal from '../../../components/modals/ShoppingModals/ListFormModal';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import {
  loadLists,
  createList,
  renameList,
  deleteList,
  calculateListStats,
  formatCurrency,
  formatDateBR,
} from '../../storage/shoppingStorage';

export default function ListasScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);

  const fetchLists = useCallback(async () => {
    try {
      const data = await loadLists();
      setLists(data);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
    const unsubscribe = navigation.addListener('focus', fetchLists);
    return unsubscribe;
  }, [navigation, fetchLists]);

  const handleOpenCreate = () => {
    setEditingList(null);
    setIsFormVisible(true);
  };

  const handleOpenRename = (list) => {
    setEditingList(list);
    setIsFormVisible(true);
  };

  const handleSubmitList = async (name) => {
    if (editingList) {
      await renameList(editingList.id, name);
      setIsFormVisible(false);
      setEditingList(null);
      await fetchLists();
    } else {
      const created = await createList(name);
      setIsFormVisible(false);
      setEditingList(null);
      await fetchLists();
      if (created) {
        navigation.navigate('ListaDetalhes', {
          listId: created.id,
          listName: created.name,
        });
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;
    await deleteList(listToDelete.id);
    setListToDelete(null);
    await fetchLists();
  };

  const renderListCard = ({ item }) => {
    const stats = calculateListStats(item);
    const createdDate = formatDateBR(item.createdAt);

    return (
      <TouchableOpacity
        style={localStyles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ListaDetalhes', {
            listId: item.id,
            listName: item.name,
          })
        }
      >
        <View style={localStyles.cardHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={localStyles.cardTitle}>{item.name}</Text>
            <View style={localStyles.dateRow}>
              <FontAwesome6 name="calendar-days" size={12} color={AppColors.textMuted} />
              <Text style={localStyles.dateText}>Criada em {createdDate}</Text>
            </View>
          </View>

          <View style={localStyles.cardActions}>
            <TouchableOpacity
              onPress={() => handleOpenRename(item)}
              style={localStyles.iconButton}
              accessibilityLabel={`Renomear ${item.name}`}
            >
              <FontAwesome6 name="pen-to-square" size={17} color={AppColors.textoEscuro} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setListToDelete(item)}
              style={[localStyles.iconButton, { marginLeft: 8 }]}
              accessibilityLabel={`Excluir ${item.name}`}
            >
              <FontAwesome6 name="trash-can" size={17} color={AppColors.logoutRed} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.cardFooter}>
          <Text style={localStyles.itemCountText}>
            {stats.totalItems} {stats.totalItems === 1 ? 'produto' : 'produtos'} •{' '}
            {stats.totalQuantity} {stats.totalQuantity === 1 ? 'unidade' : 'unidades'}
          </Text>
          <View style={localStyles.totalBadge}>
            <Text style={localStyles.totalValue}>{formatCurrency(stats.estimatedTotal)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={globalStyles.screen}>
      <View style={[globalStyles.contentContainer, { flex: 1, paddingHorizontal: 16 }]}>
        {isLoading ? (
          <View style={localStyles.centered}>
            <ActivityIndicator size="large" color={AppColors.principal} />
          </View>
        ) : lists.length === 0 ? (
          <View style={localStyles.emptyContainer}>
            <View style={localStyles.emptyCard}>
              <View style={localStyles.emptyIconCircle}>
                <FontAwesome6 name="cart-shopping" size={34} color={AppColors.principal} />
              </View>
              <Text style={localStyles.emptyTitle}>Nenhuma lista criada ainda</Text>
              <Text style={localStyles.emptyDesc}>
                Organize suas compras offline, fotografe etiquetas de preço e acompanhe o valor total no mercado.
              </Text>
              <TouchableOpacity
                style={localStyles.primaryButton}
                onPress={handleOpenCreate}
              >
                <FontAwesome6 name="plus" size={16} color={AppColors.textoPrincipal} />
                <Text style={localStyles.primaryButtonText}>Criar Nova Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderListCard}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {!isLoading && lists.length > 0 ? (
        <View style={localStyles.fixedFooter}>
          <View style={globalStyles.contentContainer}>
            <TouchableOpacity
              style={[localStyles.primaryButton, { marginTop: 0 }]}
              onPress={handleOpenCreate}
            >
              <FontAwesome6 name="plus" size={16} color={AppColors.textoPrincipal} />
              <Text style={localStyles.primaryButtonText}>Criar Nova Lista</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ListFormModal
        visible={isFormVisible}
        initialName={editingList ? editingList.name : ''}
        title={editingList ? 'Renomear Lista' : 'Criar Nova Lista'}
        onClose={() => {
          setIsFormVisible(false);
          setEditingList(null);
        }}
        onSubmit={handleSubmitList}
      />

      <ConfirmModal
        visible={Boolean(listToDelete)}
        title="Excluir Lista"
        message={`Deseja excluir a lista "${listToDelete?.name || ''}" e todos os seus produtos?`}
        confirmLabel="Excluir"
        onCancel={() => setListToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCard: {
    width: '100%',
    backgroundColor: AppColors.card,
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: AppColors.verdeSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.principal,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: AppColors.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fixedFooter: {
    backgroundColor: AppColors.card,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 6,
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginBottom: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 9,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.surfaceMuted,
  },
  itemCountText: {
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  totalBadge: {
    backgroundColor: AppColors.verdeSuave,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: AppColors.principal,
  },
});
