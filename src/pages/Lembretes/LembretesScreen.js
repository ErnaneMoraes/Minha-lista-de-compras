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
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  loadReminderLists,
  createReminderList,
  renameReminderList,
  deleteReminderList,
  deleteMultipleReminderLists,
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
  const { colors, radiusCard, radiusButton, borderWidth, dataVersion } =
    useAppSettings();
  const [reminderLists, setReminderLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isListModalVisible, setIsListModalVisible] = useState(false);
  const [editingReminderList, setEditingReminderList] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

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
        navigation.navigate('LembreteDetalhes', {
          reminderListId: created.id,
        });
      }
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete) return;
    await deleteReminderList(listToDelete.id);
    setListToDelete(null);
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
            borderWidth: isSelected ? 2 : borderWidth,
            borderRadius: radiusCard,
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
            navigation.navigate('LembreteDetalhes', {
              reminderListId: item.id,
            });
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
                  {
                    backgroundColor: colors.principal,
                    borderRadius: radiusButton,
                  },
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
                  {
                    backgroundColor: colors.principal,
                    borderRadius: radiusButton,
                  },
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 9,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
});
