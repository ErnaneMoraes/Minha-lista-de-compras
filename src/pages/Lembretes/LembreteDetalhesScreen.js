import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import ModalStyle from '../../../components/StyleSheet/ModalStyle';
import CancelButton from '../../../components/common/Buttons/CancelButton';
import SaveButton from '../../../components/common/Buttons/SaveButton';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  getReminderListById,
  renameReminderList,
  addReminderListItem,
  updateReminderListItem,
  updateReminderListItemQuantity,
  deleteReminderListItem,
  normalizeCategoryName,
} from '../../storage/shoppingStorage';

function RenameReminderListModal({ visible, initialName = '', onClose, onSubmit }) {
  const { colors } = useAppSettings();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setError('');
    }
  }, [visible, initialName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome da lista de lembretes.');
      return;
    }
    setError('');
    onSubmit(trimmed);
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
            Renomear Lista de Lembretes
          </Text>

          <View style={ModalStyle.modalInputContainer}>
            <Text style={[ModalStyle.modalLabel, { color: colors.textoEscuro }]}>
              Nome da lista *
            </Text>
            <TextInput
              style={[
                globalStyles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderColor,
                  color: colors.textoEscuro,
                },
              ]}
              placeholder="Ex: Compra do Mês, Churrasco, Farmácia..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError('');
              }}
              onSubmitEditing={handleSave}
            />
          </View>

          {error ? (
            <Text style={[localStyles.errorText, { color: colors.logoutRed }]}>
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

const ReminderListItemRow = React.memo(function ReminderListItemRow({
  item,
  colors,
  radiusCard,
  borderWidth,
  onEdit,
  onDecrement,
  onIncrement,
  onRequestDelete,
}) {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const unit = item.unit || 'un';
  const notes = item.notes || item.description || '';
  const catName = normalizeCategoryName(item.category);
  const isMinQty = qty <= 1;

  return (
    <View
      style={[
        localStyles.itemCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderColor,
          borderRadius: radiusCard,
          borderWidth,
        },
      ]}
    >
      <TouchableOpacity
        style={localStyles.itemMainArea}
        activeOpacity={0.75}
        onPress={() => onEdit(item)}
      >
        <Text style={[localStyles.itemName, { color: colors.textoEscuro }]}>
          {item.name}
        </Text>

        <View style={localStyles.itemMetaRow}>
          <View
            style={[
              localStyles.categoryBadge,
              { backgroundColor: colors.badgeBg || colors.verdeSuave },
            ]}
          >
            <Text
              style={[
                localStyles.categoryBadgeText,
                { color: colors.badgeText || colors.principal },
              ]}
            >
              {catName}
            </Text>
          </View>
          <Text style={[localStyles.itemUnitText, { color: colors.textMuted }]}>
            {qty} {unit}
          </Text>
        </View>

        {notes ? (
          <Text
            style={[localStyles.itemDescription, { color: colors.textMuted }]}
          >
            {notes}
          </Text>
        ) : null}
      </TouchableOpacity>

      <View style={localStyles.itemRightActions}>
        <View
          style={[
            localStyles.quantityStepper,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.borderColor,
              borderWidth,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              isMinQty ? onRequestDelete(item) : onDecrement(item)
            }
            style={[localStyles.stepperBtn, { backgroundColor: colors.card }]}
            accessibilityLabel={
              isMinQty
                ? `Excluir ${item.name}`
                : `Diminuir quantidade de ${item.name}`
            }
          >
            <FontAwesome6
              name={isMinQty ? 'trash-can' : 'minus'}
              size={13}
              color={
                isMinQty
                  ? colors.danger || colors.logoutRed
                  : colors.textoEscuro
              }
            />
          </TouchableOpacity>

          <Text style={[localStyles.stepperVal, { color: colors.textoEscuro }]}>
            {qty}
          </Text>

          <TouchableOpacity
            onPress={() => onIncrement(item)}
            style={[localStyles.stepperBtn, { backgroundColor: colors.card }]}
            accessibilityLabel={`Aumentar quantidade de ${item.name}`}
          >
            <FontAwesome6 name="plus" size={13} color={colors.principal} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function LembreteDetalhesScreen({ route, navigation }) {
  const reminderListId = route?.params?.reminderListId;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(7, insets.bottom);
  const {
    colors,
    radiusCard,
    radiusButton,
    radiusInput,
    borderWidth,
    openSettings,
    dataVersion,
  } = useAppSettings();

  const [reminderList, setReminderList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const loadReminderList = useCallback(async () => {
    if (!reminderListId) {
      setIsLoading(false);
      return;
    }
    try {
      const found = await getReminderListById(reminderListId);
      setReminderList(found);
    } catch (error) {
      console.error('Erro ao carregar lista de lembretes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reminderListId]);

  useEffect(() => {
    loadReminderList();
    const unsubscribe = navigation.addListener('focus', loadReminderList);
    return unsubscribe;
  }, [navigation, loadReminderList, dataVersion]);

  const items = useMemo(
    () => (Array.isArray(reminderList?.items) ? reminderList.items : []),
    [reminderList]
  );

  const summaryStats = useMemo(() => {
    const totalProducts = items.length;
    const totalUnits = items.reduce(
      (acc, it) => acc + Math.max(1, Number(it.quantity) || 1),
      0
    );
    return {
      totalProducts,
      totalUnits: Math.round(totalUnits * 100) / 100,
    };
  }, [items]);

  // Configure green header matching ListaDetalhesScreen
  useEffect(() => {
    if (!reminderList) return;
    const countLabel = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;

    navigation.setOptions({
      title: reminderList.name,
      headerTitleAlign: 'left',
      headerLeftContainerStyle: {
        paddingLeft: 2,
        marginRight: 0,
      },
      headerTitleContainerStyle: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: 0,
        paddingRight: 4,
      },
      headerRightContainerStyle: {
        flexShrink: 0,
        paddingRight: 4,
      },
      headerTitle: () => (
        <View style={localStyles.headerTitleWrap}>
          <Text
            style={[
              localStyles.headerTitleName,
              { color: colors.textoPrincipal },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {reminderList.name}
          </Text>
          <Text
            style={[
              localStyles.headerTitleSub,
              { color: colors.textoPrincipal },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Lista de Lembretes • {countLabel}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={localStyles.headerRightRow}>
          <TouchableOpacity
            onPress={() => setIsRenameModalVisible(true)}
            style={localStyles.headerIconBtn}
            accessibilityLabel="Editar nome da lista de lembretes"
          >
            <FontAwesome6
              name="pen-to-square"
              size={16}
              color={colors.textoPrincipal}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openSettings}
            style={localStyles.headerIconBtn}
            accessibilityLabel="Abrir Configurações"
          >
            <FontAwesome6
              name="gear"
              size={17}
              color={colors.textoPrincipal}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [reminderList, items.length, colors, navigation, openSettings]);

  const handleRenameSubmit = async (newName) => {
    if (!reminderList) return;
    const updated = await renameReminderList(reminderList.id, newName);
    if (updated) {
      setReminderList(updated);
    }
    setIsRenameModalVisible(false);
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setIsItemModalVisible(true);
  };

  const handleOpenEditItem = useCallback((item) => {
    setEditingItem(item);
    setIsItemModalVisible(true);
  }, []);

  const handleSubmitItem = async (itemData) => {
    if (!reminderList) return;
    let updated;
    if (editingItem?.id) {
      updated = await updateReminderListItem(reminderList.id, editingItem.id, {
        name: itemData.name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        category: itemData.category,
        notes: itemData.notes ?? itemData.description ?? '',
      });
    } else {
      updated = await addReminderListItem(reminderList.id, {
        name: itemData.name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        category: itemData.category,
        notes: itemData.notes ?? itemData.description ?? '',
      });
    }
    if (updated) {
      setReminderList(updated);
    }
    setIsItemModalVisible(false);
    setEditingItem(null);
  };

  const handleIncrement = useCallback(
    async (item) => {
      if (!reminderListId) return;
      const updated = await updateReminderListItemQuantity(
        reminderListId,
        item.id,
        1
      );
      if (updated) setReminderList(updated);
    },
    [reminderListId]
  );

  const handleDecrement = useCallback(
    async (item) => {
      if (!reminderListId) return;
      const currentQty = Number(item.quantity) || 1;
      if (currentQty <= 1) return;
      const updated = await updateReminderListItemQuantity(
        reminderListId,
        item.id,
        -1
      );
      if (updated) setReminderList(updated);
    },
    [reminderListId]
  );

  const handleRequestDeleteItem = useCallback((item) => {
    setItemToDelete(item);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <ReminderListItemRow
        item={item}
        colors={colors}
        radiusCard={radiusCard}
        borderWidth={borderWidth}
        onEdit={handleOpenEditItem}
        onDecrement={handleDecrement}
        onIncrement={handleIncrement}
        onRequestDelete={handleRequestDeleteItem}
      />
    ),
    [
      colors,
      radiusCard,
      borderWidth,
      handleOpenEditItem,
      handleDecrement,
      handleIncrement,
      handleRequestDeleteItem,
    ]
  );

  const handleConfirmDeleteItem = async () => {
    if (!reminderList || !itemToDelete) return;
    const updated = await deleteReminderListItem(
      reminderList.id,
      itemToDelete.id
    );
    if (updated) setReminderList(updated);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <View
        style={[
          globalStyles.screen,
          localStyles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.principal} />
      </View>
    );
  }

  if (!reminderList) {
    return (
      <View
        style={[
          globalStyles.screen,
          localStyles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
          Lista de lembretes não encontrada
        </Text>
        <TouchableOpacity
          style={[localStyles.backButton, { backgroundColor: colors.principal }]}
          onPress={() => navigation.goBack()}
        >
          <Text
            style={[
              localStyles.backButtonText,
              { color: colors.textoPrincipal },
            ]}
          >
            Voltar aos lembretes
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const query = searchText.trim().toLowerCase();
  const filteredItems = items.filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true
  );

  const summaryText = `Total: ${summaryStats.totalProducts} ${
    summaryStats.totalProducts === 1 ? 'produto' : 'produtos'
  } • ${summaryStats.totalUnits} ${
    summaryStats.totalUnits === 1 ? 'item' : 'itens'
  }`;

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
        ]}
      >
        {items.length > 0 ? (
          <View
            style={[
              localStyles.searchRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: radiusInput,
                borderWidth,
              },
            ]}
          >
            <FontAwesome6
              name="magnifying-glass"
              size={14}
              color={colors.textMuted}
            />
            <TextInput
              style={[localStyles.searchInput, { color: colors.textoEscuro }]}
              placeholder="Buscar item nos lembretes..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <FontAwesome6 name="xmark" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {filteredItems.length === 0 ? (
          <View style={localStyles.emptyListBox}>
            <View
              style={[
                localStyles.emptyIconBox,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6
                name="clipboard-check"
                size={30}
                color={colors.principal}
              />
            </View>
            <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
              {items.length === 0
                ? 'Lista de lembretes vazia'
                : 'Nenhum item encontrado'}
            </Text>
            <Text style={[localStyles.emptySubtitle, { color: colors.textMuted }]}>
              {items.length === 0
                ? 'Toque em "+ Adicionar Item" abaixo para cadastrar itens reutilizáveis nesta lista.'
                : 'Tente limpar o filtro de busca acima.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bottom Action Bar */}
      <View
        style={[
          localStyles.bottomActionBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.borderColor,
          },
        ]}
      >
        <View style={globalStyles.contentContainer}>
          <TouchableOpacity
            style={[
              localStyles.addItemButton,
              {
                backgroundColor: colors.principal,
                borderRadius: radiusButton,
              },
            ]}
            onPress={handleOpenAddItem}
          >
            <FontAwesome6
              name="plus"
              size={15}
              color={colors.textoPrincipal}
            />
            <Text
              style={[
                localStyles.addItemButtonText,
                { color: colors.textoPrincipal },
              ]}
            >
              Adicionar Item
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clean Fixed Bottom Summary Bar */}
      <View
        style={[
          localStyles.fixedSummaryBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.principal,
            minHeight: 46 + bottomPad,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View style={[globalStyles.contentContainer, localStyles.summaryInner]}>
          <View style={localStyles.summaryLeft}>
            <FontAwesome6
              name="clipboard-check"
              size={14}
              color={colors.principal}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[localStyles.summaryText, { color: colors.textoEscuro }]}
              numberOfLines={1}
            >
              {summaryText}
            </Text>
          </View>
        </View>
      </View>

      <ItemFormModal
        visible={isItemModalVisible}
        initialItem={editingItem}
        mode={editingItem ? 'edit' : 'manual'}
        requirePrice={false}
        customTitle={
          editingItem ? 'Editar Item de Lembrete' : 'Novo Item de Lembrete'
        }
        onClose={() => {
          setIsItemModalVisible(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmitItem}
      />

      <RenameReminderListModal
        visible={isRenameModalVisible}
        initialName={reminderList.name}
        onClose={() => setIsRenameModalVisible(false)}
        onSubmit={handleRenameSubmit}
      />

      <ConfirmModal
        visible={Boolean(itemToDelete)}
        title="Excluir Item de Lembrete"
        message={`Deseja remover "${
          itemToDelete?.name || ''
        }" da lista de lembretes "${reminderList.name}"?`}
        confirmLabel="Excluir"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    fontWeight: 'bold',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 2,
  },
  headerTitleName: {
    fontSize: 19,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  headerTitleSub: {
    fontSize: 10.5,
    fontWeight: '500',
    opacity: 0.85,
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  headerIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  emptyListBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemMainArea: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemUnitText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  deleteItemBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  bottomActionBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  addItemButton: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fixedSummaryBar: {
    borderTopWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 10,
    justifyContent: 'center',
  },
  summaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
