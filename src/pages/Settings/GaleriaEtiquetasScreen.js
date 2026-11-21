import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import ConfirmModal from '../../../components/modals/ShoppingModals/ConfirmModal';
import TagPhotoPreviewModal from '../../../components/modals/ShoppingModals/TagPhotoPreviewModal';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  loadLists,
  formatCurrency,
  formatDateBR,
  formatMonthYearBR,
  removeTagPhotosFromItems,
} from '../../storage/shoppingStorage';
import {
  getTagPhotoUri,
  getTagPhotosStorageStats,
} from '../../services/tagPhotoStorage';

// Exact same period filters as RelatorioScreen (Resumo de Gastos)
const PERIOD_FILTERS = [
  { key: 'all', label: 'Período total', months: null },
  { key: 'current_month', label: 'Mês atual', months: 0 },
  { key: '3m', label: 'Últimos 3 meses', months: 3 },
  { key: '6m', label: 'Últimos 6 meses', months: 6 },
  { key: '12m', label: 'Últimos 12 meses', months: 12 },
  { key: 'custom_month', label: 'Selecionar mês', months: null },
];

export default function GaleriaEtiquetasScreen({ navigation }) {
  const {
    colors,
    radiusCard,
    radiusButton,
    radiusInput,
    borderWidth,
    dataVersion,
    notifyDataRestored,
  } = useAppSettings();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(10, insets.bottom);

  const [photoEntries, setPhotoEntries] = useState([]);
  const [storageStats, setStorageStats] = useState({
    count: 0,
    totalBytes: 0,
    formattedSize: '0 KB',
  });
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState([]);

  const [previewEntry, setPreviewEntry] = useState(null);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const fetchGallery = useCallback(async () => {
    try {
      const lists = await loadLists();
      const entries = [];
      for (const list of lists) {
        const items = Array.isArray(list?.items) ? list.items : [];
        for (const item of items) {
          if (!item?.photoFilename) continue;
          const uri = getTagPhotoUri(item.photoFilename);
          if (!uri) continue;
          const capturedAt = item.photoCapturedAt || list.createdAt || null;
          entries.push({
            id: `${list.id}-${item.id}-${item.photoFilename}`,
            photoFilename: item.photoFilename,
            uri,
            productName: item.name || 'Produto',
            listName: list.name || 'Lista de Compras',
            price:
              Number(
                item.precoUnitario ??
                  item.price ??
                  item.preco ??
                  item.retailPrice ??
                  0
              ) || 0,
            capturedAt,
            timestamp: capturedAt ? new Date(capturedAt).getTime() || 0 : 0,
          });
        }
      }
      entries.sort((a, b) => b.timestamp - a.timestamp);
      setPhotoEntries(entries);
      const stats = await getTagPhotosStorageStats(lists);
      setStorageStats(stats);
    } catch (err) {
      console.error('Erro ao carregar galeria de etiquetas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
    const unsub = navigation.addListener('focus', fetchGallery);
    return unsub;
  }, [navigation, fetchGallery, dataVersion]);

  const availableMonths = useMemo(() => {
    const map = {};
    for (const entry of photoEntries) {
      if (!entry.capturedAt) continue;
      const { key, label } = formatMonthYearBR(entry.capturedAt);
      if (key !== '0000-00' && !map[key]) {
        map[key] = { key, label };
      }
    }
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [photoEntries]);

  const selectedMonthObj = useMemo(
    () => availableMonths.find((m) => m.key === selectedMonthKey) || null,
    [availableMonths, selectedMonthKey]
  );

  const filteredEntries = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const activePeriod = PERIOD_FILTERS.find((p) => p.key === periodFilter);

    return photoEntries.filter((entry) => {
      if (q) {
        const matchProduct = entry.productName.toLowerCase().includes(q);
        const matchList = entry.listName.toLowerCase().includes(q);
        if (!matchProduct && !matchList) return false;
      }

      if (periodFilter === 'all') return true;

      if (!entry.capturedAt) return false;
      const d = new Date(entry.capturedAt);
      if (Number.isNaN(d.getTime())) return false;

      if (periodFilter === 'current_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }

      if (periodFilter === 'custom_month' && selectedMonthKey) {
        const { key } = formatMonthYearBR(entry.capturedAt);
        return key === selectedMonthKey;
      }

      if (activePeriod?.months) {
        const cutoff = new Date(
          currentYear,
          currentMonth - (activePeriod.months - 1),
          1
        );
        return d >= cutoff;
      }

      return true;
    });
  }, [photoEntries, searchText, periodFilter, selectedMonthKey]);

  const toggleFiltersPanel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded((prev) => !prev);
  };

  const handlePressPeriodFilter = (filterKey) => {
    if (filterKey === 'custom_month') {
      setIsMonthPickerVisible(true);
    } else {
      setPeriodFilter(filterKey);
    }
  };

  const handleSelectMonth = (monthKey) => {
    setSelectedMonthKey(monthKey);
    setPeriodFilter('custom_month');
    setIsMonthPickerVisible(false);
  };

  const toggleSelectFilename = useCallback((filename) => {
    setSelectedFilenames((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename]
    );
  }, []);

  const handleEnterSelection = useCallback((initialFilename) => {
    setSelectionMode(true);
    setSelectedFilenames(initialFilename ? [initialFilename] : []);
  }, []);

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedFilenames([]);
  };

  const handleSelectAllFiltered = () => {
    const visibleFilenames = filteredEntries.map((e) => e.photoFilename);
    const allSelected =
      visibleFilenames.length > 0 &&
      visibleFilenames.every((f) => selectedFilenames.includes(f));
    if (allSelected) {
      setSelectedFilenames([]);
    } else {
      setSelectedFilenames(Array.from(new Set(visibleFilenames)));
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    await removeTagPhotosFromItems([singleDeleteTarget.photoFilename]);
    setSingleDeleteTarget(null);
    setPreviewEntry(null);
    notifyDataRestored();
    await fetchGallery();
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedFilenames.length === 0) return;
    await removeTagPhotosFromItems(selectedFilenames);
    setShowBatchDeleteConfirm(false);
    setSelectionMode(false);
    setSelectedFilenames([]);
    notifyDataRestored();
    await fetchGallery();
  };

  const renderPhotoCard = useCallback(
    ({ item }) => {
      const isSelected = selectedFilenames.includes(item.photoFilename);
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => {
            if (!selectionMode) handleEnterSelection(item.photoFilename);
          }}
          onPress={() => {
            if (selectionMode) {
              toggleSelectFilename(item.photoFilename);
            } else {
              setPreviewEntry(item);
            }
          }}
          style={[
            styles.photoCard,
            {
              backgroundColor: colors.card,
              borderColor: isSelected ? colors.principal : colors.borderColor,
              borderWidth: isSelected ? 2 : borderWidth,
              borderRadius: radiusCard,
            },
          ]}
        >
          <View style={styles.thumbWrap}>
            <Image
              source={{ uri: item.uri }}
              style={styles.thumbImage}
              resizeMode="cover"
            />
            {selectionMode ? (
              <View
                style={[
                  styles.checkOverlay,
                  {
                    backgroundColor: isSelected
                      ? colors.principal
                      : 'rgba(0,0,0,0.45)',
                    borderColor: '#FFFFFF',
                  },
                ]}
              >
                {isSelected ? (
                  <FontAwesome6 name="check" size={12} color="#FFFFFF" />
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.photoCardBody}>
            <Text
              style={[styles.photoProduct, { color: colors.textoEscuro }]}
              numberOfLines={1}
            >
              {item.productName}
            </Text>
            <Text
              style={[styles.photoList, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.listName}
            </Text>
            <View style={styles.photoMetaRow}>
              <Text style={[styles.photoPrice, { color: colors.principal }]}>
                {item.price > 0 ? formatCurrency(item.price) : '--'}
              </Text>
              <Text style={[styles.photoDate, { color: colors.textMuted }]}>
                {item.capturedAt ? formatDateBR(item.capturedAt) : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      selectedFilenames,
      selectionMode,
      colors,
      borderWidth,
      radiusCard,
      handleEnterSelection,
      toggleSelectFilename,
    ]
  );

  const renderPhotoRow = useCallback(
    ({ item }) => {
      const isSelected = selectedFilenames.includes(item.photoFilename);
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => {
            if (!selectionMode) handleEnterSelection(item.photoFilename);
          }}
          onPress={() => {
            if (selectionMode) {
              toggleSelectFilename(item.photoFilename);
            } else {
              setPreviewEntry(item);
            }
          }}
          style={[
            styles.listRowCard,
            {
              backgroundColor: colors.card,
              borderColor: isSelected ? colors.principal : colors.borderColor,
              borderWidth: isSelected ? 2 : borderWidth,
              borderRadius: radiusCard,
            },
          ]}
        >
          {selectionMode ? (
            <View
              style={[
                styles.rowCheckbox,
                {
                  backgroundColor: isSelected
                    ? colors.principal
                    : 'transparent',
                  borderColor: isSelected ? colors.principal : colors.textMuted,
                },
              ]}
            >
              {isSelected ? (
                <FontAwesome6
                  name="check"
                  size={11}
                  color={colors.textoPrincipal}
                />
              ) : null}
            </View>
          ) : null}

          <Image
            source={{ uri: item.uri }}
            style={[
              styles.rowThumb,
              {
                borderRadius: Math.min(10, radiusButton),
                borderColor: colors.borderColor,
              },
            ]}
            resizeMode="cover"
          />

          <View style={styles.rowInfoCol}>
            <Text
              style={[styles.photoProduct, { color: colors.textoEscuro }]}
              numberOfLines={1}
            >
              {item.productName}
            </Text>
            <Text
              style={[styles.photoList, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.listName}
            </Text>
          </View>

          <View style={styles.rowRightCol}>
            <Text style={[styles.photoPrice, { color: colors.principal }]}>
              {item.price > 0 ? formatCurrency(item.price) : '--'}
            </Text>
            <Text style={[styles.photoDate, { color: colors.textMuted }]}>
              {item.capturedAt ? formatDateBR(item.capturedAt) : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [
      selectedFilenames,
      selectionMode,
      colors,
      borderWidth,
      radiusCard,
      radiusButton,
      handleEnterSelection,
      toggleSelectFilename,
    ]
  );

  if (isLoading) {
    return (
      <View
        style={[
          globalStyles.screen,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.principal} />
      </View>
    );
  }

  const allFilteredSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((e) => selectedFilenames.includes(e.photoFilename));

  const activePeriodLabel =
    periodFilter === 'custom_month' && selectedMonthObj
      ? selectedMonthObj.label
      : PERIOD_FILTERS.find((p) => p.key === periodFilter)?.label ||
        'Período total';

  const hasActivePeriodFilter = periodFilter !== 'all';

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          globalStyles.contentContainer,
          { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
        ]}
      >
        {/* Top Toolbar: Summary + View Mode Toggle (Cards/Lista) + Selecionar */}
        <View style={styles.topRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            {photoEntries.length}{' '}
            {photoEntries.length === 1 ? 'foto' : 'fotos'} •{' '}
            {storageStats.formattedSize}
          </Text>

          {photoEntries.length > 0 ? (
            selectionMode ? (
              <View style={styles.topBtnsRow}>
                <TouchableOpacity
                  onPress={handleSelectAllFiltered}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    {allFilteredSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleExitSelection}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: Math.min(10, radiusButton),
                      marginLeft: 6,
                    },
                  ]}
                >
                  <Text
                    style={[styles.smallPillText, { color: colors.textMuted }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.topBtnsRow}>
                {/* Cards vs Lista Toggle */}
                <View
                  style={[
                    styles.viewToggleWrap,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderColor,
                      borderRadius: Math.min(10, radiusButton),
                      borderWidth,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setViewMode('cards')}
                    style={[
                      styles.viewToggleBtn,
                      {
                        backgroundColor:
                          viewMode === 'cards'
                            ? colors.principal
                            : 'transparent',
                        borderRadius: Math.min(8, radiusButton),
                      },
                    ]}
                    accessibilityLabel="Visualizar em Cards"
                  >
                    <FontAwesome6
                      name="grip"
                      size={11}
                      color={
                        viewMode === 'cards'
                          ? colors.textoPrincipal
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.viewToggleText,
                        {
                          color:
                            viewMode === 'cards'
                              ? colors.textoPrincipal
                              : colors.textMuted,
                        },
                      ]}
                    >
                      Cards
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setViewMode('list')}
                    style={[
                      styles.viewToggleBtn,
                      {
                        backgroundColor:
                          viewMode === 'list'
                            ? colors.principal
                            : 'transparent',
                        borderRadius: Math.min(8, radiusButton),
                      },
                    ]}
                    accessibilityLabel="Visualizar em Lista"
                  >
                    <FontAwesome6
                      name="list"
                      size={11}
                      color={
                        viewMode === 'list'
                          ? colors.textoPrincipal
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.viewToggleText,
                        {
                          color:
                            viewMode === 'list'
                              ? colors.textoPrincipal
                              : colors.textMuted,
                        },
                      ]}
                    >
                      Lista
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => handleEnterSelection(null)}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderColor,
                      borderWidth,
                      borderRadius: Math.min(10, radiusButton),
                      marginLeft: 6,
                    },
                  ]}
                >
                  <FontAwesome6
                    name="list-check"
                    size={11}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      styles.smallPillText,
                      { color: colors.textoEscuro, marginLeft: 5 },
                    ]}
                  >
                    Selecionar
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : null}
        </View>

        {/* Always-Visible Search Input + Collapsible Period Filters */}
        {photoEntries.length > 0 ? (
          <>
            <View
              style={[
                styles.searchRow,
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
                size={13}
                color={colors.textMuted}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.textoEscuro }]}
                placeholder="Buscar por nome do produto ou lista..."
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <FontAwesome6
                    name="xmark"
                    size={14}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View
              style={[
                styles.filterAccordion,
                {
                  backgroundColor: colors.card,
                  borderColor:
                    filtersExpanded || hasActivePeriodFilter
                      ? colors.principal
                      : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleFiltersPanel}
                style={styles.filterAccordionHeader}
                accessibilityLabel="Expandir ou recolher Filtros por Período"
              >
                <FontAwesome6
                  name="calendar-days"
                  size={13}
                  color={colors.principal}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.filterAccordionTitle,
                    { color: colors.textoEscuro },
                  ]}
                >
                  Filtros por Período
                </Text>
                {hasActivePeriodFilter ? (
                  <View
                    style={[
                      styles.activeFilterBadge,
                      { backgroundColor: colors.verdeSuave },
                    ]}
                  >
                    <Text
                      style={[
                        styles.activeFilterBadgeText,
                        { color: colors.badgeText || colors.principal },
                      ]}
                      numberOfLines={1}
                    >
                      {activePeriodLabel}
                    </Text>
                  </View>
                ) : null}
                <FontAwesome6
                  name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
                  size={13}
                  color={colors.textMuted}
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>

              {filtersExpanded ? (
                <View
                  style={[
                    styles.filterAccordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  {/* Period Filter Grid matching RelatorioScreen */}
                  <View style={styles.periodGrid}>
                    {PERIOD_FILTERS.map((period) => {
                      const active = periodFilter === period.key;
                      const isCustomMonthBtn = period.key === 'custom_month';
                      const label =
                        isCustomMonthBtn && active && selectedMonthObj
                          ? selectedMonthObj.label
                          : period.label;

                      return (
                        <TouchableOpacity
                          key={period.key}
                          activeOpacity={0.8}
                          onPress={() => handlePressPeriodFilter(period.key)}
                          style={[
                            styles.periodPill,
                            {
                              backgroundColor: active
                                ? colors.principal
                                : colors.surfaceMuted,
                              borderColor: active
                                ? colors.principal
                                : colors.borderColor,
                              borderRadius: Math.min(10, radiusButton),
                              borderWidth,
                            },
                          ]}
                        >
                          {isCustomMonthBtn ? (
                            <FontAwesome6
                              name="calendar-days"
                              size={11}
                              color={
                                active
                                  ? colors.textoPrincipal
                                  : colors.principal
                              }
                              style={{ marginRight: 5 }}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.periodPillText,
                              {
                                color: active
                                  ? colors.textoPrincipal
                                  : colors.textoEscuro,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Empty State or Gallery List/Grid */}
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyBox}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6
                name="images"
                size={30}
                color={colors.badgeText || colors.principal}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textoEscuro }]}>
              {photoEntries.length === 0
                ? 'Nenhuma foto de etiqueta salva'
                : 'Nenhuma foto encontrada'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {photoEntries.length === 0
                ? 'Quando você fotografar etiquetas de preço com o salvamento ativado, elas aparecerão organizadas aqui.'
                : 'Tente limpar a busca ou escolher outro período nos filtros.'}
            </Text>
          </View>
        ) : (
          <FlatList
            key={viewMode}
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            renderItem={viewMode === 'cards' ? renderPhotoCard : renderPhotoRow}
            numColumns={viewMode === 'cards' ? 2 : 1}
            columnWrapperStyle={
              viewMode === 'cards' ? styles.gridRow : undefined
            }
            contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Multi-Select Bottom Delete Bar */}
      {selectionMode ? (
        <View
          style={[
            styles.selectionFooter,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.borderColor,
              paddingBottom: bottomPad,
            },
          ]}
        >
          <View style={globalStyles.contentContainer}>
            <TouchableOpacity
              disabled={selectedFilenames.length === 0}
              onPress={() => setShowBatchDeleteConfirm(true)}
              style={[
                styles.batchDeleteBtn,
                {
                  backgroundColor:
                    selectedFilenames.length > 0
                      ? colors.logoutRed
                      : colors.disabledBackground,
                  borderRadius: radiusButton,
                },
              ]}
            >
              <FontAwesome6
                name="trash-can"
                size={15}
                color={colors.textoPrincipal}
              />
              <Text
                style={[
                  styles.batchDeleteText,
                  { color: colors.textoPrincipal },
                ]}
              >
                Excluir Selecionadas ({selectedFilenames.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Month Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMonthPickerVisible}
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.monthModalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: radiusCard,
                borderWidth,
              },
            ]}
          >
            <Text
              style={[styles.monthModalTitle, { color: colors.textoEscuro }]}
            >
              Selecionar Mês
            </Text>
            {availableMonths.length === 0 ? (
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Nenhum mês disponível.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {availableMonths.map((m) => {
                  const active =
                    periodFilter === 'custom_month' &&
                    selectedMonthKey === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => handleSelectMonth(m.key)}
                      style={[
                        styles.monthOption,
                        {
                          backgroundColor: active
                            ? colors.verdeSuave
                            : colors.surfaceMuted,
                          borderColor: active
                            ? colors.principal
                            : colors.borderColor,
                          borderRadius: radiusButton,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthOptionText,
                          {
                            color: active
                              ? colors.badgeText || colors.principal
                              : colors.textoEscuro,
                          },
                        ]}
                      >
                        {m.label}
                      </Text>
                      {active ? (
                        <FontAwesome6
                          name="check"
                          size={14}
                          color={colors.principal}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setIsMonthPickerVisible(false)}
              style={[
                styles.monthCancelBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radiusButton,
                },
              ]}
            >
              <Text
                style={[styles.monthCancelText, { color: colors.textoEscuro }]}
              >
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Lightbox Preview */}
      <TagPhotoPreviewModal
        visible={Boolean(previewEntry)}
        photoUri={previewEntry?.uri}
        productName={previewEntry?.productName}
        listName={previewEntry?.listName}
        price={previewEntry?.price}
        capturedAt={previewEntry?.capturedAt}
        onClose={() => setPreviewEntry(null)}
        onDelete={
          previewEntry ? () => setSingleDeleteTarget(previewEntry) : null
        }
      />

      {/* Confirm Single Delete */}
      <ConfirmModal
        visible={Boolean(singleDeleteTarget)}
        title="Excluir Foto da Etiqueta"
        message={`Deseja excluir permanentemente a foto da etiqueta de "${
          singleDeleteTarget?.productName || ''
        }"? O produto continuará salvo na sua lista de compras.`}
        confirmLabel="Excluir"
        onCancel={() => setSingleDeleteTarget(null)}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* Confirm Batch Delete */}
      <ConfirmModal
        visible={showBatchDeleteConfirm}
        title="Excluir Fotos Selecionadas"
        message={`Deseja excluir permanentemente ${selectedFilenames.length} ${
          selectedFilenames.length === 1
            ? 'foto selecionada'
            : 'fotos selecionadas'
        }? Os produtos continuarão salvos nas suas listas.`}
        confirmLabel="Excluir"
        onCancel={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  topBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  viewToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  smallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterAccordion: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  filterAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterAccordionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  activeFilterBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 140,
  },
  activeFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterAccordionBody: {
    borderTopWidth: 1,
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13.5,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoCard: {
    width: '48.6%',
    overflow: 'hidden',
  },
  thumbWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  checkOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCardBody: {
    padding: 9,
  },
  listRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 9,
  },
  rowCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowThumb: {
    width: 50,
    height: 50,
    backgroundColor: '#000000',
    borderWidth: 1,
    marginRight: 11,
  },
  rowInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  rowRightCol: {
    alignItems: 'flex-end',
  },
  photoProduct: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  photoList: {
    fontSize: 11.5,
  },
  photoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  photoPrice: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  photoDate: {
    fontSize: 10.5,
    marginTop: 2,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
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
  emptySub: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectionFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  batchDeleteBtn: {
    width: '100%',
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchDeleteText: {
    fontSize: 14.5,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthModalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 18,
  },
  monthModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    marginBottom: 8,
  },
  monthOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  monthCancelBtn: {
    marginTop: 8,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
