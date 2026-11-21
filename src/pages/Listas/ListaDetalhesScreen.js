import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import ListFormModal from '../../../components/modals/ShoppingModals/ListFormModal';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import OcrProgressModal from '../../../components/modals/ShoppingModals/OcrProgressModal';
import * as ImagePicker from 'expo-image-picker';
import CameraCaptureModal, {
  normalizeAndCropImage,
} from '../../../components/modals/ShoppingModals/CameraCaptureModal';
import NativeOcrBridge from '../../../components/common/NativeOcrBridge';
import { recognizeShelfLabel } from '../../services/labelOcr';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  getListById,
  updateListDetails,
  finalizeList,
  reopenList,
  addItemToList,
  updateItemInList,
  updateItemQuantity,
  deleteItemFromList,
  calculateListStats,
  formatCurrency,
  formatListDateLabel,
} from '../../storage/shoppingStorage';

export default function ListaDetalhesScreen({ route, navigation }) {
  const listId = route?.params?.listId;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(7, insets.bottom);
  const { colors, openSettings, cameraSource, cameraCaptureMode, dataVersion } =
    useAppSettings();

  const [list, setList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [banner, setBanner] = useState(null);

  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [cameraInitialPhoto, setCameraInitialPhoto] = useState(null);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('manual');
  const [editingItem, setEditingItem] = useState(null);
  const [ocrHint, setOcrHint] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrImageUri, setOcrImageUri] = useState(null);
  const ocrCancelledRef = useRef(false);

  const loadList = useCallback(async () => {
    if (!listId) {
      setIsLoading(false);
      return;
    }
    try {
      const found = await getListById(listId);
      setList(found);
    } catch (error) {
      console.error('Erro ao carregar detalhes da lista:', error);
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    loadList();
    const unsubscribe = navigation.addListener('focus', loadList);
    return unsubscribe;
  }, [navigation, loadList, dataVersion]);

  const handleReopenList = useCallback(async () => {
    if (!list) return;
    const updated = await reopenList(list.id);
    if (updated) {
      setList(updated);
    }
  }, [list]);

  // Configure top header: smart truncated title + subtle date, Edit, Finalize/Reopen, Settings
  useEffect(() => {
    if (!list) return;
    const isCompleted = Boolean(list.completed);

    navigation.setOptions({
      title: list.name,
      headerTitleAlign: 'left',
      headerTitleContainerStyle: {
        flex: 1,
        marginRight: 4,
      },
      headerTitle: () => (
        <View style={localStyles.headerTitleWrap}>
          <Text
            style={[localStyles.headerTitleName, { color: colors.textoPrincipal }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {list.name}
          </Text>
          <Text
            style={[localStyles.headerTitleDate, { color: colors.textoPrincipal }]}
            numberOfLines={1}
          >
            {formatListDateLabel(list)}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={localStyles.headerRightRow}>
          {!isCompleted ? (
            <TouchableOpacity
              onPress={() => setIsBudgetModalVisible(true)}
              style={localStyles.headerIconBtn}
              accessibilityLabel="Editar lista, orçamento e data"
            >
              <FontAwesome6
                name="pen-to-square"
                size={17}
                color={colors.textoPrincipal}
              />
            </TouchableOpacity>
          ) : null}

          {!isCompleted ? (
            <TouchableOpacity
              onPress={() => setShowFinalizeConfirm(true)}
              style={localStyles.headerFinalizeChip}
              accessibilityLabel="Finalizar Compra"
            >
              <FontAwesome6
                name="circle-check"
                size={13}
                color={colors.primary}
              />
              <Text
                style={[
                  localStyles.headerFinalizeChipText,
                  { color: colors.primary },
                ]}
              >
                Finalizar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleReopenList}
              style={localStyles.headerReopenChip}
              accessibilityLabel="Reabrir Lista para Editar"
            >
              <FontAwesome6
                name="lock-open"
                size={12}
                color={colors.textoPrincipal}
              />
              <Text
                style={[
                  localStyles.headerFinalizeChipText,
                  { color: colors.textoPrincipal },
                ]}
              >
                Reabrir
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={openSettings}
            style={localStyles.headerIconBtn}
            accessibilityLabel="Abrir Configurações"
          >
            <FontAwesome6
              name="gear"
              size={18}
              color={colors.textoPrincipal}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [list, colors, navigation, openSettings, handleReopenList]);

  const processLabelImage = async ({ uri, base64 }) => {
    if (!uri) return;
    ocrCancelledRef.current = false;
    setOcrImageUri(uri);
    setOcrProgress(0);
    setIsOcrRunning(true);
    setBanner(null);

    const extracted = await recognizeShelfLabel({ uri, base64 }, (prog) => {
      if (!ocrCancelledRef.current) {
        setOcrProgress(prog);
      }
    });

    if (ocrCancelledRef.current) return;

    setIsOcrRunning(false);
    setOcrImageUri(null);

    const missingNameOrPrice = !extracted.name || extracted.price <= 0;
    setOcrHint(
      missingNameOrPrice
        ? 'Etiqueta capturada. Confira ou complete nome e preço antes de salvar.'
        : ''
    );
    setEditingItem({
      name: extracted.name || '',
      price: extracted.price > 0 ? extracted.price : 0,
      priceType: 'varejo',
      retailPrice:
        extracted.retailPrice > 0
          ? extracted.retailPrice
          : extracted.price > 0
            ? extracted.price
            : 0,
      wholesalePrice:
        extracted.wholesalePrice > 0 ? extracted.wholesalePrice : 0,
      quantity: 1,
      unit: extracted.unit || 'un',
      category: extracted.category || 'Outros',
      description: '',
    });
    setModalMode('ocr');
    setIsItemModalVisible(true);
  };

  const handleOpenWebCamera = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processLabelImage({ uri: reader.result });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCameraPress = async () => {
    if (list?.completed) return;
    setBanner(null);
    if (Platform.OS === 'web') {
      handleOpenWebCamera();
      return;
    }

    if (cameraSource === 'native') {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setBanner({
            type: 'error',
            text: 'Permissão da câmera negada nas configurações do aparelho.',
          });
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 1,
        });

        if (result.canceled || !result.assets || !result.assets[0]) {
          return;
        }

        const processed = await normalizeAndCropImage(
          result.assets[0],
          cameraCaptureMode === 'partial'
        );

        setCameraInitialPhoto(processed);
        setIsCameraModalVisible(true);
      } catch (err) {
        console.warn('Erro ao abrir câmera nativa do celular:', err);
        setCameraInitialPhoto(null);
        setIsCameraModalVisible(true);
      }
    } else {
      setCameraInitialPhoto(null);
      setIsCameraModalVisible(true);
    }
  };

  const handleCameraConfirmed = async ({ uri, base64 }) => {
    setIsCameraModalVisible(false);
    setCameraInitialPhoto(null);
    await processLabelImage({ uri, base64 });
  };

  const handleCancelOcr = () => {
    ocrCancelledRef.current = true;
    setIsOcrRunning(false);
    setOcrImageUri(null);
  };

  const handleOpenManualAdd = () => {
    if (list?.completed) return;
    setEditingItem(null);
    setOcrHint('');
    setModalMode('manual');
    setIsItemModalVisible(true);
  };

  const handleOpenEditItem = (item) => {
    if (list?.completed) return;
    setEditingItem(item);
    setOcrHint('');
    setModalMode('edit');
    setIsItemModalVisible(true);
  };

  const handleSubmitModalItem = async (itemData) => {
    if (!list || list.completed) return;
    let updated;
    if (modalMode === 'edit' && editingItem?.id) {
      updated = await updateItemInList(list.id, editingItem.id, itemData);
    } else {
      updated = await addItemToList(list.id, itemData);
    }
    if (updated) {
      setList(updated);
    }
    setIsItemModalVisible(false);
    setEditingItem(null);
    setOcrHint('');
  };

  const handleSaveListDetails = async ({ name, budget, createdAt }) => {
    if (!list || list.completed) return;
    const updated = await updateListDetails(list.id, { name, budget, createdAt });
    if (updated) {
      setList(updated);
    }
    setIsBudgetModalVisible(false);
  };

  const handleConfirmFinalize = async () => {
    if (!list) return;
    const updated = await finalizeList(list.id);
    if (updated) {
      setList(updated);
    }
    setShowFinalizeConfirm(false);
  };

  const handleIncrement = async (item) => {
    if (!list || list.completed) return;
    const updated = await updateItemQuantity(list.id, item.id, 1);
    if (updated) setList(updated);
  };

  const handleDecrement = async (item) => {
    if (!list || list.completed) return;
    const currentQty = Number(item.quantity) || 1;
    if (currentQty <= 1) {
      setItemToDelete(item);
      return;
    }
    const updated = await updateItemQuantity(list.id, item.id, -1);
    if (updated) setList(updated);
  };

  const handleConfirmDeleteItem = async () => {
    if (!list || !itemToDelete || list.completed) return;
    const updated = await deleteItemFromList(list.id, itemToDelete.id);
    if (updated) setList(updated);
    setItemToDelete(null);
  };

  const stats = useMemo(() => calculateListStats(list), [list]);

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

  if (!list) {
    return (
      <View
        style={[
          globalStyles.screen,
          localStyles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
          Lista não encontrada
        </Text>
        <TouchableOpacity
          style={[localStyles.backButton, { backgroundColor: colors.principal }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[localStyles.backButtonText, { color: colors.textoPrincipal }]}>
            Voltar às listas
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCompleted = Boolean(list.completed);
  const query = searchText.trim().toLowerCase();
  const filteredItems = list.items.filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true
  );

  // Compact two-column footer: Left (Title + Item Count), Right (Total + Discreet Budget)
  let totalBarBg = colors.card;
  let totalBarBorder = colors.principal;
  let totalLabelColor = colors.textoEscuro;
  let totalSubColor = colors.textMuted;
  let totalAmountColor = colors.principal;

  const footerLine1 = 'Valor Total da Compra';
  const footerLine2 = `${stats.totalItems} ${
    stats.totalItems === 1 ? 'produto' : 'produtos'
  } • ${stats.totalQuantity} ${stats.totalQuantity === 1 ? 'item' : 'itens'}`;
  const budgetRightLabel =
    stats.budget > 0 ? `Orçamento: ${formatCurrency(stats.budget)}` : null;
  const exceededAmount =
    stats.budget > 0 && stats.estimatedTotal > stats.budget
      ? stats.estimatedTotal - stats.budget
      : 0;
  const budgetExceededLabel =
    exceededAmount > 0.005
      ? `Ultrapassou ${formatCurrency(exceededAmount)}`
      : null;

  if (stats.budget > 0) {
    if (stats.budgetStatus === 'exceeded') {
      totalBarBg = colors.budgetDangerBg;
      totalBarBorder = colors.budgetDangerBorder;
      totalLabelColor = colors.budgetDangerText;
      totalSubColor = colors.budgetDangerText;
      totalAmountColor = colors.budgetDangerText;
    } else if (stats.budgetStatus === 'warning') {
      totalBarBg = colors.budgetWarningBg;
      totalBarBorder = colors.budgetWarningBorder;
      totalLabelColor = colors.budgetWarningText;
      totalSubColor = colors.budgetWarningText;
      totalAmountColor = colors.budgetWarningText;
    }
  }

  const renderItem = ({ item }) => {
    const qty = Number(item.quantity ?? item.quantidade ?? 1) || 1;
    const unitPrice = Number(item.precoUnitario ?? item.price ?? item.preco ?? 0) || 0;
    const subtotal = Math.round(qty * unitPrice * 100) / 100;
    const desc = item.description ?? item.notes ?? '';

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
          activeOpacity={isCompleted ? 1 : 0.75}
          disabled={isCompleted}
          onPress={() => handleOpenEditItem(item)}
        >
          <Text style={[localStyles.itemName, { color: colors.textoEscuro }]}>
            {item.name}
          </Text>

          <View style={localStyles.itemMetaRow}>
            <View
              style={[
                localStyles.categoryBadge,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <Text
                style={[
                  localStyles.categoryBadgeText,
                  { color: colors.principal },
                ]}
              >
                {item.category || 'Outros'}
              </Text>
            </View>
            {item.priceType === 'atacado' ? (
              <View
                style={[
                  localStyles.categoryBadge,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[
                    localStyles.categoryBadgeText,
                    { color: colors.textMuted },
                  ]}
                >
                  Atacado
                </Text>
              </View>
            ) : null}
            <Text style={[localStyles.itemPriceText, { color: colors.principal }]}>
              {formatCurrency(unitPrice)} / {item.unit || 'un'}
            </Text>
          </View>

          {qty > 1 ? (
            <Text style={[localStyles.subtotalText, { color: colors.textMuted }]}>
              Subtotal: {formatCurrency(subtotal)}
            </Text>
          ) : null}

          {desc ? (
            <Text style={[localStyles.itemDescription, { color: colors.textMuted }]}>
              {desc}
            </Text>
          ) : null}
        </TouchableOpacity>

        {isCompleted ? (
          <View
            style={[
              localStyles.lockedQtyBadge,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[localStyles.stepperVal, { color: colors.textoEscuro }]}>
              {qty} {item.unit || 'un'}
            </Text>
          </View>
        ) : (
          <View
            style={[
              localStyles.quantityStepper,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleDecrement(item)}
              style={[localStyles.stepperBtn, { backgroundColor: colors.card }]}
              accessibilityLabel={`Diminuir quantidade de ${item.name}`}
            >
              <FontAwesome6 name="minus" size={14} color={colors.textoEscuro} />
            </TouchableOpacity>

            <Text style={[localStyles.stepperVal, { color: colors.textoEscuro }]}>
              {qty}
            </Text>

            <TouchableOpacity
              onPress={() => handleIncrement(item)}
              style={[localStyles.stepperBtn, { backgroundColor: colors.card }]}
              accessibilityLabel={`Aumentar quantidade de ${item.name}`}
            >
              <FontAwesome6 name="plus" size={14} color={colors.principal} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <NativeOcrBridge />

      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
        ]}
      >
        {isCompleted ? (
          <View
            style={[
              localStyles.lockedBanner,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <FontAwesome6
              name="lock"
              size={14}
              color={colors.principal}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={[
                  localStyles.lockedBannerTitle,
                  { color: colors.textoEscuro },
                ]}
              >
                Compra finalizada e bloqueada
              </Text>
              <Text
                style={[localStyles.lockedBannerSub, { color: colors.textMuted }]}
              >
                Use o botão "Reabrir" no topo para desbloquear e editar.
              </Text>
            </View>
          </View>
        ) : null}

        {banner ? (
          <View
            style={[
              localStyles.banner,
              {
                backgroundColor:
                  banner.type === 'error'
                    ? colors.dangerSoft
                    : colors.verdeSuave,
              },
            ]}
          >
            <Text
              style={[
                localStyles.bannerText,
                {
                  color:
                    banner.type === 'error'
                      ? colors.logoutRed
                      : colors.principal,
                },
              ]}
            >
              {banner.text}
            </Text>
          </View>
        ) : null}

        {list.items.length > 0 ? (
          <View
            style={[
              localStyles.searchRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
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
              placeholder="Buscar produto na lista..."
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
                name="basket-shopping"
                size={30}
                color={colors.principal}
              />
            </View>
            <Text style={[localStyles.emptyTitle, { color: colors.textoEscuro }]}>
              {list.items.length === 0
                ? 'Sua lista está vazia'
                : 'Nenhum produto encontrado'}
            </Text>
            <Text style={[localStyles.emptySubtitle, { color: colors.textMuted }]}>
              {list.items.length === 0
                ? 'Toque em "Adicionar Produto" ou use o botão da câmera para ler uma etiqueta de preço.'
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

      {/* Ergonomic Bottom Action Bar (hidden when list is finalized) */}
      {!isCompleted ? (
        <View
          style={[
            localStyles.bottomActionBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.borderColor,
            },
          ]}
        >
          <View style={[globalStyles.contentContainer, localStyles.bottomActionInner]}>
            <TouchableOpacity
              style={[
                localStyles.manualAddButton,
                { backgroundColor: colors.principal },
              ]}
              onPress={handleOpenManualAdd}
            >
              <FontAwesome6
                name="plus"
                size={15}
                color={colors.textoPrincipal}
              />
              <Text
                style={[
                  localStyles.manualAddText,
                  { color: colors.textoPrincipal },
                ]}
              >
                Adicionar Produto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.cameraButton,
                { backgroundColor: colors.verdePrincipal },
              ]}
              onPress={handleCameraPress}
              accessibilityLabel="Fotografar etiqueta de preço"
            >
              <FontAwesome6
                name="camera"
                size={19}
                color={colors.textoPrincipal}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Compact Fixed Bottom Total Bar with Discreet Budget Limit */}
      <TouchableOpacity
        activeOpacity={isCompleted ? 1 : 0.85}
        disabled={isCompleted}
        onPress={() => setIsBudgetModalVisible(true)}
        style={[
          localStyles.fixedTotalBar,
          {
            backgroundColor: totalBarBg,
            borderTopColor: totalBarBorder,
            minHeight: 54 + bottomPad,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View style={[globalStyles.contentContainer, localStyles.totalBarInner]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text
              style={[localStyles.totalBarLabel, { color: totalLabelColor }]}
              numberOfLines={1}
            >
              {footerLine1}
            </Text>
            <Text
              style={[localStyles.totalBarSub, { color: totalSubColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {footerLine2}
            </Text>
          </View>
          <View style={localStyles.totalBarRightCol}>
            <Text
              style={[localStyles.totalBarAmount, { color: totalAmountColor }]}
              numberOfLines={1}
            >
              {formatCurrency(stats.estimatedTotal)}
            </Text>
            {budgetRightLabel ? (
              <Text
                style={[localStyles.totalBarBudgetSub, { color: totalSubColor }]}
                numberOfLines={1}
              >
                {budgetRightLabel}
              </Text>
            ) : null}
            {budgetExceededLabel ? (
              <Text
                style={[
                  localStyles.totalBarExceededSub,
                  { color: colors.budgetDangerText },
                ]}
                numberOfLines={1}
              >
                {budgetExceededLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <CameraCaptureModal
        visible={isCameraModalVisible}
        initialPhoto={cameraInitialPhoto}
        onClose={() => {
          setIsCameraModalVisible(false);
          setCameraInitialPhoto(null);
        }}
        onConfirmImage={handleCameraConfirmed}
      />

      <ItemFormModal
        visible={isItemModalVisible}
        initialItem={editingItem}
        mode={modalMode}
        ocrHint={ocrHint}
        onClose={() => {
          setIsItemModalVisible(false);
          setEditingItem(null);
          setOcrHint('');
        }}
        onSubmit={handleSubmitModalItem}
      />

      <ListFormModal
        visible={isBudgetModalVisible}
        initialName={list.name}
        initialBudget={list.budget}
        initialDate={list.createdAt}
        showDateField={true}
        title="Editar Lista, Data e Orçamento"
        onClose={() => setIsBudgetModalVisible(false)}
        onSubmit={handleSaveListDetails}
      />

      <OcrProgressModal
        visible={isOcrRunning}
        imageUri={ocrImageUri}
        progress={ocrProgress}
        onCancel={handleCancelOcr}
      />

      <ConfirmModal
        visible={Boolean(itemToDelete)}
        title="Remover Produto"
        message={`A quantidade chegou a zero. Deseja remover "${itemToDelete?.name || ''}" da lista?`}
        confirmLabel="Remover"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
      />

      <ConfirmModal
        visible={showFinalizeConfirm}
        title="Finalizar Compra"
        message={`Deseja finalizar a compra "${list.name}" no valor de ${formatCurrency(
          stats.estimatedTotal
        )}? A lista ficará bloqueada para edição até que você deseje reabri-la.`}
        confirmLabel="Finalizar"
        onCancel={() => setShowFinalizeConfirm(false)}
        onConfirm={handleConfirmFinalize}
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
    flexDirection: 'row',
    alignItems: 'baseline',
    flexDirection: 'column',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  headerTitleName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  headerTitleDate: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    flexShrink: 0,
    fontWeight: '500',
    opacity: 0.78,
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerIconBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  headerFinalizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  headerReopenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  headerFinalizeChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  metaIndicatorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  metaIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  lockedBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  lockedBannerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomActionBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  bottomActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualAddButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  manualAddText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  cameraButton: {
    width: 52,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemMainArea: {
    flex: 1,
    marginRight: 12,
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
  itemPriceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  lockedQtyBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },
  fixedTotalBar: {
    borderTopWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 7,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
  },
  totalBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBarLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  totalBarSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  totalBarRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  totalBarAmount: {
    fontSize: 20,
    fontSize: 19,
    fontWeight: 'bold',
  },
  totalBarBudgetSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  totalBarExceededSub: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
});
