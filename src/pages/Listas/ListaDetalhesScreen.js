import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import ListFormModal from '../../../components/modals/ShoppingModals/ListFormModal';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import OcrProgressModal from '../../../components/modals/ShoppingModals/OcrProgressModal';
import TagPhotoPreviewModal from '../../../components/modals/ShoppingModals/TagPhotoPreviewModal';
import * as ImagePicker from 'expo-image-picker';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import CameraCaptureModal from '../../../components/modals/ShoppingModals/CameraCaptureModal';
import NativeOcrBridge from '../../../components/common/NativeOcrBridge';
import { recognizeShelfLabel } from '../../services/labelOcr';
import { identificarProdutoDaEtiqueta } from '../../services/productLookupService';
import {
  saveCompressedTagPhoto,
  deleteTagPhotoFile,
  getTagPhotoUri,
} from '../../services/tagPhotoStorage';
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
  loadReminderLists,
  normalizeCategoryName,
} from '../../storage/shoppingStorage';

const ShoppingListItemRow = React.memo(function ShoppingListItemRow({
  item,
  isCompleted,
  colors,
  radiusCard,
  borderWidth,
  onEdit,
  onDecrement,
  onIncrement,
  onRequestDelete,
  onPreviewPhoto,
}) {
  const qty = Number(item.quantity ?? item.quantidade ?? 1) || 1;
  const unitPrice =
    Number(
      item.precoUnitario ??
        item.price ??
        item.preco ??
        item.retailPrice ??
        item.wholesalePrice ??
        0
    ) || 0;
  const subtotal = Math.round(qty * unitPrice * 100) / 100;
  const desc = item.description ?? item.notes ?? '';
  const catName = normalizeCategoryName(item.category);
  const hasSavedPhoto = Boolean(item.photoFilename && getTagPhotoUri(item.photoFilename));

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
        activeOpacity={isCompleted ? 1 : 0.75}
        disabled={isCompleted}
        onPress={() => onEdit(item)}
      >
        <Text
          style={[localStyles.itemName, { color: colors.textoEscuro }]}
          numberOfLines={2}
        >
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

      <View style={localStyles.itemRightActions}>
        {hasSavedPhoto ? (
          <TouchableOpacity
            onPress={() => onPreviewPhoto?.(item)}
            style={[
              localStyles.photoBadgeBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
                borderWidth,
              },
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel={`Ver foto da etiqueta de ${item.name}`}
          >
            <FontAwesome6
              name="image"
              size={13}
              color={colors.principal}
            />
          </TouchableOpacity>
        ) : null}

        {isCompleted ? (
          <View
            style={[
              localStyles.lockedQtyBadge,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
                borderWidth,
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
                borderWidth,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() =>
                qty <= 1 ? onRequestDelete(item) : onDecrement(item)
              }
              style={[localStyles.stepperBtn, { backgroundColor: colors.card }]}
              accessibilityLabel={
                qty <= 1
                  ? `Excluir ${item.name}`
                  : `Diminuir quantidade de ${item.name}`
              }
            >
              <FontAwesome6
                name={qty <= 1 ? 'trash-can' : 'minus'}
                size={13}
                color={
                  qty <= 1
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
        )}
      </View>
    </View>
  );
});

export default function ListaDetalhesScreen({ route, navigation }) {
  const listId = route?.params?.listId;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(7, insets.bottom);
  const {
    colors,
    radiusCard,
    radiusButton,
    radiusInput,
    borderWidth,
    saveTagPhotos,
    openSettings,
    dataVersion,
  } = useAppSettings();

  const [list, setList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [banner, setBanner] = useState(null);
  const [previewPhotoItem, setPreviewPhotoItem] = useState(null);
  const pendingDraftPhotoRef = useRef(null);

  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [cameraInitialPhoto, setCameraInitialPhoto] = useState(null);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('manual');
  const [editingItem, setEditingItem] = useState(null);
  const [ocrHint, setOcrHint] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusMessage, setOcrStatusMessage] = useState('');
  const [ocrImageUri, setOcrImageUri] = useState(null);
  const ocrCancelledRef = useRef(false);
  const [pendingPriceChoice, setPendingPriceChoice] = useState(null);

  // Import from Reminder Lists states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [reminderLists, setReminderLists] = useState([]);
  const [selectedReminderList, setSelectedReminderList] = useState(null);
  const [activeReminderActionItem, setActiveReminderActionItem] = useState(null);
  const pendingReminderForCameraRef = useRef(null);

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

  const handleConfirmReopenList = useCallback(async () => {
    if (!list) return;
    const updated = await reopenList(list.id);
    if (updated) {
      setList(updated);
    }
    setShowReopenConfirm(false);
  }, [list]);

  // Configure top header: responsive on narrow screens so right buttons never overflow
  useEffect(() => {
    if (!list) return;
    const isCompleted = Boolean(list.completed);

    navigation.setOptions({
      title: list.name,
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
            {list.name}
          </Text>
          <Text
            style={[
              localStyles.headerTitleDate,
              { color: colors.textoPrincipal },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
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
                size={16}
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
                size={12}
                color={colors.primary}
              />
              <Text
                style={[
                  localStyles.headerFinalizeChipText,
                  { color: colors.primary },
                ]}
                numberOfLines={1}
              >
                Finalizar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowReopenConfirm(true)}
              style={localStyles.headerReopenChip}
              accessibilityLabel="Reabrir Lista para Editar"
            >
              <FontAwesome6
                name="lock-open"
                size={11}
                color={colors.textoPrincipal}
              />
              <Text
                style={[
                  localStyles.headerFinalizeChipText,
                  { color: colors.textoPrincipal },
                ]}
                numberOfLines={1}
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
              size={17}
              color={colors.textoPrincipal}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [list, colors, navigation, openSettings]);

  const processLabelImage = async ({ uri, base64, barcode: nativeBarcode = '' }) => {
    if (!uri) return;
    ocrCancelledRef.current = false;
    setOcrImageUri(uri);
    setOcrProgress(0);
    setOcrStatusMessage('');
    setIsOcrRunning(true);
    setBanner(null);

    const reminderTemplate = pendingReminderForCameraRef.current;
    pendingReminderForCameraRef.current = null;

    const [extracted, savedPhoto] = await Promise.all([
      recognizeShelfLabel({ uri, base64 }, (prog) => {
        if (!ocrCancelledRef.current) {
          setOcrProgress(prog);
        }
      }),
      saveTagPhotos ? saveCompressedTagPhoto(uri) : Promise.resolve(null),
    ]);

    if (ocrCancelledRef.current) {
      if (savedPhoto?.photoFilename) {
        deleteTagPhotoFile(savedPhoto.photoFilename).catch(() => {});
      }
      return;
    }

    // Prioriza o EAN lido nativamente pela câmera (CameraView) sobre o fallback de OCR
    const cleanNativeBarcode = String(nativeBarcode || '').replace(/\D/g, '');
    const resolvedBarcode = cleanNativeBarcode || extracted.barcode || '';

    // Hybrid Open Food Facts lookup (cached + 4s timeout + offline fallback)
    let enrichedName = extracted.name || '';
    let enrichedCategory = extracted.category || 'Outros';
    let enrichedOrigin = 'ocr_local';
    if (
      !reminderTemplate &&
      (resolvedBarcode || extracted.name || extracted.rawText)
    ) {
      setOcrStatusMessage('Identificando produto...');
      try {
        const enriched = await identificarProdutoDaEtiqueta({
          rawText: extracted.name || extracted.rawText || '',
          barcode: resolvedBarcode,
        });
        if (!ocrCancelledRef.current && enriched) {
          enrichedOrigin = enriched.origem || 'ocr_local';
          if (
            (enriched.origem === 'api' || enriched.origem === 'cache') &&
            enriched.nome
          ) {
            const parts = [enriched.nome];
            const lowerBase = enriched.nome.toLowerCase();
            if (
              enriched.marca &&
              !lowerBase.includes(enriched.marca.toLowerCase())
            ) {
              parts.push(enriched.marca);
            }
            if (
              enriched.quantidade &&
              !lowerBase.includes(enriched.quantidade.toLowerCase())
            ) {
              parts.push(enriched.quantidade);
            }
            enrichedName = parts.join(' ').replace(/\s+/g, ' ').trim();
          }
          if (
            enriched.categoriaSugerida &&
            enriched.categoriaSugerida !== 'Outros'
          ) {
            enrichedCategory = enriched.categoriaSugerida;
          }
        }
      } catch {
        // Keep local OCR values on lookup failure
      }
    }

    // Immediately clean up temporary cropped OCR cache file if permanent compressed photo was saved
    if (
      savedPhoto?.photoFilename &&
      uri &&
      LegacyFileSystem.cacheDirectory &&
      uri.startsWith(LegacyFileSystem.cacheDirectory)
    ) {
      LegacyFileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }

    if (ocrCancelledRef.current) {
      if (savedPhoto?.photoFilename) {
        deleteTagPhotoFile(savedPhoto.photoFilename).catch(() => {});
      }
      return;
    }

    pendingDraftPhotoRef.current = savedPhoto?.photoFilename || null;

    setIsOcrRunning(false);
    setOcrStatusMessage('');
    setOcrImageUri(null);

    const detectedPrices = Array.isArray(extracted.detectedPrices)
      ? extracted.detectedPrices.filter((p) => Number(p) > 0)
      : [];

    const photoFields = savedPhoto?.photoFilename
      ? {
          photoFilename: savedPhoto.photoFilename,
          photoCapturedAt: savedPhoto.photoCapturedAt,
          lookupOrigin: enrichedOrigin,
        }
      : {
          tempPhotoUri: uri,
          lookupOrigin: enrichedOrigin,
        };

    const draftItem = reminderTemplate
      ? {
          name: reminderTemplate.name || enrichedName || '',
          price:
            detectedPrices.length > 0
              ? detectedPrices[0]
              : extracted.price > 0
                ? extracted.price
                : 0,
          quantity: Number(reminderTemplate.quantity) || 1,
          unit: reminderTemplate.unit || extracted.unit || 'un',
          category: normalizeCategoryName(
            reminderTemplate.category || enrichedCategory || 'Outros'
          ),
          description:
            reminderTemplate.notes ?? reminderTemplate.description ?? '',
          sourceReminderId: reminderTemplate.id || null,
          ...photoFields,
        }
      : {
          name: enrichedName || '',
          price:
            detectedPrices.length > 0
              ? detectedPrices[0]
              : extracted.price > 0
                ? extracted.price
                : 0,
          quantity: 1,
          unit: extracted.unit || 'un',
          category: normalizeCategoryName(enrichedCategory || 'Outros'),
          description: '',
          sourceReminderId: null,
          ...photoFields,
        };

    if (detectedPrices.length >= 2) {
      setPendingPriceChoice({
        prices: detectedPrices,
        draftItem,
      });
      return;
    }

    const missingNameOrPrice = !draftItem.name || draftItem.price <= 0;
    setOcrHint(
      missingNameOrPrice
        ? 'Etiqueta capturada. Confira ou complete nome e preço antes de salvar.'
        : ''
    );
    setEditingItem(draftItem);
    setModalMode('ocr');
    setIsItemModalVisible(true);
  };

  const handleSelectDetectedPrice = (chosenPrice) => {
    if (!pendingPriceChoice) return;
    const nextItem = {
      ...pendingPriceChoice.draftItem,
      price: Number(chosenPrice) || 0,
    };
    setPendingPriceChoice(null);
    const missingNameOrPrice = !nextItem.name || nextItem.price <= 0;
    setOcrHint(
      missingNameOrPrice
        ? 'Etiqueta capturada. Confira ou complete nome e preço antes de salvar.'
        : ''
    );
    setEditingItem(nextItem);
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

  const handleCameraPress = async (reminderTemplate = null) => {
    if (list?.completed) return;
    pendingReminderForCameraRef.current =
      reminderTemplate && reminderTemplate.name ? reminderTemplate : null;
    setBanner(null);
    // Limpa qualquer estado residual da leitura anterior para evitar vazamento de preço/nome
    setEditingItem(null);
    setPendingPriceChoice(null);
    setOcrHint('');

    if (Platform.OS === 'web') {
      handleOpenWebCamera();
      return;
    }

    // Abre a câmera nativa embutida (expo-camera) com leitor de código de barras EAN-13/EAN-8 simultâneo
    setCameraInitialPhoto(null);
    setIsCameraModalVisible(true);
  };

  const handleCameraConfirmed = async ({ uri, base64, barcode = '' }) => {
    setIsCameraModalVisible(false);
    setCameraInitialPhoto(null);
    await processLabelImage({ uri, base64, barcode });
  };

  const handleCancelOcr = () => {
    ocrCancelledRef.current = true;
    setIsOcrRunning(false);
    setOcrStatusMessage('');
    setOcrImageUri(null);
  };

  const handleOpenManualAdd = () => {
    if (list?.completed) return;
    pendingReminderForCameraRef.current = null;
    setEditingItem(null);
    setOcrHint('');
    setModalMode('manual');
    setIsItemModalVisible(true);
  };

  const isCompletedFlag = Boolean(list?.completed);

  const handleOpenEditItem = useCallback(
    (item) => {
      if (isCompletedFlag) return;
      setEditingItem(item);
      setOcrHint('');
      setModalMode('edit');
      setIsItemModalVisible(true);
    },
    [isCompletedFlag]
  );

  const handleSubmitModalItem = async (itemData) => {
    if (!list || list.completed) return;
    let updated;
    if (modalMode === 'edit' && editingItem?.id) {
      updated = await updateItemInList(list.id, editingItem.id, itemData);
    } else {
      updated = await addItemToList(list.id, {
        ...itemData,
        sourceReminderId:
          itemData.sourceReminderId || editingItem?.sourceReminderId || null,
        photoFilename:
          itemData.photoFilename || editingItem?.photoFilename || null,
        photoCapturedAt:
          itemData.photoCapturedAt || editingItem?.photoCapturedAt || null,
      });
    }
    pendingDraftPhotoRef.current = null;
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

  const handleIncrement = useCallback(
    async (item) => {
      if (!listId || isCompletedFlag) return;
      const updated = await updateItemQuantity(listId, item.id, 1);
      if (updated) setList(updated);
    },
    [listId, isCompletedFlag]
  );

  const handleDecrement = useCallback(
    async (item) => {
      if (!listId || isCompletedFlag) return;
      const currentQty = Number(item.quantity) || 1;
      if (currentQty <= 1) {
        setItemToDelete(item);
        return;
      }
      const updated = await updateItemQuantity(listId, item.id, -1);
      if (updated) setList(updated);
    },
    [listId, isCompletedFlag]
  );

  const handleRequestDeleteItem = useCallback((item) => {
    setItemToDelete(item);
  }, []);

  const handlePreviewPhoto = useCallback((item) => {
    if (item?.photoFilename && getTagPhotoUri(item.photoFilename)) {
      setPreviewPhotoItem(item);
    }
  }, []);

  const handleConfirmDeleteItem = async () => {
    if (!list || !itemToDelete || list.completed) return;
    const updated = await deleteItemFromList(list.id, itemToDelete.id);
    if (updated) setList(updated);
    setItemToDelete(null);
  };

  // ==========================================
  // IMPORT FROM REMINDERS HANDLERS
  // ==========================================

  const handleOpenImportModal = async () => {
    if (!list || list.completed) return;
    const loadedReminders = await loadReminderLists();
    setReminderLists(loadedReminders);
    setSelectedReminderList(null);
    setActiveReminderActionItem(null);
    setIsImportModalVisible(true);
  };

  const handleChooseReminderManual = (remItem) => {
    setActiveReminderActionItem(null);
    setIsImportModalVisible(false);
    setSelectedReminderList(null);

    setEditingItem({
      name: remItem.name || '',
      quantity: Number(remItem.quantity) || 1,
      unit: remItem.unit || 'un',
      category: normalizeCategoryName(remItem.category || 'Outros'),
      price: 0,
      description: remItem.notes ?? remItem.description ?? '',
      sourceReminderId: remItem.id,
    });
    setOcrHint('');
    setModalMode('manual');
    setIsItemModalVisible(true);
  };

  const handleChooseReminderCamera = (remItem) => {
    setActiveReminderActionItem(null);
    setIsImportModalVisible(false);
    setSelectedReminderList(null);
    handleCameraPress(remItem);
  };

  const stats = useMemo(() => calculateListStats(list), [list]);

  const renderItem = useCallback(
    ({ item }) => (
      <ShoppingListItemRow
        item={item}
        isCompleted={isCompletedFlag}
        colors={colors}
        radiusCard={radiusCard}
        borderWidth={borderWidth}
        onEdit={handleOpenEditItem}
        onDecrement={handleDecrement}
        onIncrement={handleIncrement}
        onRequestDelete={handleRequestDeleteItem}
        onPreviewPhoto={handlePreviewPhoto}
      />
    ),
    [
      isCompletedFlag,
      colors,
      radiusCard,
      borderWidth,
      handleOpenEditItem,
      handleDecrement,
      handleIncrement,
      handleRequestDeleteItem,
      handlePreviewPhoto,
    ]
  );

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

  const importedReminderIdsSet = new Set(
    Array.isArray(list.importedReminderIds) ? list.importedReminderIds : []
  );

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
                ? 'Toque em "+ Adicionar Produto", use o botão de lembretes à esquerda ou a câmera à direita.'
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

      {/* Triple Ergonomic Bottom Action Bar: [Lembrete Icon] | [+ Adicionar Produto] | [Câmera Icon] */}
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
                localStyles.reminderIconButton,
                {
                  backgroundColor: colors.verdeSuave,
                  borderColor: colors.principal,
                  borderRadius: radiusButton,
                },
              ]}
              onPress={handleOpenImportModal}
              accessibilityLabel="Importar item dos lembretes"
            >
              <FontAwesome6
                name="clipboard-check"
                size={18}
                color={colors.principal}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.manualAddButton,
                {
                  backgroundColor: colors.principal,
                  borderRadius: radiusButton,
                },
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
                {
                  backgroundColor: colors.verdePrincipal,
                  borderRadius: radiusButton,
                },
              ]}
              onPress={() => handleCameraPress(null)}
              accessibilityLabel="Fotografar etiqueta de preço"
            >
              <FontAwesome6
                name="camera"
                size={18}
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
          pendingReminderForCameraRef.current = null;
        }}
        onConfirmImage={handleCameraConfirmed}
      />

      <ItemFormModal
        visible={isItemModalVisible}
        initialItem={editingItem}
        mode={modalMode}
        ocrHint={ocrHint}
        listName={list.name}
        onClose={() => {
          if (pendingDraftPhotoRef.current && !editingItem?.id) {
            deleteTagPhotoFile(pendingDraftPhotoRef.current).catch(() => {});
            pendingDraftPhotoRef.current = null;
          }
          setIsItemModalVisible(false);
          setEditingItem(null);
          setOcrHint('');
        }}
        onSubmit={handleSubmitModalItem}
      />

      <TagPhotoPreviewModal
        visible={Boolean(previewPhotoItem)}
        photoUri={
          previewPhotoItem?.photoFilename
            ? getTagPhotoUri(previewPhotoItem.photoFilename)
            : null
        }
        productName={previewPhotoItem?.name}
        listName={list.name}
        price={
          Number(
            previewPhotoItem?.precoUnitario ??
              previewPhotoItem?.price ??
              previewPhotoItem?.preco ??
              0
          ) || 0
        }
        capturedAt={previewPhotoItem?.photoCapturedAt || list.createdAt}
        onClose={() => setPreviewPhotoItem(null)}
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
        statusMessage={ocrStatusMessage}
        onCancel={handleCancelOcr}
      />

      {/* Modal de Importar Item dos Lembretes */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isImportModalVisible}
        onRequestClose={() => {
          if (activeReminderActionItem) {
            setActiveReminderActionItem(null);
          } else if (selectedReminderList) {
            setSelectedReminderList(null);
          } else {
            setIsImportModalVisible(false);
          }
        }}
      >
        <View style={localStyles.priceChoiceOverlay}>
          <View
            style={[
              localStyles.importModalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={localStyles.importHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {activeReminderActionItem ? (
                  <TouchableOpacity
                    onPress={() => setActiveReminderActionItem(null)}
                    style={[
                      localStyles.importBackBtn,
                      { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <FontAwesome6
                      name="arrow-left"
                      size={13}
                      color={colors.textoEscuro}
                    />
                  </TouchableOpacity>
                ) : selectedReminderList ? (
                  <TouchableOpacity
                    onPress={() => setSelectedReminderList(null)}
                    style={[
                      localStyles.importBackBtn,
                      { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <FontAwesome6
                      name="arrow-left"
                      size={13}
                      color={colors.textoEscuro}
                    />
                  </TouchableOpacity>
                ) : (
                  <FontAwesome6
                    name="clipboard-check"
                    size={18}
                    color={colors.principal}
                    style={{ marginRight: 9 }}
                  />
                )}
                <Text
                  style={[
                    localStyles.importModalTitle,
                    { color: colors.textoEscuro },
                  ]}
                  numberOfLines={1}
                >
                  {activeReminderActionItem
                    ? activeReminderActionItem.name
                    : selectedReminderList
                      ? selectedReminderList.name
                      : 'Listas de Lembretes'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setActiveReminderActionItem(null);
                  setSelectedReminderList(null);
                  setIsImportModalVisible(false);
                }}
                style={[
                  localStyles.importCloseBtn,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <FontAwesome6 name="xmark" size={15} color={colors.textoEscuro} />
              </TouchableOpacity>
            </View>

            {activeReminderActionItem ? (
              /* STEP 3: Two Options for Adding the Chosen Reminder Item */
              <View style={{ width: '100%' }}>
                <Text
                  style={[
                    localStyles.importSubDesc,
                    { color: colors.textMuted, marginBottom: 14 },
                  ]}
                >
                  Como deseja adicionar "{activeReminderActionItem.name}" (
                  {activeReminderActionItem.quantity || 1}{' '}
                  {activeReminderActionItem.unit || 'un'} •{' '}
                  {normalizeCategoryName(activeReminderActionItem.category)}) à
                  sua lista de compras?
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    handleChooseReminderCamera(activeReminderActionItem)
                  }
                  style={[
                    localStyles.reminderActionOptionBtn,
                    {
                      backgroundColor: colors.principal,
                      borderColor: colors.principal,
                    },
                  ]}
                >
                  <View
                    style={[
                      localStyles.reminderActionIconCircle,
                      { backgroundColor: 'rgba(255,255,255,0.2)' },
                    ]}
                  >
                    <FontAwesome6 name="camera" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        localStyles.reminderActionTitle,
                        { color: '#FFFFFF' },
                      ]}
                    >
                      Tirar foto da etiqueta
                    </Text>
                    <Text
                      style={[
                        localStyles.reminderActionSub,
                        { color: 'rgba(255,255,255,0.85)' },
                      ]}
                    >
                      Abre a câmera mantendo nome, quantidade e categoria do lembrete para ler o preço.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    handleChooseReminderManual(activeReminderActionItem)
                  }
                  style={[
                    localStyles.reminderActionOptionBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.principal,
                      marginBottom: 4,
                    },
                  ]}
                >
                  <View
                    style={[
                      localStyles.reminderActionIconCircle,
                      { backgroundColor: colors.verdeSuave },
                    ]}
                  >
                    <FontAwesome6
                      name="pen-to-square"
                      size={16}
                      color={colors.principal}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        localStyles.reminderActionTitle,
                        { color: colors.textoEscuro },
                      ]}
                    >
                      Adicionar manualmente
                    </Text>
                    <Text
                      style={[
                        localStyles.reminderActionSub,
                        { color: colors.textMuted },
                      ]}
                    >
                      Abre o formulário com os dados do lembrete já preenchidos para digitar o preço.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : !selectedReminderList ? (
              /* STEP 1: Choose a Reminder List */
              reminderLists.length === 0 ? (
                <View style={localStyles.importEmptyBox}>
                  <FontAwesome6
                    name="clipboard-check"
                    size={30}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      localStyles.importEmptyText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Você ainda não criou nenhuma Lista de Lembretes. Crie suas listas na aba "Lembretes" para utilizá-las aqui.
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      localStyles.importSubDesc,
                      { color: colors.textMuted },
                    ]}
                  >
                    Selecione uma lista de lembretes para ver seus itens:
                  </Text>
                  <ScrollView
                    style={{ width: '100%', maxHeight: 340 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {reminderLists.map((remList) => {
                      const items = Array.isArray(remList.items)
                        ? remList.items
                        : [];
                      const alreadyInThisListCount = items.filter((it) =>
                        importedReminderIdsSet.has(it.id)
                      ).length;
                      return (
                        <TouchableOpacity
                          key={remList.id}
                          activeOpacity={0.8}
                          onPress={() => setSelectedReminderList(remList)}
                          style={[
                            localStyles.importListOption,
                            {
                              backgroundColor: colors.surfaceMuted,
                              borderColor: colors.borderColor,
                            },
                          ]}
                        >
                          <View
                            style={[
                              localStyles.importListIcon,
                              { backgroundColor: colors.verdeSuave },
                            ]}
                          >
                            <FontAwesome6
                              name="clipboard-check"
                              size={16}
                              color={colors.principal}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                localStyles.importListName,
                                { color: colors.textoEscuro },
                              ]}
                              numberOfLines={1}
                            >
                              {remList.name}
                            </Text>
                            <Text
                              style={[
                                localStyles.importListMeta,
                                { color: colors.textMuted },
                              ]}
                            >
                              {items.length}{' '}
                              {items.length === 1 ? 'item' : 'itens'}
                              {alreadyInThisListCount > 0
                                ? ` • ${alreadyInThisListCount} já na lista`
                                : ''}
                            </Text>
                          </View>
                          <FontAwesome6
                            name="chevron-right"
                            size={13}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )
            ) : (selectedReminderList.items || []).length === 0 ? (
              <View style={localStyles.importEmptyBox}>
                <Text
                  style={[
                    localStyles.importEmptyText,
                    { color: colors.textMuted },
                  ]}
                >
                  Esta lista de lembretes não possui itens cadastrados.
                </Text>
              </View>
            ) : (
              /* STEP 2: Tap an Item from the Reminder List */
              <>
                <Text
                  style={[
                    localStyles.importSubDesc,
                    { color: colors.textMuted },
                  ]}
                >
                  Toque em um item para adicioná-lo à lista "{list.name}":
                </Text>

                <ScrollView
                  style={{ width: '100%', maxHeight: 340 }}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedReminderList.items.map((remItem) => {
                    const wasAlreadyImported = importedReminderIdsSet.has(
                      remItem.id
                    );
                    const catName = normalizeCategoryName(remItem.category);

                    return (
                      <TouchableOpacity
                        key={remItem.id}
                        activeOpacity={0.8}
                        onPress={() => setActiveReminderActionItem(remItem)}
                        style={[
                          localStyles.importItemRow,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.borderColor,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Text
                              style={[
                                localStyles.importItemName,
                                { color: colors.textoEscuro },
                              ]}
                            >
                              {remItem.name}
                            </Text>
                            <Text
                              style={[
                                localStyles.importItemQty,
                                { color: colors.textMuted },
                              ]}
                            >
                              ({remItem.quantity || 1} {remItem.unit || 'un'})
                            </Text>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              marginTop: 5,
                            }}
                          >
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
                                {catName}
                              </Text>
                            </View>

                            {wasAlreadyImported ? (
                              <View
                                style={[
                                  localStyles.alreadyImportedBadge,
                                  {
                                    backgroundColor: colors.card,
                                    borderColor: colors.borderColor,
                                  },
                                ]}
                              >
                                <FontAwesome6
                                  name="circle-check"
                                  size={10}
                                  color={colors.principal}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={[
                                    localStyles.alreadyImportedText,
                                    { color: colors.textMuted },
                                  ]}
                                >
                                  Já na lista
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View
                          style={[
                            localStyles.importAddPlusBadge,
                            { backgroundColor: colors.verdeSuave },
                          ]}
                        >
                          <FontAwesome6
                            name="plus"
                            size={13}
                            color={colors.principal}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção quando o OCR detecta 2 ou mais preços distintos na mesma etiqueta */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={Boolean(pendingPriceChoice)}
        onRequestClose={() => handleSelectDetectedPrice(0)}
      >
        <View style={localStyles.priceChoiceOverlay}>
          <View
            style={[
              localStyles.priceChoiceCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View
              style={[
                localStyles.priceChoiceIconWrap,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6 name="tags" size={22} color={colors.principal} />
            </View>

            <Text
              style={[localStyles.priceChoiceTitle, { color: colors.textoEscuro }]}
            >
              Mais de um preço identificado
            </Text>
            {pendingPriceChoice?.draftItem?.name ? (
              <Text
                style={[
                  localStyles.priceChoiceProduct,
                  { color: colors.principal },
                ]}
                numberOfLines={2}
              >
                {pendingPriceChoice.draftItem.name}
              </Text>
            ) : null}
            <Text
              style={[localStyles.priceChoiceDesc, { color: colors.textMuted }]}
            >
              Identificamos múltiplos valores na etiqueta. Qual preço você deseja considerar?
            </Text>

            <View style={localStyles.priceChoiceList}>
              {(pendingPriceChoice?.prices || []).map((priceVal, idx) => (
                <TouchableOpacity
                  key={`${priceVal}-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => handleSelectDetectedPrice(priceVal)}
                  style={[
                    localStyles.priceChoiceOptionBtn,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderColor: colors.principal,
                    },
                  ]}
                >
                  <View style={localStyles.priceChoiceOptionLeft}>
                    <FontAwesome6
                      name="circle-check"
                      size={16}
                      color={colors.principal}
                    />
                    <Text
                      style={[
                        localStyles.priceChoiceOptionLabel,
                        { color: colors.textoEscuro },
                      ]}
                    >
                      Opção {idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      localStyles.priceChoiceOptionValue,
                      { color: colors.principal },
                    ]}
                  >
                    {formatCurrency(priceVal)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectDetectedPrice(0)}
              style={[
                localStyles.priceChoiceManualBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Text
                style={[
                  localStyles.priceChoiceManualText,
                  { color: colors.textoEscuro },
                ]}
              >
                Digitar outro valor manualmente
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={Boolean(itemToDelete)}
        title="Remover Produto"
        message={`Deseja remover "${
          itemToDelete?.name || ''
        }" desta lista de compras?`}
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

      <ConfirmModal
        visible={showReopenConfirm}
        title="Reabrir Compra"
        message={`Deseja reabrir a compra "${list.name}" para voltar a adicionar ou editar produtos?`}
        confirmLabel="Reabrir"
        onCancel={() => setShowReopenConfirm(false)}
        onConfirm={handleConfirmReopenList}
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
  headerTitleDate: {
    fontSize: 10.5,
    fontWeight: '500',
    opacity: 0.82,
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  headerIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  headerFinalizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  headerReopenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  headerFinalizeChipText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginLeft: 4,
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
  reminderIconButton: {
    width: 48,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    width: 48,
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
  itemPriceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoBadgeBtn: {
    marginRight: 8,
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 28,
    textAlign: 'center',
  },
  deleteItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  fixedTotalBar: {
    borderTopWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 7,
    justifyContent: 'center',
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
  priceChoiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  priceChoiceCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  priceChoiceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceChoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  priceChoiceProduct: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  priceChoiceDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  priceChoiceList: {
    width: '100%',
    marginBottom: 8,
  },
  priceChoiceOptionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  priceChoiceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChoiceOptionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  priceChoiceOptionValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceChoiceManualBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceChoiceManualText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  importModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  importHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  importBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  importCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  importModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  importSubDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  importEmptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  importEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
  },
  importListOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  importListIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  importListName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  importListMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  importItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  importItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 6,
  },
  importItemQty: {
    fontSize: 12,
    fontWeight: '600',
  },
  importAddPlusBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  alreadyImportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  alreadyImportedText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  reminderActionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  reminderActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderActionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  reminderActionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});
