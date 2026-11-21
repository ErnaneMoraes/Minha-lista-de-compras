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
import globalStyles from '../../../components/StyleSheet/Styles';
import ListFormModal from '../../../components/modals/ShoppingModals/ListFormModal';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  loadLists,
  createList,
  updateListDetails,
  deleteList,
  deleteMultipleLists,
  calculateListStats,
  formatCurrency,
  formatListDateLabel,
} from '../../storage/shoppingStorage';

export default function ListasScreen({ navigation }) {
  const { colors, dataVersion } = useAppSettings();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

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
  }, [navigation, fetchLists, dataVersion]);

  const handleOpenCreate = () => {
    setEditingList(null);
    setIsFormVisible(true);
  };

  const handleOpenEdit = (list) => {
    setEditingList(list);
    setIsFormVisible(true);
  };

  const handleSubmitList = async (payload) => {
    const name = typeof payload === 'object' ? payload.name : payload;
    const budget = typeof payload === 'object' ? payload.budget : 0;
    const createdAt = typeof payload === 'object' ? payload.createdAt : null;

    if (editingList) {
      await updateListDetails(editingList.id, { name, budget, createdAt });
      setIsFormVisible(false);
      setEditingList(null);
      await fetchLists();
    } else {
      const created = await createList({ name, budget, createdAt });
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

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEnterSelectionMode = (initialId) => {
    setSelectionMode(true);
    setSelectedIds(initialId ? [initialId] : []);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === lists.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(lists.map((l) => l.id));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteMultipleLists(selectedIds);
    setShowBatchDeleteConfirm(false);
    setSelectionMode(false);
    setSelectedIds([]);
    await fetchLists();
  };

  const renderListCard = ({ item }) => {
    const stats = calculateListStats(item);
    const dateLabel = formatListDateLabel(item);
    const isCompleted = Boolean(item.completed);
    const isSelected = selectedIds.includes(item.id);

    let totalBadgeBg = colors.verdeSuave;
    let totalBadgeText = colors.principal;
    if (stats.budgetStatus === 'warning') {
      totalBadgeBg = colors.budgetWarningBg;
      totalBadgeText = colors.budgetWarningText;
    } else if (stats.budgetStatus === 'exceeded') {
      totalBadgeBg = colors.budgetDangerBg;
      totalBadgeText = colors.budgetDangerText;
    }

    return (
      <TouchableOpacity
        style={[
          localStyles.card,
          {
            backgroundColor: colors.card,
            borderColor: isSelected
              ? colors.principal
              : isCompleted
                ? colors.verdePrincipal
                : colors.borderColor,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        activeOpacity={0.85}
        onLongPress={() => {
          if (!selectionMode) {
            handleEnterSelectionMode(item.id);
          }
        }}
        onPress={() => {
          if (selectionMode) {
            toggleSelectId(item.id);
          } else {
            navigation.navigate('ListaDetalhes', {
              listId: item.id,
              listName: item.name,
            });
          }
        }}
      >
        <View style={localStyles.cardHeader}>
          {selectionMode ? (
            <View
              style={[
                localStyles.selectionCheckbox,
                {
                  borderColor: isSelected ? colors.principal : colors.textMuted,
                  backgroundColor: isSelected ? colors.principal : 'transparent',
                },
              ]}
            >
              {isSelected ? (
                <FontAwesome6 name="check" size={12} color={colors.textoPrincipal} />
              ) : null}
            </View>
          ) : null}

          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={localStyles.titleRow}>
              <Text
                style={[localStyles.cardTitle, { color: colors.textoEscuro }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {isCompleted ? (
                <View
                  style={[
                    localStyles.completedBadge,
                    { backgroundColor: colors.verdeSuave },
                  ]}
                >
                  <FontAwesome6
                    name="circle-check"
                    size={11}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      localStyles.completedBadgeText,
                      { color: colors.principal },
                    ]}
                  >
                    Finalizada
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={localStyles.dateRow}>
              <FontAwesome6
                name="calendar-days"
                size={12}
                color={colors.textMuted}
              />
              <Text style={[localStyles.dateText, { color: colors.textMuted }]}>
                {dateLabel}
              </Text>
            </View>

            {stats.budget > 0 ? (
              <View style={localStyles.budgetRow}>
                <FontAwesome6
                  name="wallet"
                  size={11}
                  color={colors.textMuted}
                />
                <Text
                  style={[localStyles.budgetText, { color: colors.textMuted }]}
                >
                  Orçamento: {formatCurrency(stats.budget)}
                </Text>
              </View>
            ) : null}
          </View>

          {!selectionMode ? (
            <View style={localStyles.cardActions}>
              {!isCompleted ? (
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  style={[
                    localStyles.iconButton,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                  accessibilityLabel={`Editar ${item.name}`}
                >
                  <FontAwesome6
                    name="pen-to-square"
                    size={16}
                    color={colors.textoEscuro}
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => setListToDelete(item)}
                style={[
                  localStyles.iconButton,
                  { backgroundColor: colors.surfaceMuted, marginLeft: 8 },
                ]}
                accessibilityLabel={`Excluir ${item.name}`}
              >
                <FontAwesome6
                  name="trash-can"
                  size={16}
                  color={colors.logoutRed}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View
          style={[
            localStyles.cardFooter,
            { borderTopColor: colors.surfaceMuted },
          ]}
        >
          <Text style={[localStyles.itemCountText, { color: colors.textMuted }]}>
            {stats.totalItems} {stats.totalItems === 1 ? 'produto' : 'produtos'} •{' '}
            {stats.totalQuantity} {stats.totalQuantity === 1 ? 'unidade' : 'unidades'}
          </Text>
          <View
            style={[localStyles.totalBadge, { backgroundColor: totalBadgeBg }]}
          >
            <Text style={[localStyles.totalValue, { color: totalBadgeText }]}>
              {formatCurrency(stats.estimatedTotal)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 16 },
        ]}
      >
        {!isLoading && lists.length > 0 ? (
          <View style={localStyles.topActionRow}>
            {selectionMode ? (
              <>
                <TouchableOpacity
                  onPress={handleSelectAll}
                  style={[
                    localStyles.selectPill,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <FontAwesome6
                    name="check-double"
                    size={12}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      localStyles.selectPillText,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    {selectedIds.length === lists.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExitSelectionMode}
                  style={[
                    localStyles.selectPill,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.selectPillText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Cancelar ({selectedIds.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[localStyles.listCountLabel, { color: colors.textMuted }]}>
                  {lists.length} {lists.length === 1 ? 'compra registrada' : 'compras registradas'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleEnterSelectionMode(null)}
                  style={[
                    localStyles.selectPill,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <FontAwesome6
                    name="list-check"
                    size={12}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      localStyles.selectPillText,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Selecionar
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {isLoading ? (
          <View style={localStyles.centered}>
            <ActivityIndicator size="large" color={colors.principal} />
          </View>
        ) : lists.length === 0 ? (
          <View style={localStyles.emptyContainer}>
            <View
              style={[
                localStyles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View
                style={[
                  localStyles.emptyIconCircle,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name="cart-shopping"
                  size={34}
                  color={colors.principal}
                />
              </View>
              <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
                Nenhuma lista criada ainda
              </Text>
              <Text style={[localStyles.emptyDesc, { color: colors.textMuted }]}>
                Defina um orçamento opcional, fotografe etiquetas de preço e acompanhe o valor total no mercado.
              </Text>
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  { backgroundColor: colors.principal },
                ]}
                onPress={handleOpenCreate}
              >
                <FontAwesome6
                  name="plus"
                  size={16}
                  color={colors.textoPrincipal}
                />
                <Text
                  style={[
                    localStyles.primaryButtonText,
                    { color: colors.textoPrincipal },
                  ]}
                >
                  Criar Nova Lista
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderListCard}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {!isLoading && lists.length > 0 ? (
        <View
          style={[
            localStyles.fixedFooter,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.borderColor,
            },
          ]}
        >
          <View style={globalStyles.contentContainer}>
            {selectionMode ? (
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  {
                    marginTop: 0,
                    backgroundColor:
                      selectedIds.length > 0
                        ? colors.logoutRed
                        : colors.disabledBackground,
                  },
                ]}
                disabled={selectedIds.length === 0}
                onPress={() => setShowBatchDeleteConfirm(true)}
              >
                <FontAwesome6
                  name="trash-can"
                  size={15}
                  color={colors.textoPrincipal}
                />
                <Text
                  style={[
                    localStyles.primaryButtonText,
                    { color: colors.textoPrincipal },
                  ]}
                >
                  Excluir Selecionadas ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  { marginTop: 0, backgroundColor: colors.principal },
                ]}
                onPress={handleOpenCreate}
              >
                <FontAwesome6
                  name="plus"
                  size={16}
                  color={colors.textoPrincipal}
                />
                <Text
                  style={[
                    localStyles.primaryButtonText,
                    { color: colors.textoPrincipal },
                  ]}
                >
                  Criar Nova Lista
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      <ListFormModal
        visible={isFormVisible}
        initialName={editingList ? editingList.name : ''}
        initialBudget={editingList ? editingList.budget : 0}
        initialDate={editingList ? editingList.createdAt : null}
        showDateField={Boolean(editingList)}
        title={editingList ? 'Editar Lista, Data e Orçamento' : 'Criar Nova Lista'}
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

      <ConfirmModal
        visible={showBatchDeleteConfirm}
        title="Excluir Listas Selecionadas"
        message={`Deseja excluir permanentemente ${selectedIds.length} ${selectedIds.length === 1 ? 'lista selecionada' : 'listas selecionadas'
          }?`}
        confirmLabel="Excluir Todas"
        onCancel={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
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
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  listCountLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  primaryButton: {
    width: '100%',
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fixedFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 6,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    marginLeft: 6,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  budgetText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 9,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
