import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import globalStyles from '../../components/StyleSheet/Styles';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  loadLists,
  loadHistory,
  calculateListStats,
  formatCurrency,
  formatDateBR,
  formatMonthYearBR,
} from '../storage/shoppingStorage';

export default function RelatorioScreen({ navigation }) {
  const { colors, dataVersion } = useAppSettings();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'category'

  const loadData = useCallback(async () => {
    try {
      const loadedLists = await loadLists();
      setLists(loadedLists);
    } catch (error) {
      console.error('Erro ao carregar resumo de gastos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData, dataVersion]);

  // Only account for and display lists marked as finalized
  const completedLists = lists.filter((list) =>
    Boolean(list?.completed || list?.finalizada)
  );

  let totalEstimated = 0;
  const categoryTotals = {};
  const monthTotalsMap = {};

  for (const list of completedLists) {
    const stats = calculateListStats(list);
    totalEstimated += stats.estimatedTotal;

    const dateRef = list.createdAt || list.completedAt;
    const { key: monthKey, label: monthLabel } = formatMonthYearBR(dateRef);
    if (!monthTotalsMap[monthKey]) {
      monthTotalsMap[monthKey] = {
        key: monthKey,
        label: monthLabel,
        total: 0,
        listCount: 0,
        itemCount: 0,
      };
    }
    monthTotalsMap[monthKey].total += stats.estimatedTotal;
    monthTotalsMap[monthKey].listCount += 1;
    monthTotalsMap[monthKey].itemCount += stats.totalItems;

    for (const item of list.items || []) {
      const sub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      if (sub > 0) {
        const cat = item.category || 'Outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + sub;
      }
    }
  }

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const monthEntries = Object.values(monthTotalsMap).sort((a, b) =>
    b.key.localeCompare(a.key)
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

  return (
    <ScrollView
      style={[globalStyles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={localStyles.scrollContent}
    >
      <View style={globalStyles.contentContainer}>
        <View
          style={[
            localStyles.filterBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilterMode('month')}
            style={[
              localStyles.filterTab,
              filterMode === 'month' && {
                backgroundColor: colors.principal,
              },
            ]}
          >
            <FontAwesome6
              name="calendar-days"
              size={13}
              color={
                filterMode === 'month'
                  ? colors.textoPrincipal
                  : colors.textoEscuro
              }
            />
            <Text
              style={[
                localStyles.filterTabText,
                {
                  color:
                    filterMode === 'month'
                      ? colors.textoPrincipal
                      : colors.textoEscuro,
                },
              ]}
            >
              Por Mês
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilterMode('category')}
            style={[
              localStyles.filterTab,
              filterMode === 'category' && {
                backgroundColor: colors.principal,
              },
            ]}
          >
            <FontAwesome6
              name="tags"
              size={13}
              color={
                filterMode === 'category'
                  ? colors.textoPrincipal
                  : colors.textoEscuro
              }
            />
            <Text
              style={[
                localStyles.filterTabText,
                {
                  color:
                    filterMode === 'category'
                      ? colors.textoPrincipal
                      : colors.textoEscuro,
                },
              ]}
            >
              Por Categoria
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            localStyles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text style={[localStyles.cardTitle, { color: colors.textoEscuro }]}>
            {filterMode === 'month'
              ? 'Resumo de Gastos por Mês'
              : 'Resumo de Gastos por Categoria'}
          </Text>
          <Text style={[localStyles.estimateValue, { color: colors.principal }]}>
            {formatCurrency(totalEstimated)}
          </Text>
          <Text style={[localStyles.mutedLabel, { color: colors.textMuted }]}>
            {completedLists.length > 0
              ? `Total acumulado em ${completedLists.length} ${
                  completedLists.length === 1
                    ? 'compra finalizada'
                    : 'compras finalizadas'
                }`
              : 'Apenas compras finalizadas aparecem no resumo'}
          </Text>

          {filterMode === 'month' ? (
            monthEntries.length === 0 ? (
              <Text style={[localStyles.emptySmall, { color: colors.textMuted }]}>
                Nenhuma compra finalizada encontrada no período. Apenas compras marcadas como finalizadas aparecem no resumo de gastos.
              </Text>
            ) : (
              <View style={{ marginTop: 14 }}>
                {monthEntries.map((m) => {
                  const pct =
                    totalEstimated > 0
                      ? Math.round((m.total / totalEstimated) * 100)
                      : 0;
                  return (
                    <View key={m.key} style={localStyles.catRow}>
                      <View style={localStyles.catLabelRow}>
                        <View>
                          <Text
                            style={[
                              localStyles.catName,
                              { color: colors.textoEscuro },
                            ]}
                          >
                            {m.label}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.textMuted,
                              marginTop: 1,
                            }}
                          >
                            {m.listCount}{' '}
                            {m.listCount === 1
                              ? 'compra finalizada'
                              : 'compras finalizadas'}{' '}
                            • {m.itemCount}{' '}
                            {m.itemCount === 1 ? 'produto' : 'produtos'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            localStyles.catAmount,
                            { color: colors.principal },
                          ]}
                        >
                          {formatCurrency(m.total)} ({pct}%)
                        </Text>
                      </View>
                      <View
                        style={[
                          localStyles.catTrack,
                          { backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            localStyles.catFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: colors.verdePrincipal,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : categoryEntries.length === 0 ? (
            <Text style={[localStyles.emptySmall, { color: colors.textMuted }]}>
              Nenhuma compra finalizada encontrada nesta categoria. Apenas compras marcadas como finalizadas aparecem no resumo de gastos.
            </Text>
          ) : (
            <View style={{ marginTop: 14 }}>
              {categoryEntries.map(([cat, amount]) => {
                const catPct =
                  totalEstimated > 0
                    ? Math.round((amount / totalEstimated) * 100)
                    : 0;
                return (
                  <View key={cat} style={localStyles.catRow}>
                    <View style={localStyles.catLabelRow}>
                      <Text
                        style={[
                          localStyles.catName,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        {cat}
                      </Text>
                      <Text
                        style={[
                          localStyles.catAmount,
                          { color: colors.textMuted },
                        ]}
                      >
                        {formatCurrency(amount)} ({catPct}%)
                      </Text>
                    </View>
                    <View
                      style={[
                        localStyles.catTrack,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          localStyles.catFill,
                          {
                            width: `${catPct}%`,
                            backgroundColor: colors.verdePrincipal,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View
          style={[
            localStyles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={localStyles.cardHeader}>
            <Text style={[localStyles.cardTitle, { color: colors.textoEscuro }]}>
              Compras Finalizadas
            </Text>
          </View>

          {completedLists.length === 0 ? (
            <View style={localStyles.emptyHistory}>
              <FontAwesome6 name="receipt" size={28} color={colors.textMuted} />
              <Text style={[localStyles.emptySmall, { color: colors.textMuted }]}>
                Nenhuma compra finalizada no momento. Apenas listas finalizadas aparecem neste resumo.
              </Text>
            </View>
          ) : (
            completedLists.map((trip) => {
              const stats = calculateListStats(trip);
              return (
                <View
                  key={trip.id}
                  style={[
                    localStyles.historyRow,
                    { borderTopColor: colors.surfaceMuted },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        localStyles.historyListName,
                        { color: colors.textoEscuro },
                      ]}
                    >
                      {trip.name}
                    </Text>
                    <Text style={[localStyles.historyMeta, { color: colors.textMuted }]}>
                      {formatDateBR(trip.createdAt || trip.completedAt)} •{' '}
                      {stats.totalItems}{' '}
                      {stats.totalItems === 1 ? 'produto' : 'produtos'}
                    </Text>
                  </View>
                  <Text
                    style={[localStyles.historyTotal, { color: colors.principal }]}
                  >
                    {formatCurrency(stats.estimatedTotal)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mutedLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  estimateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 2,
  },
  catRow: {
    marginBottom: 12,
  },
  catLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  catTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptySmall: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  historyListName: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
