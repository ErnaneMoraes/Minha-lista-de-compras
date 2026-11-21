import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { FontAwesome6 } from '@expo/vector-icons';
import globalStyles from '../../components/StyleSheet/Styles';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  loadLists,
  calculateListStats,
  formatCurrency,
  formatMonthYearBR,
} from '../storage/shoppingStorage';

const PERIOD_FILTERS = [
  { key: '3m', label: 'Últimos 3 meses', months: 3 },
  { key: '6m', label: 'Últimos 6 meses', months: 6 },
  { key: '12m', label: 'Últimos 12 meses', months: 12 },
  { key: 'all', label: 'Período total', months: null },
];

// High-contrast, distinct color palette for category slices in Light & Dark modes
const CATEGORY_COLOR_MAP = {
  Hortifruti: '#16A34A',
  Carnes: '#DC2626',
  'Laticínios': '#F59E0B',
  Mercearia: '#2563EB',
  Bebidas: '#0891B2',
  Padaria: '#D97706',
  Limpeza: '#7C3AED',
  Higiene: '#DB2777',
  Outros: '#64748B',
};

const FALLBACK_PIE_COLORS = [
  '#16A34A',
  '#2563EB',
  '#DC2626',
  '#F59E0B',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#D97706',
  '#4F46E5',
  '#059669',
  '#64748B',
];

function getCategoryColor(category, index) {
  if (CATEGORY_COLOR_MAP[category]) {
    return CATEGORY_COLOR_MAP[category];
  }
  return FALLBACK_PIE_COLORS[index % FALLBACK_PIE_COLORS.length];
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function createPieSlicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    cx,
    cy,
    'L',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z',
  ].join(' ');
}

