import React, { useState, useEffect, useCallback } from 'react';
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
import globalStyles from '../../../components/StyleSheet/Styles';
import ModalStyle from '../../../components/StyleSheet/ModalStyle';
import CancelButton from '../../../components/common/Buttons/CancelButton';
import SaveButton from '../../../components/common/Buttons/SaveButton';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  loadReminderLists,
  createReminderList,
  renameReminderList,
  deleteReminderList,
  deleteMultipleReminderLists,
  addReminderListItem,
  updateReminderListItem,
  deleteReminderListItem,
  normalizeCategoryName,
} from '../../storage/shoppingStorage';

function ReminderListNameModal({
  visible,
  initialName = '',
  title = 'Nova Lista de Lembretes',
  onClose,
  onSubmit,
}) {
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
            {title}
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

export default function LembretesScreen({ navigation }) {
  const { colors, dataVersion } = useAppSettings();
  const [reminderLists, setReminderLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeListId, setActiveListId] = useState(null);

  const [isListModalVisible, setIsListModalVisible] = useState(false);
  const [editingReminderList, setEditingReminderList] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchReminderLists = useCallback(async () => {
    try {
      const data = await loadReminderLists();
      setReminderLists(data);
    } catch (error) {
      console.error('Erro ao carregar listas de lembretes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminderLists();
    const unsubscribe = navigation.addListener('focus', fetchReminderLists);
    return unsubscribe;
  }, [navigation, fetchReminderLists, dataVersion]);

  const activeReminderList =
    reminderLists.find((l) => l.id === activeListId) || null;

  useEffect(() => {
    if (activeListId && !isLoading && !activeReminderList) {
      setActiveListId(null);
    }
  }, [activeListId, isLoading, activeReminderList]);

  const handleOpenCreateList = () => {
    setEditingReminderList(null);
    setIsListModalVisible(true);
  };

  const handleOpenRenameList = (remList) => {
    setEditingReminderList(remList);
    setIsListModalVisible(true);
  };

  const handleSubmitListName = async (name) => {
    if (editingReminderList) {
      await renameReminderList(editingReminderList.id, name);
      setIsListModalVisible(false);
      setEditingReminderList(null);
      await fetchReminderLists();
    } else {
      const created = await createReminderList(name);
      setIsListModalVisible(false);
      setEditingReminderList(null);
      await fetchReminderLists();
      if (created) {
        setActiveListId(created.id);
      }
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete) return;
    const deletedId = listToDelete.id;
    await deleteReminderList(deletedId);
    setListToDelete(null);
    if (activeListId === deletedId) {
      setActiveListId(null);
    }
    await fetchReminderLists();
  };

  const toggleSelectListId = (id) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEnterSelectionMode = (initialId) => {
    setSelectionMode(true);
    setSelectedListIds(initialId ? [initialId] : []);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedListIds([]);
  };

  const handleSelectAllLists = () => {
    if (selectedListIds.length === reminderLists.length) {
      setSelectedListIds([]);
    } else {
      setSelectedListIds(reminderLists.map((l) => l.id));
    }
  };

  const handleConfirmBatchDeleteLists = async () => {
    if (selectedListIds.length === 0) return;
    await deleteMultipleReminderLists(selectedListIds);
    setShowBatchDeleteConfirm(false);
    setSelectionMode(false);
    setSelectedListIds([]);
    await fetchReminderLists();
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setIsItemModalVisible(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setIsItemModalVisible(true);
  };

  const handleSubmitItem = async (itemData) => {
    if (!activeReminderList) return;
    if (editingItem?.id) {
      await updateReminderListItem(activeReminderList.id, editingItem.id, {
        name: itemData.name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        category: itemData.category,
        notes: itemData.notes ?? itemData.description ?? '',
      });
    } else {
      await addReminderListItem(activeReminderList.id, {
        name: itemData.name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        category: itemData.category,
        notes: itemData.notes ?? itemData.description ?? '',
      });
    }
    setIsItemModalVisible(false);
    setEditingItem(null);
    await fetchReminderLists();
  };

  const handleConfirmDeleteItem = async () => {
    if (!activeReminderList || !itemToDelete) return;
    await deleteReminderListItem(activeReminderList.id, itemToDelete.id);
    setItemToDelete(null);
    await fetchReminderLists();
  };

  const renderReminderListCard = ({ item }) => {
    const items = Array.isArray(item.items) ? item.items : [];
    const isSelected = selectedListIds.includes(item.id);

    const previewCategories = Array.from(
      new Set(items.map((it) => normalizeCategoryName(it.category)))
    ).slice(0, 3);

    return (
      <TouchableOpacity
        style={[
          localStyles.listCard,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.principal : colors.borderColor,
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
            toggleSelectListId(item.id);
          } else {
            setActiveListId(item.id);
          }
        }}
      >
        <View style={localStyles.listCardHeader}>
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
                <FontAwesome6
                  name="check"
                  size={12}
                  color={colors.textoPrincipal}
                />
              ) : null}
            </View>
          ) : (
            <View
              style={[
                localStyles.listIconBadge,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6
                name="clipboard-check"
                size={17}
                color={colors.principal}
              />
            </View>
          )}

          <View style={{ flex: 1, marginRight: 10 }}>
            <Text
              style={[localStyles.listCardTitle, { color: colors.textoEscuro }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[localStyles.listCardCount, { color: colors.textMuted }]}>
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Text>

            {previewCategories.length > 0 ? (
              <View style={localStyles.previewCatRow}>
                {previewCategories.map((cat) => (
                  <View
                    key={cat}
                    style={[
                      localStyles.catBadge,
                      { backgroundColor: colors.verdeSuave },
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.catBadgeText,
                        { color: colors.principal },
                      ]}
                    >
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {!selectionMode ? (
            <View style={localStyles.cardActions}>
              <TouchableOpacity
                onPress={() => handleOpenRenameList(item)}
                style={[
                  localStyles.iconButton,
                  { backgroundColor: colors.surfaceMuted },
                ]}
                accessibilityLabel={`Renomear ${item.name}`}
              >
                <FontAwesome6
                  name="pen-to-square"
                  size={15}
                  color={colors.textoEscuro}
                />
              </TouchableOpacity>
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
                  size={15}
                  color={colors.logoutRed}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderReminderItem = ({ item }) => {
    const catName = normalizeCategoryName(item.category);
    const qty = Number(item.quantity) || 1;
    const unit = item.unit || 'un';
    const notes = item.notes || item.description || '';

    return (
      <View
        style={[
          localStyles.itemCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <TouchableOpacity
          style={localStyles.itemMainArea}
          activeOpacity={0.75}
          onPress={() => handleOpenEditItem(item)}
        >
          <Text style={[localStyles.itemName, { color: colors.textoEscuro }]}>
            {item.name}
          </Text>

          <View style={localStyles.metaRow}>
            <View
              style={[
                localStyles.catBadge,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <Text
                style={[localStyles.catBadgeText, { color: colors.principal }]}
              >
                {catName}
              </Text>
            </View>

            <View
              style={[
                localStyles.qtyPill,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text style={[localStyles.qtyPillText, { color: colors.textoEscuro }]}>
                {qty} {unit}
              </Text>
            </View>
          </View>

          {notes ? (
            <Text style={[localStyles.itemNotes, { color: colors.textMuted }]}>
              {notes}
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={localStyles.cardActions}>
          <TouchableOpacity
            onPress={() => handleOpenEditItem(item)}
            style={[
              localStyles.iconButton,
              { backgroundColor: colors.surfaceMuted },
            ]}
            accessibilityLabel={`Editar ${item.name}`}
          >
            <FontAwesome6
              name="pen-to-square"
              size={14}
              color={colors.textoEscuro}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setItemToDelete(item)}
            style={[
              localStyles.iconButton,
              { backgroundColor: colors.surfaceMuted, marginLeft: 8 },
            ]}
            accessibilityLabel={`Remover ${item.name}`}
          >
            <FontAwesome6 name="trash-can" size={14} color={colors.logoutRed} />
          </TouchableOpacity>
        </View>
      </View>
    );
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

  // VIEW 2: INSIDE AN OPENED REMINDER LIST
  if (activeReminderList) {
    const items = Array.isArray(activeReminderList.items)
      ? activeReminderList.items
      : [];

    return (
      <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
        <View
          style={[
            globalStyles.contentContainer,
            { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
          ]}
        >
          <View
            style={[
              localStyles.detailTopCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveListId(null)}
              style={[
                localStyles.backPill,
                { backgroundColor: colors.surfaceMuted },
              ]}
              accessibilityLabel="Voltar para listas de lembretes"
            >
              <FontAwesome6
                name="arrow-left"
                size={13}
                color={colors.textoEscuro}
              />
              <Text
                style={[localStyles.backPillText, { color: colors.textoEscuro }]}
              >
                Listas
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text
                style={[localStyles.detailTitle, { color: colors.textoEscuro }]}
                numberOfLines={1}
              >
                {activeReminderList.name}
              </Text>
              <Text
                style={[localStyles.detailSubtitle, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleOpenRenameList(activeReminderList)}
              style={[
                localStyles.iconButton,
                { backgroundColor: colors.surfaceMuted },
              ]}
              accessibilityLabel="Renomear lista de lembretes"
            >
              <FontAwesome6
                name="pen-to-square"
                size={15}
                color={colors.textoEscuro}
              />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
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
                    name="clipboard-check"
                    size={32}
                    color={colors.principal}
                  />
                </View>
                <Text
                  style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}
                >
                  Lista de lembretes vazia
                </Text>
                <Text
                  style={[localStyles.emptyDesc, { color: colors.textMuted }]}
                >
                  Adicione itens nesta lista de lembretes para utilizá-los nas suas compras.
                </Text>
                <TouchableOpacity
                  style={[
                    localStyles.primaryButton,
                    { backgroundColor: colors.principal },
                  ]}
                  onPress={handleOpenAddItem}
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
                    Adicionar Item
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderReminderItem}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {items.length > 0 ? (
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
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  { backgroundColor: colors.principal },
                ]}
                onPress={handleOpenAddItem}
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
                  Adicionar Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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

        <ReminderListNameModal
          visible={isListModalVisible}
          initialName={editingReminderList ? editingReminderList.name : ''}
          title={
            editingReminderList
              ? 'Renomear Lista de Lembretes'
              : 'Nova Lista de Lembretes'
          }
          onClose={() => {
            setIsListModalVisible(false);
            setEditingReminderList(null);
          }}
          onSubmit={handleSubmitListName}
        />

        <ConfirmModal
          visible={Boolean(itemToDelete)}
          title="Excluir Item de Lembrete"
          message={`Deseja remover "${
            itemToDelete?.name || ''
          }" da lista de lembretes "${activeReminderList.name}"?`}
          confirmLabel="Excluir"
          onCancel={() => setItemToDelete(null)}
          onConfirm={handleConfirmDeleteItem}
        />
      </View>
    );
  }

  // VIEW 1: ALL REMINDER LISTS
  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 16 },
        ]}
      >
        {reminderLists.length > 0 ? (
          <View style={localStyles.topActionRow}>
            {selectionMode ? (
              <>
                <TouchableOpacity
                  onPress={handleSelectAllLists}
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
                    {selectedListIds.length === reminderLists.length
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
                    Cancelar ({selectedListIds.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  style={[localStyles.listCountLabel, { color: colors.textMuted }]}
                >
                  {reminderLists.length}{' '}
                  {reminderLists.length === 1
                    ? 'lista de lembretes'
                    : 'listas de lembretes'}
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

        {reminderLists.length === 0 ? (
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
                  name="clipboard-check"
                  size={34}
                  color={colors.principal}
                />
              </View>
              <Text
                style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}
              >
                Nenhuma lista de lembretes
              </Text>
              <Text style={[localStyles.emptyDesc, { color: colors.textMuted }]}>
                Crie listas de lembretes (ex.: "Compra do Mês", "Churrasco", "Farmácia") para adicionar itens rapidamente às suas compras.
              </Text>
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  { backgroundColor: colors.principal },
                ]}
                onPress={handleOpenCreateList}
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
                  Criar Lista de Lembretes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={reminderLists}
            keyExtractor={(item) => item.id}
            renderItem={renderReminderListCard}
            contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {reminderLists.length > 0 ? (
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
                    backgroundColor:
                      selectedListIds.length > 0
                        ? colors.logoutRed
                        : colors.disabledBackground,
                  },
                ]}
                disabled={selectedListIds.length === 0}
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
                  Excluir Selecionadas ({selectedListIds.length})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  localStyles.primaryButton,
                  { backgroundColor: colors.principal },
                ]}
                onPress={handleOpenCreateList}
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
                  Criar Lista de Lembretes
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      <ReminderListNameModal
        visible={isListModalVisible}
        initialName={editingReminderList ? editingReminderList.name : ''}
        title={
          editingReminderList
            ? 'Renomear Lista de Lembretes'
            : 'Nova Lista de Lembretes'
        }
        onClose={() => {
          setIsListModalVisible(false);
          setEditingReminderList(null);
        }}
        onSubmit={handleSubmitListName}
      />

      <ConfirmModal
        visible={Boolean(listToDelete)}
        title="Excluir Lista de Lembretes"
        message={`Deseja excluir a lista de lembretes "${
          listToDelete?.name || ''
        }" e todos os seus itens?`}
        confirmLabel="Excluir"
        onCancel={() => setListToDelete(null)}
        onConfirm={handleConfirmDeleteList}
      />

      <ConfirmModal
        visible={showBatchDeleteConfirm}
        title="Excluir Listas de Lembretes"
        message={`Deseja excluir permanentemente ${selectedListIds.length} ${
          selectedListIds.length === 1
            ? 'lista de lembretes selecionada'
            : 'listas de lembretes selecionadas'
        }?`}
        confirmLabel="Excluir Todas"
        onCancel={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDeleteLists}
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
  },
  listCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  listCardCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewCatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 9,
    borderRadius: 10,
  },
  detailTopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  detailSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemMainArea: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  catBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
    marginBottom: 2,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qtyPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  qtyPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
