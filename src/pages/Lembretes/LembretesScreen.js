import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import globalStyles from '../../../components/StyleSheet/Styles';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import ListFormModal from '../../../components/modals/ShoppingModals/ListFormModal';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  CATEGORIES,
  loadReminders,
  addReminderItem,
  setReminderChecked,
  deleteReminderItem,
  clearCheckedReminders,
  sendCheckedRemindersToActiveList,
  getLatestOpenList,
  createList,
  addItemToList,
} from '../../storage/shoppingStorage';

export default function LembretesScreen({ navigation }) {
  const { colors, dataVersion } = useAppSettings();
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputName, setInputName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Mercearia');
  const [banner, setBanner] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Automatic flow states when checking a reminder item
  const [activeReminderForAdd, setActiveReminderForAdd] = useState(null);
  const [targetOpenList, setTargetOpenList] = useState(null);
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [showCreateListPrompt, setShowCreateListPrompt] = useState(false);
  const [isCreateListModalVisible, setIsCreateListModalVisible] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await loadReminders();
      setReminders(data);
    } catch (error) {
      console.error('Erro ao carregar lista de lembretes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    const unsubscribe = navigation.addListener('focus', fetchReminders);
    return unsubscribe;
  }, [navigation, fetchReminders, dataVersion]);

  const handleAddReminder = async () => {
    const trimmed = inputName.trim();
    if (!trimmed) return;
    const updated = await addReminderItem({
      name: trimmed,
      quantity: 1,
      unit: 'un',
      category: selectedCategory,
    });
    if (updated) {
      setReminders(updated);
      setInputName('');
      setBanner(null);
    }
  };

  const handleToggleReminder = async (item) => {
    // If already checked, simply uncheck it
    if (item.checked) {
      const updated = await setReminderChecked(item.id, false);
      setReminders(updated);
      return;
    }

    // Mark as checked immediately in UI and check for latest open shopping list
    const updated = await setReminderChecked(item.id, true);
    setReminders(updated);
    setActiveReminderForAdd(item);

    const latestOpen = await getLatestOpenList();
    if (latestOpen) {
      setTargetOpenList(latestOpen);
      setIsAddItemModalVisible(true);
    } else {
      setShowCreateListPrompt(true);
    }
  };

  const handleCancelAddReminderToList = async () => {
    setIsAddItemModalVisible(false);
    if (activeReminderForAdd) {
      const updated = await setReminderChecked(activeReminderForAdd.id, false);
      setReminders(updated);
    }
    setActiveReminderForAdd(null);
    setTargetOpenList(null);
  };

  const handleConfirmSaveItemToList = async (itemData) => {
    if (!targetOpenList) return;
    await addItemToList(targetOpenList.id, itemData);
    setIsAddItemModalVisible(false);
    setBanner({
      type: 'ok',
      text: `${itemData.name} adicionado na lista ${targetOpenList.name}`,
      listId: targetOpenList.id,
      listName: targetOpenList.name,
    });
    setActiveReminderForAdd(null);
    setTargetOpenList(null);
  };

  const handleCancelCreateListPrompt = async () => {
    setShowCreateListPrompt(false);
    if (activeReminderForAdd) {
      const updated = await setReminderChecked(activeReminderForAdd.id, false);
      setReminders(updated);
    }
    setActiveReminderForAdd(null);
  };

  const handleProceedToCreateList = () => {
    setShowCreateListPrompt(false);
    setIsCreateListModalVisible(true);
  };

  const handleCancelCreateListModal = async () => {
    setIsCreateListModalVisible(false);
    if (activeReminderForAdd) {
      const updated = await setReminderChecked(activeReminderForAdd.id, false);
      setReminders(updated);
    }
    setActiveReminderForAdd(null);
  };

  const handleCreatedNewListFromReminder = async ({ name, budget, createdAt }) => {
    const created = await createList({ name, budget, createdAt });
    setIsCreateListModalVisible(false);
    if (created && activeReminderForAdd) {
      setTargetOpenList(created);
      setIsAddItemModalVisible(true);
    }
  };

  const handleDelete = async (id) => {
    const updated = await deleteReminderItem(id);
    setReminders(updated);
  };

  const handleConfirmClearChecked = async () => {
    const updated = await clearCheckedReminders();
    setReminders(updated);
    setShowClearConfirm(false);
    setBanner({
      type: 'ok',
      text: 'Itens marcados foram removidos da lista de lembrete.',
    });
  };

  const handleSendToActivePurchase = async () => {
    const res = await sendCheckedRemindersToActiveList();
    if (!res) return;
    setBanner({
      type: 'ok',
      text: `${res.addedCount} ${
        res.addedCount === 1 ? 'item enviado' : 'itens enviados'
      } para a lista "${res.listName}".`,
      listId: res.listId,
      listName: res.listName,
    });
  };

  const checkedCount = reminders.filter((r) => r.checked).length;
  const pendingCount = reminders.length - checkedCount;

  const renderReminderItem = ({ item }) => {
    return (
      <View
        style={[
          localStyles.itemCard,
          {
            backgroundColor: colors.card,
            borderColor: item.checked ? colors.principal : colors.borderColor,
            opacity: item.checked ? 0.8 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={localStyles.checkArea}
          activeOpacity={0.75}
          onPress={() => handleToggleReminder(item)}
        >
          <View
            style={[
              localStyles.checkbox,
              {
                borderColor: item.checked ? colors.principal : colors.textMuted,
                backgroundColor: item.checked ? colors.principal : 'transparent',
              },
            ]}
          >
            {item.checked ? (
              <FontAwesome6 name="check" size={12} color={colors.textoPrincipal} />
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                localStyles.itemName,
                {
                  color: item.checked ? colors.textMuted : colors.textoEscuro,
                  textDecorationLine: item.checked ? 'line-through' : 'none',
                },
              ]}
            >
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
                  {item.category || 'Outros'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={[
            localStyles.deleteBtn,
            { backgroundColor: colors.surfaceMuted },
          ]}
          accessibilityLabel={`Remover ${item.name}`}
        >
          <FontAwesome6 name="trash-can" size={15} color={colors.logoutRed} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
        ]}
      >
        <View
          style={[
            localStyles.addBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text style={[localStyles.addTitle, { color: colors.textoEscuro }]}>
            Anotar o que precisa comprar
          </Text>
          <View style={localStyles.inputRow}>
            <TextInput
              style={[
                localStyles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderColor,
                  color: colors.textoEscuro,
                },
              ]}
              placeholder="Ex: Café, Leite, Pão de forma..."
              placeholderTextColor={colors.textMuted}
              value={inputName}
              onChangeText={setInputName}
              onSubmitEditing={handleAddReminder}
            />
            <TouchableOpacity
              style={[
                localStyles.addButton,
                {
                  backgroundColor: inputName.trim()
                    ? colors.principal
                    : colors.disabledBackground,
                },
              ]}
              onPress={handleAddReminder}
              disabled={!inputName.trim()}
            >
              <FontAwesome6 name="plus" size={16} color={colors.textoPrincipal} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.catScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    localStyles.catChip,
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
                      localStyles.catChipText,
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
          </ScrollView>
        </View>

        {banner ? (
          <View
            style={[
              localStyles.banner,
              {
                backgroundColor: colors.verdeSuave,
                borderColor: colors.principal,
              },
            ]}
          >
            <FontAwesome6
              name="circle-check"
              size={15}
              color={colors.principal}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[localStyles.bannerText, { color: colors.principal }]}>
                {banner.text}
              </Text>
            </View>
            {banner.listId ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ListaDetalhes', {
                    listId: banner.listId,
                    listName: banner.listName,
                  })
                }
                style={[
                  localStyles.bannerBtn,
                  { backgroundColor: colors.principal },
                ]}
              >
                <Text
                  style={[
                    localStyles.bannerBtnText,
                    { color: colors.textoPrincipal },
                  ]}
                >
                  Ver Lista
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {reminders.length > 0 ? (
          <View style={localStyles.toolbarRow}>
            <Text style={[localStyles.summaryText, { color: colors.textMuted }]}>
              {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'} •{' '}
              {checkedCount} {checkedCount === 1 ? 'marcado' : 'marcados'}
            </Text>

            <View style={localStyles.toolbarActions}>
              {checkedCount > 0 ? (
                <TouchableOpacity
                  onPress={() => setShowClearConfirm(true)}
                  style={[
                    localStyles.actionPill,
                    { backgroundColor: colors.dangerSoft },
                  ]}
                >
                  <FontAwesome6
                    name="broom"
                    size={12}
                    color={colors.logoutRed}
                  />
                  <Text
                    style={[
                      localStyles.actionPillText,
                      { color: colors.logoutRed },
                    ]}
                  >
                    Limpar marcados
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={localStyles.centered}>
            <ActivityIndicator size="large" color={colors.principal} />
          </View>
        ) : reminders.length === 0 ? (
          <View style={localStyles.emptyBox}>
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
            <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
              Sua Lista de Lembrete está vazia
            </Text>
            <Text style={[localStyles.emptyDesc, { color: colors.textMuted }]}>
              Anote o que precisa comprar antes de sair de casa. Ao marcar o checkbox de um item, ele será adicionado diretamente na sua lista de compras aberta!
            </Text>
          </View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            renderItem={renderReminderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <ItemFormModal
        visible={isAddItemModalVisible}
        initialItem={
          activeReminderForAdd
            ? {
                name: activeReminderForAdd.name,
                quantity: activeReminderForAdd.quantity || 1,
                unit: activeReminderForAdd.unit || 'un',
                category: activeReminderForAdd.category || 'Outros',
                price: 0,
                priceType: 'varejo',
                description: '',
              }
            : null
        }
        mode="manual"
        onClose={handleCancelAddReminderToList}
        onSubmit={handleConfirmSaveItemToList}
      />

      <ConfirmModal
        visible={showCreateListPrompt}
        title="Nenhuma Lista em Aberto"
        message={`Não há nenhuma lista de compras em aberto para adicionar "${
          activeReminderForAdd?.name || ''
        }". Deseja criar uma nova lista agora?`}
        confirmLabel="Criar Lista"
        onCancel={handleCancelCreateListPrompt}
        onConfirm={handleProceedToCreateList}
      />

      <ListFormModal
        visible={isCreateListModalVisible}
        initialName=""
        initialBudget={0}
        title="Criar Nova Lista"
        onClose={handleCancelCreateListModal}
        onSubmit={handleCreatedNewListFromReminder}
      />

      <ConfirmModal
        visible={showClearConfirm}
        title="Limpar Itens Marcados"
        message={`Deseja remover os ${checkedCount} itens já marcados da Lista de Lembrete?`}
        confirmLabel="Limpar"
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClearChecked}
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
  addBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginRight: 10,
  },
  addButton: {
    width: 48,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catScroll: {
    paddingTop: 10,
  },
  catChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 4,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
  },
  checkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
