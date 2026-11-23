import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from '../StyleSheet/Colors';
import { recordAppErrorLog } from '../../src/services/diagnosticLogService';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro de renderização:', error, errorInfo);
    recordAppErrorLog({
      scope: 'Crash de Renderização (ErrorBoundary)',
      message: error?.message || String(error || 'Erro de renderização'),
      stack: errorInfo?.componentStack || error?.stack || '',
    }).catch(() => {});
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <FontAwesome6
                name="triangle-exclamation"
                size={30}
                color={AppColors.logoutRed}
              />
            </View>
            <Text style={styles.title}>Algo deu errado</Text>
            <Text style={styles.message}>
              Ocorreu um erro inesperado ao exibir esta tela. Fique tranquilo:
              suas listas de compras e lembretes continuam salvos com segurança
              no aparelho.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={this.handleRetry}
              style={styles.retryButton}
              accessibilityLabel="Tentar novamente"
            >
              <FontAwesome6
                name="rotate-right"
                size={15}
                color={AppColors.textoPrincipal}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: AppColors.card,
    borderColor: AppColors.borderColor,
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: AppColors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 22,
  },
  retryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.principal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: AppColors.textoPrincipal,
  },
});