function CategoryPieChart({ slices, total, colors }) {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 88;
  const innerRadius = 42;

  let cumulativeAngle = 0;

  return (
    <View style={localStyles.pieContainer}>
      <View style={localStyles.pieSvgWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {slices.length === 1 ? (
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={slices[0].color}
              />
            ) : (
              slices.map((slice) => {
                const sliceAngle =
                  total > 0 ? (slice.amount / total) * 360 : 0;
                const startAngle = cumulativeAngle;
                const endAngle = cumulativeAngle + Math.max(sliceAngle, 0.5);
                cumulativeAngle += sliceAngle;

                if (sliceAngle >= 359.9) {
                  return (
                    <Circle
                      key={slice.category}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={slice.color}
                    />
                  );
                }

                const d = createPieSlicePath(
                  cx,
                  cy,
                  radius,
                  startAngle,
                  Math.min(endAngle, 359.99)
                );

                return (
                  <Path
                    key={slice.category}
                    d={d}
                    fill={slice.color}
                    stroke={colors.card}
                    strokeWidth={2}
                  />
                );
              })
            )}
            {/* Inner donut cutout for modern readability */}
            <Circle cx={cx} cy={cy} r={innerRadius} fill={colors.card} />
          </G>
        </Svg>
        <View pointerEvents="none" style={localStyles.pieCenterLabelWrap}>
          <Text style={[localStyles.pieCenterSub, { color: colors.textMuted }]}>
            {slices.length} {slices.length === 1 ? 'cat.' : 'cats.'}
          </Text>
        </View>
      </View>

      {/* Clear Legend with Color, Category, R$ Value, and Percentage */}
      <View style={localStyles.legendContainer}>
        {slices.map((slice) => (
          <View
            key={slice.category}
            style={[
              localStyles.legendRow,
              { borderBottomColor: colors.surfaceMuted },
            ]}
          >
            <View style={localStyles.legendLeft}>
              <View
                style={[
                  localStyles.legendColorDot,
                  { backgroundColor: slice.color },
                ]}
              />
              <Text
                style={[localStyles.legendCatName, { color: colors.textoEscuro }]}
                numberOfLines={1}
              >
                {slice.category}
              </Text>
            </View>
            <View style={localStyles.legendRight}>
              <Text
                style={[localStyles.legendAmount, { color: colors.textoEscuro }]}
              >
                {formatCurrency(slice.amount)}
              </Text>
              <View
                style={[
                  localStyles.legendPctBadge,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[localStyles.legendPctText, { color: colors.principal }]}
                >
                  {slice.percentageFormatted}%
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function RelatorioScreen({ navigation }) {
  const { colors, dataVersion } = useAppSettings();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Period filter: '3m' | '6m' | '12m' | 'all' (default: 'all')
  const [periodFilter, setPeriodFilter] = useState('all');
  // Chart visualization mode: 'bars' | 'pie'
  const [chartType, setChartType] = useState('bars');
  // Breakdown dimension when in 'bars' mode: 'month' | 'category'
  const [barDimension, setBarDimension] = useState('month');

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

  // Only account for lists marked as finalized (completed === true) within the active period filter
  const completedLists = useMemo(() => {
    const allCompleted = lists.filter((list) =>
      Boolean(list?.completed || list?.finalizada)
    );
    const activePeriodObj = PERIOD_FILTERS.find((p) => p.key === periodFilter);
    if (!activePeriodObj || !activePeriodObj.months) {
      return allCompleted;
    }

    const now = new Date();
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth() - activePeriodObj.months,
      now.getDate(),
      0,
      0,
      0,
      0
    );

    return allCompleted.filter((list) => {
      const rawDate = list.createdAt || list.completedAt;
      if (!rawDate) return false;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed >= cutoff;
    });
  }, [lists, periodFilter]);

  const analytics = useMemo(() => {
    let totalEstimated = 0;
    let totalProducts = 0;
    const categoryTotals = {};
    const monthTotalsMap = {};

    for (const list of completedLists) {
      const stats = calculateListStats(list);
      totalEstimated += stats.estimatedTotal;
      totalProducts += stats.totalItems;

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
        const qty = Math.max(
          0,
          Number(item.quantity ?? item.quantidade ?? 1) || 0
        );
        const unitPrice = Math.max(
          0,
          Number(
            item.precoUnitario ??
              item.price ??
              item.preco ??
              item.retailPrice ??
              item.wholesalePrice ??
              0
          ) || 0
        );
        const sub = qty * unitPrice;
        if (sub > 0) {
          const cat = item.category || 'Outros';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + sub;
        }
      }
    }

    totalEstimated = Math.round(totalEstimated * 100) / 100;
    const averagePerPurchase =
      completedLists.length > 0
        ? Math.round((totalEstimated / completedLists.length) * 100) / 100
        : 0;

    const categoryEntries = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount], index) => {
        const rawPct = totalEstimated > 0 ? (amount / totalEstimated) * 100 : 0;
        const percentageFormatted =
          rawPct >= 10 || Number.isInteger(Math.round(rawPct * 10) / 10)
            ? String(Math.round(rawPct))
            : rawPct.toFixed(1).replace('.', ',');
        return {
          category,
          amount: Math.round(amount * 100) / 100,
          percentage: Math.round(rawPct),
          percentageFormatted,
          color: getCategoryColor(category, index),
        };
      });

    const monthEntries = Object.values(monthTotalsMap).sort((a, b) =>
      b.key.localeCompare(a.key)
    );

    return {
      totalEstimated,
      averagePerPurchase,
      totalProducts,
      categoryEntries,
      monthEntries,
    };
  }, [completedLists]);

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

  const activePeriodLabel =
    PERIOD_FILTERS.find((p) => p.key === periodFilter)?.label || 'Período total';

  return (
    <ScrollView
      style={[globalStyles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={localStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={globalStyles.contentContainer}>
        {/* Period Filter Bar: Últimos 3 meses | Últimos 6 meses | Últimos 12 meses | Período total */}
        <View
          style={[
            localStyles.periodCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={localStyles.periodHeaderRow}>
            <FontAwesome6
              name="calendar-check"
              size={13}
              color={colors.principal}
            />
            <Text
              style={[localStyles.periodSectionLabel, { color: colors.textoEscuro }]}
            >
              Período de Análise
            </Text>
          </View>
          <View style={localStyles.periodGrid}>
            {PERIOD_FILTERS.map((period) => {
              const active = periodFilter === period.key;
              return (
                <TouchableOpacity
                  key={period.key}
                  activeOpacity={0.8}
                  onPress={() => setPeriodFilter(period.key)}
                  style={[
                    localStyles.periodPill,
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
                      localStyles.periodPillText,
                      {
                        color: active
                          ? colors.textoPrincipal
                          : colors.textoEscuro,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary KPI Card */}
        <View
          style={[
            localStyles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={localStyles.kpiTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[localStyles.kpiLabel, { color: colors.textMuted }]}>
                Total Gasto ({activePeriodLabel})
              </Text>
              <Text
                style={[localStyles.estimateValue, { color: colors.principal }]}
              >
                {formatCurrency(analytics.totalEstimated)}
              </Text>
            </View>
            <View
              style={[
                localStyles.kpiIconBadge,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <FontAwesome6
                name="chart-line"
                size={20}
                color={colors.principal}
              />
            </View>
          </View>

          <View
            style={[
              localStyles.kpiMetricsRow,
              { borderTopColor: colors.surfaceMuted },
            ]}
          >
            <View style={localStyles.kpiMetricCol}>
              <Text
                style={[localStyles.kpiMetricValue, { color: colors.textoEscuro }]}
              >
                {completedLists.length}
              </Text>
              <Text
                style={[localStyles.kpiMetricLabel, { color: colors.textMuted }]}
              >
                {completedLists.length === 1
                  ? 'Compra finalizada'
                  : 'Compras finalizadas'}
              </Text>
            </View>

            <View
              style={[
                localStyles.kpiDivider,
                { backgroundColor: colors.surfaceMuted },
              ]}
            />

            <View style={localStyles.kpiMetricCol}>
              <Text
                style={[localStyles.kpiMetricValue, { color: colors.textoEscuro }]}
              >
                {formatCurrency(analytics.averagePerPurchase)}
              </Text>
              <Text
                style={[localStyles.kpiMetricLabel, { color: colors.textMuted }]}
              >
                Média por compra
              </Text>
            </View>

            <View
              style={[
                localStyles.kpiDivider,
                { backgroundColor: colors.surfaceMuted },
              ]}
            />

            <View style={localStyles.kpiMetricCol}>
              <Text
                style={[localStyles.kpiMetricValue, { color: colors.textoEscuro }]}
              >
                {analytics.totalProducts}
              </Text>
              <Text
                style={[localStyles.kpiMetricLabel, { color: colors.textMuted }]}
              >
                {analytics.totalProducts === 1 ? 'Produto' : 'Produtos'}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Analytical Chart Card with Toggle: Barras/Evolução vs Gráfico de Pizza */}
        <View
          style={[
            localStyles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {/* Chart Type Toggle: Barras / Evolução vs Gráfico de Pizza */}
          <View
            style={[
              localStyles.chartToggleBar,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setChartType('bars')}
              style={[
                localStyles.chartToggleBtn,
                chartType === 'bars' && {
                  backgroundColor: colors.principal,
                },
              ]}
            >
              <FontAwesome6
                name="chart-simple"
                size={13}
                color={
                  chartType === 'bars'
                    ? colors.textoPrincipal
                    : colors.textoEscuro
                }
              />
              <Text
                style={[
                  localStyles.chartToggleText,
                  {
                    color:
                      chartType === 'bars'
                        ? colors.textoPrincipal
                        : colors.textoEscuro,
                  },
                ]}
              >
                Barras / Evolução
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setChartType('pie')}
              style={[
                localStyles.chartToggleBtn,
                chartType === 'pie' && {
                  backgroundColor: colors.principal,
                },
              ]}
            >
              <FontAwesome6
                name="chart-pie"
                size={13}
                color={
                  chartType === 'pie'
                    ? colors.textoPrincipal
                    : colors.textoEscuro
                }
              />
              <Text
                style={[
                  localStyles.chartToggleText,
                  {
                    color:
                      chartType === 'pie'
                        ? colors.textoPrincipal
                        : colors.textoEscuro,
                  },
                ]}
              >
                Gráfico de Pizza
              </Text>
            </TouchableOpacity>
          </View>

          {chartType === 'pie' ? (
            <>
              <Text
                style={[localStyles.cardTitle, { color: colors.textoEscuro }]}
              >
                Distribuição de Gastos por Categoria
              </Text>
              <Text
                style={[localStyles.mutedLabel, { color: colors.textMuted }]}
              >
                Proporção acumulada por categoria em {activePeriodLabel.toLowerCase()}
              </Text>

              {analytics.categoryEntries.length === 0 ? (
                <View style={localStyles.emptyChartBox}>
                  <FontAwesome6
                    name="chart-pie"
                    size={28}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[localStyles.emptySmall, { color: colors.textMuted }]}
                  >
                    Nenhuma compra finalizada encontrada no período selecionado para gerar o gráfico de pizza.
                  </Text>
                </View>
              ) : (
                <CategoryPieChart
                  slices={analytics.categoryEntries}
                  total={analytics.totalEstimated}
                  colors={colors}
                />
              )}
            </>
          ) : (
            <>
              <View style={localStyles.barHeaderRow}>
                <Text
                  style={[
                    localStyles.cardTitle,
                    { color: colors.textoEscuro, flex: 1 },
                  ]}
                >
                  {barDimension === 'month'
                    ? 'Evolução Mensal'
                    : 'Gastos por Categoria'}
                </Text>

                <View
                  style={[
                    localStyles.subDimensionPill,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setBarDimension('month')}
                    style={[
                      localStyles.subDimensionOption,
                      barDimension === 'month' && {
                        backgroundColor: colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.subDimensionText,
                        {
                          color:
                            barDimension === 'month'
                              ? colors.principal
                              : colors.textMuted,
                        },
                      ]}
                    >
                      Por Mês
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBarDimension('category')}
                    style={[
                      localStyles.subDimensionOption,
                      barDimension === 'category' && {
                        backgroundColor: colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.subDimensionText,
                        {
                          color:
                            barDimension === 'category'
                              ? colors.principal
                              : colors.textMuted,
                        },
                      ]}
                    >
                      Categoria
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {barDimension === 'month' ? (
                analytics.monthEntries.length === 0 ? (
                  <View style={localStyles.emptyChartBox}>
                    <FontAwesome6
                      name="calendar-xmark"
                      size={26}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        localStyles.emptySmall,
                        { color: colors.textMuted },
                      ]}
                    >
                      Nenhuma compra finalizada encontrada no período selecionado.
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 14 }}>
                    {analytics.monthEntries.map((m) => {
                      const pct =
                        analytics.totalEstimated > 0
                          ? Math.round(
                              (m.total / analytics.totalEstimated) * 100
                            )
                          : 0;
                      return (
                        <View key={m.key} style={localStyles.catRow}>
                          <View style={localStyles.catLabelRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
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
              ) : analytics.categoryEntries.length === 0 ? (
                <View style={localStyles.emptyChartBox}>
                  <FontAwesome6
                    name="tags"
                    size={26}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[localStyles.emptySmall, { color: colors.textMuted }]}
                  >
                    Nenhuma compra finalizada encontrada no período selecionado.
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  {analytics.categoryEntries.map((entry) => (
                    <View key={entry.category} style={localStyles.catRow}>
                      <View style={localStyles.catLabelRow}>
                        <View style={localStyles.legendLeft}>
                          <View
                            style={[
                              localStyles.legendColorDot,
                              { backgroundColor: entry.color },
                            ]}
                          />
                          <Text
                            style={[
                              localStyles.catName,
                              { color: colors.textoEscuro },
                            ]}
                          >
                            {entry.category}
                          </Text>
                        </View>
                        <Text
                          style={[
                            localStyles.catAmount,
                            { color: colors.textoEscuro },
                          ]}
                        >
                          {formatCurrency(entry.amount)} ({entry.percentageFormatted}%)
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
                              width: `${Math.max(entry.percentage, 2)}%`,
                              backgroundColor: entry.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
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
    paddingVertical: 14,
    paddingBottom: 32,
  },
  periodCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  periodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodSectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  periodPill: {
    width: '47.5%',
    marginHorizontal: '1.25%',
    marginBottom: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  estimateValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
  kpiMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  kpiMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  kpiMetricLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  chartToggleBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  chartToggleText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  barHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subDimensionPill: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  subDimensionOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subDimensionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  mutedLabel: {
    fontSize: 12,
    marginTop: 3,
  },
  catRow: {
    marginBottom: 13,
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
  emptyChartBox: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  emptySmall: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  pieContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  pieSvgWrapper: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pieCenterLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterSub: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  legendContainer: {
    width: '100%',
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  legendColorDot: {
    width: 13,
    height: 13,
    borderRadius: 4,
    marginRight: 9,
  },
  legendCatName: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  legendPctBadge: {
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  legendPctText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
