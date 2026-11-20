import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from '../../../components/StyleSheet/Colors';
import globalStyles from '../../../components/StyleSheet/Styles';
import ItemFormModal from '../../../components/modals/ShoppingModals/ItemFormModal';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import OcrProgressModal from '../../../components/modals/ShoppingModals/OcrProgressModal';
import NativeOcrBridge from '../../../components/common/NativeOcrBridge';
import { recognizeShelfLabel } from '../../services/labelOcr';
import {
  getListById,
  addItemToList,
  updateItemInList,
  updateItemQuantity,
  deleteItemFromList,
  calculateListStats,
  formatCurrency,
} from '../../storage/shoppingStorage';

export default function ListaDetalhesScreen({ route, navigation }) {
  const listId = route?.params?.listId;

  const [list, setList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [banner, setBanner] = useState(null);

  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('manual');
  const [editingItem, setEditingItem] = useState(null);
  const [ocrHint, setOcrHint] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

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
      if (found) {
        navigation.setOptions({ title: found.name });
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da lista:', error);
    } finally {
      setIsLoading(false);
    }
  }, [listId, navigation]);

  useEffect(() => {
    loadList();
    const unsubscribe = navigation.addListener('focus', loadList);
    return unsubscribe;
  }, [navigation, loadList]);

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
    setBanner(null);
    if (Platform.OS === 'web') {
      handleOpenWebCamera();
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setBanner({
          type: 'error',
          text: 'Permissão da câmera negada. Habilite a câmera nas configurações do aparelho.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await processLabelImage({ uri: asset.uri, base64: asset.base64 });
      }
    } catch (error) {
      console.error('Erro ao abrir câmera:', error);
      setBanner({
        type: 'error',
        text: 'Não foi possível abrir a câmera neste dispositivo.',
      });
    }
  };

  const handleCancelOcr = () => {
    ocrCancelledRef.current = true;
    setIsOcrRunning(false);
    setOcrImageUri(null);
  };

  const handleOpenManualAdd = () => {
    setEditingItem(null);
    setOcrHint('');
    setModalMode('manual');
    setIsItemModalVisible(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setOcrHint('');
    setModalMode('edit');
    setIsItemModalVisible(true);
  };

  const handleSubmitModalItem = async (itemData) => {
    if (!list) return;
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

  const handleIncrement = async (item) => {
    if (!list) return;
    const updated = await updateItemQuantity(list.id, item.id, 1);
    if (updated) setList(updated);
  };

  const handleDecrement = async (item) => {
    if (!list) return;
    const currentQty = Number(item.quantity) || 1;
    if (currentQty <= 1) {
      setItemToDelete(item);
      return;
    }
    const updated = await updateItemQuantity(list.id, item.id, -1);
    if (updated) setList(updated);
  };

  const handleConfirmDeleteItem = async () => {
    if (!list || !itemToDelete) return;
    const updated = await deleteItemFromList(list.id, itemToDelete.id);
    if (updated) setList(updated);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <View style={[globalStyles.screen, localStyles.centered]}>
        <ActivityIndicator size="large" color={AppColors.principal} />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={[globalStyles.screen, localStyles.centered]}>
        <Text style={localStyles.emptyTitle}>Lista não encontrada</Text>
        <TouchableOpacity style={localStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={localStyles.backButtonText}>Voltar às listas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = calculateListStats(list);
  const query = searchText.trim().toLowerCase();
  const filteredItems = list.items.filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true
  );

  const renderItem = ({ item }) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.price) || 0;
    const subtotal = qty * unitPrice;
    const desc = item.description ?? item.notes ?? '';

    return (
      <View style={localStyles.itemCard}>
        <TouchableOpacity
          style={localStyles.itemMainArea}
          activeOpacity={0.75}
          onPress={() => handleOpenEditItem(item)}
        >
          <Text style={localStyles.itemName}>{item.name}</Text>

          <View style={localStyles.itemMetaRow}>
            <View style={localStyles.categoryBadge}>
              <Text style={localStyles.categoryBadgeText}>{item.category || 'Outros'}</Text>
            </View>
            <Text style={localStyles.itemPriceText}>
              {formatCurrency(unitPrice)} / {item.unit || 'un'}
            </Text>
          </View>

          {qty > 1 ? (
            <Text style={localStyles.subtotalText}>Subtotal: {formatCurrency(subtotal)}</Text>
          ) : null}

          {desc ? <Text style={localStyles.itemDescription}>{desc}</Text> : null}
        </TouchableOpacity>

        <View style={localStyles.quantityStepper}>
          <TouchableOpacity
            onPress={() => handleDecrement(item)}
            style={localStyles.stepperBtn}
            accessibilityLabel={`Diminuir quantidade de ${item.name}`}
          >
            <FontAwesome6 name="minus" size={14} color={AppColors.textoEscuro} />
          </TouchableOpacity>

          <Text style={localStyles.stepperVal}>{qty}</Text>

          <TouchableOpacity
            onPress={() => handleIncrement(item)}
            style={localStyles.stepperBtn}
            accessibilityLabel={`Aumentar quantidade de ${item.name}`}
          >
            <FontAwesome6 name="plus" size={14} color={AppColors.principal} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.screen}>
      <NativeOcrBridge />

      <View style={[globalStyles.contentContainer, { flex: 1, paddingHorizontal: 16 }]}>
        <View style={localStyles.actionRow}>
          <TouchableOpacity
            style={localStyles.manualAddButton}
            onPress={handleOpenManualAdd}
          >
            <FontAwesome6 name="plus" size={16} color={AppColors.textoPrincipal} />
            <Text style={localStyles.manualAddText}>Adicionar Produto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.cameraButton}
            onPress={handleCameraPress}
            accessibilityLabel="Fotografar etiqueta de preço"
          >
            <FontAwesome6 name="camera" size={20} color={AppColors.textoPrincipal} />
          </TouchableOpacity>
        </View>

        {banner ? (
          <View
            style={[
              localStyles.banner,
              banner.type === 'error' ? localStyles.bannerError : localStyles.bannerOk,
            ]}
          >
            <Text
              style={[
                localStyles.bannerText,
                { color: banner.type === 'error' ? AppColors.logoutRed : AppColors.principal },
              ]}
            >
              {banner.text}
            </Text>
          </View>
        ) : null}

        {list.items.length > 0 ? (
          <View style={localStyles.searchRow}>
            <FontAwesome6 name="magnifying-glass" size={14} color={AppColors.textMuted} />
            <TextInput
              style={localStyles.searchInput}
              placeholder="Buscar produto na lista..."
              placeholderTextColor={AppColors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <FontAwesome6 name="xmark" size={14} color={AppColors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {filteredItems.length === 0 ? (
          <View style={localStyles.emptyListBox}>
            <View style={localStyles.emptyIconBox}>
              <FontAwesome6 name="basket-shopping" size={30} color={AppColors.principal} />
            </View>
            <Text style={localStyles.emptyTitle}>
              {list.items.length === 0
                ? 'Sua lista está vazia'
                : 'Nenhum produto encontrado'}
            </Text>
            <Text style={localStyles.emptySubtitle}>
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

      <View style={localStyles.fixedTotalBar}>
        <View style={[globalStyles.contentContainer, localStyles.totalBarInner]}>
          <View>
            <Text style={localStyles.totalBarLabel}>Valor Total da Compra</Text>
            <Text style={localStyles.totalBarSub}>
              {stats.totalItems} {stats.totalItems === 1 ? 'produto' : 'produtos'} •{' '}
              {stats.totalQuantity} {stats.totalQuantity === 1 ? 'item' : 'itens'}
            </Text>
          </View>
          <Text style={localStyles.totalBarAmount}>{formatCurrency(stats.estimatedTotal)}</Text>
        </View>
      </View>

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
    backgroundColor: AppColors.principal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: AppColors.textoPrincipal,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  manualAddButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.principal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  manualAddText: {
    color: AppColors.textoPrincipal,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cameraButton: {
    width: 54,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.verdePrincipal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bannerOk: {
    backgroundColor: AppColors.verdeSuave,
  },
  bannerError: {
    backgroundColor: AppColors.dangerSoft,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: AppColors.textoEscuro,
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
    backgroundColor: AppColors.verdeSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
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
    color: AppColors.textoEscuro,
    marginBottom: 5,
  },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: AppColors.verdeSuave,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.principal,
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.principal,
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: AppColors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    minWidth: 32,
    textAlign: 'center',
  },
  fixedTotalBar: {
    backgroundColor: AppColors.card,
    borderTopWidth: 2,
    borderTopColor: AppColors.principal,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
  },
  totalBarSub: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  totalBarAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.principal,
  },
});
