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
import { AppColors } from '../../components/StyleSheet/Colors';
import globalStyles from '../../components/StyleSheet/Styles';
import ConfirmModal from '../../components/modals/ShoppingModals/ConfirmModal';
import {
  loadLists,
  loadHistory,
  clearHistory,
  calculateListStats,
  formatCurrency,
  formatDateBR,
} from '../storage/shoppingStorage';

export default function RelatorioScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loadedLists, loadedHistory] = await Promise.all([
        loadLists(),
        loadHistory(),
      ]);
      setLists(loadedLists);
      setHistory(loadedHistory);
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
  }, [navigation, loadData]);

  const handleConfirmClearHistory = async () => {
    await clearHistory();
    setHistory([]);
    setIsClearModalVisible(false);
  };

  let totalEstimated = 0;
  const categoryTotals = {};
  for (const list of lists) {
    const stats = calculateListStats(list);
    totalEstimated += stats.estimatedTotal;
    for (const item of list.items || []) {
      const sub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      if (sub > 0) {
        const cat = item.category || 'Outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + sub;
      }
    }
  }

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (isLoading) {
    return (
      <View style={[globalStyles.screen, localStyles.centered]}>
        <ActivityIndicator size="large" color={AppColors.principal} />
      </View>
    );
  }

  return (
    <ScrollView
      style={globalStyles.screen}
      contentContainerStyle={localStyles.scrollContent}
    >
      <View style={globalStyles.contentContainer}>
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Estimativa das Listas Ativas</Text>
          <Text style={localStyles.estimateValue}>{formatCurrency(totalEstimated)}</Text>
          <Text style={localStyles.mutedLabel}>
            Distribuído em {lists.length}{' '}
            {lists.length === 1 ? 'lista ativa' : 'listas ativas'}
          </Text>

          {categoryEntries.length === 0 ? (
            <Text style={localStyles.emptySmall}>
              Adicione itens com preço nas suas listas para visualizar o resumo por categoria.
            </Text>
          ) : (
            <View style={{ marginTop: 14 }}>
              {categoryEntries.map(([cat, amount]) => {
                const catPct =
                  totalEstimated > 0 ? Math.round((amount / totalEstimated) * 100) : 0;
                return (
                  <View key={cat} style={localStyles.catRow}>
                    <View style={localStyles.catLabelRow}>
                      <Text style={localStyles.catName}>{cat}</Text>
                      <Text style={localStyles.catAmount}>
                        {formatCurrency(amount)} ({catPct}%)
                      </Text>
                    </View>
                    <View style={localStyles.catTrack}>
                      <View style={[localStyles.catFill, { width: `${catPct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={localStyles.card}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.cardTitle}>Histórico de Compras</Text>
            {history.length > 0 ? (
              <TouchableOpacity onPress={() => setIsClearModalVisible(true)}>
                <Text style={[localStyles.linkText, { color: AppColors.logoutRed }]}>
                  Limpar histórico
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {history.length === 0 ? (
            <View style={localStyles.emptyHistory}>
              <FontAwesome6 name="receipt" size={28} color={AppColors.textMuted} />
              <Text style={localStyles.emptySmall}>
                Nenhuma compra registrada no histórico ainda.
              </Text>
            </View>
          ) : (
            history.map((trip) => (
              <View key={trip.id} style={localStyles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.historyListName}>{trip.listName}</Text>
                  <Text style={localStyles.historyMeta}>
                    {formatDateBR(trip.date)} • {trip.itemCount}{' '}
                    {trip.itemCount === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
                <Text style={localStyles.historyTotal}>{formatCurrency(trip.total)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <ConfirmModal
        visible={isClearModalVisible}
        title="Limpar Histórico"
        message="Tem certeza que deseja apagar todo o histórico de compras?"
        confirmLabel="Limpar"
        onCancel={() => setIsClearModalVisible(false)}
        onConfirm={handleConfirmClearHistory}
      />
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
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
    color: AppColors.textoEscuro,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.principal,
  },
  mutedLabel: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginBottom: 2,
  },
  estimateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.principal,
    marginTop: 6,
    marginBottom: 2,
  },
  catRow: {
    marginBottom: 10,
  },
  catLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textoEscuro,
  },
  catAmount: {
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  catTrack: {
    width: '100%',
    height: 7,
    backgroundColor: AppColors.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    backgroundColor: AppColors.verdePrincipal,
    borderRadius: 999,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptySmall: {
    fontSize: 13,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.surfaceMuted,
  },
  historyListName: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textoEscuro,
  },
  historyMeta: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: AppColors.principal,
  },
});
