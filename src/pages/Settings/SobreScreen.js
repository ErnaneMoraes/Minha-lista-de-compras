import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import globalStyles from '../../../components/StyleSheet/Styles';
import { useAppSettings } from '../../context/AppSettingsContext';
import appConfig from '../../../app.json';
import {
  APP_VERSION,
  APP_BUILD_TAG,
  APP_CHANGELOG,
} from '../../constants/appVersion';

export const GITHUB_REPO_URL =
  'https://github.com/ErnaneMoraes/Minha-lista-de-compras';

export default function SobreScreen() {
  const { colors, radiusCard, radiusButton, borderWidth } = useAppSettings();
  const insets = useSafeAreaInsets();
  const appName = appConfig?.expo?.name || 'Minha Lista de Compras';
  const appVersion = APP_VERSION || appConfig?.expo?.version || '1.0.1';

  const handleOpenRepo = async () => {
    try {
      const supported = await Linking.canOpenURL(GITHUB_REPO_URL);
      if (supported) {
        await Linking.openURL(GITHUB_REPO_URL);
      } else {
        await Linking.openURL(GITHUB_REPO_URL);
      }
    } catch (err) {
      console.warn('Não foi possível abrir o link do repositório:', err);
    }
  };

  return (
    <View style={[globalStyles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={globalStyles.contentContainer}>
          {/* Hero App Identity Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: radiusCard,
                borderWidth,
              },
            ]}
          >
            <View
              style={[
                styles.logoBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <FontAwesome6
                name="cart-shopping"
                size={34}
                color={colors.textoPrincipal}
              />
            </View>
            <Text style={[styles.appName, { color: colors.textoEscuro }]}>
              {appName}
            </Text>
            <View
              style={[
                styles.versionPill,
                { backgroundColor: colors.verdeSuave },
              ]}
            >
              <Text style={[styles.versionText, { color: colors.principal }]}>
                Versão {appVersion}
              </Text>
            </View>
            <Text style={[styles.appTagline, { color: colors.textMuted }]}>
              Gerenciamento prático de listas de compras, lembretes reutilizáveis,
              leitura de etiquetas por câmera e controle financeiro — tudo 100%
              offline no seu aparelho.
            </Text>
          </View>

          {/* Changelog Card — Histórico de Atualizações */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: radiusCard,
                borderWidth,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name="clock-rotate-left"
                  size={16}
                  color={colors.principal}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textoEscuro }]}>
                Histórico de Atualizações
              </Text>
            </View>

            {APP_CHANGELOG.map((release, idx) => (
              <View
                key={release.version}
                style={[
                  styles.changelogItem,
                  idx < APP_CHANGELOG.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderColor,
                    paddingBottom: 12,
                    marginBottom: 12,
                  },
                ]}
              >
                <View style={styles.changelogHeaderRow}>
                  <View
                    style={[
                      styles.changelogVerBadge,
                      { backgroundColor: colors.verdeSuave },
                    ]}
                  >
                    <Text
                      style={[
                        styles.changelogVerText,
                        { color: colors.principal },
                      ]}
                    >
                      v{release.version}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.changelogDate,
                      { color: colors.textMuted },
                    ]}
                  >
                    {release.date}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.changelogTitle,
                    { color: colors.textoEscuro },
                  ]}
                >
                  {release.title}
                </Text>
                {release.highlights.map((bullet) => (
                  <View key={bullet} style={styles.changelogBulletRow}>
                    <View
                      style={[
                        styles.changelogDot,
                        { backgroundColor: colors.principal },
                      ]}
                    />
                    <Text
                      style={[
                        styles.changelogBulletText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={[styles.buildTagText, { color: colors.textMuted }]}>
              Build: {APP_BUILD_TAG}
            </Text>
          </View>

          {/* Privacy Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: radiusCard,
                borderWidth,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name="shield-halved"
                  size={16}
                  color={colors.principal}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textoEscuro }]}>
                Privacidade Total (100% Offline)
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textMuted }]}>
              Este aplicativo foi desenvolvido com foco total na sua privacidade:
              não possui servidores externos, não exige cadastro ou login e{' '}
              <Text style={{ fontWeight: 'bold', color: colors.textoEscuro }}>
                não envia nenhum dado para a nuvem
              </Text>
              . Todas as suas listas de compras, preços, histórico de gastos e
              lembretes ficam armazenados exclusivamente no seu dispositivo.
            </Text>
          </View>

          {/* Portability & Sharing Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name="share-nodes"
                  size={16}
                  color={colors.principal}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textoEscuro }]}>
                Portabilidade e Compartilhamento
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textMuted }]}>
              Você tem autonomia total sobre seus dados: exporte backups
              completos ou parciais (apenas listas de compras ou apenas
              lembretes) em arquivos <Text style={{ fontWeight: 'bold' }}>.json</Text>,
              importe diretamente pelo Android usando a opção{' '}
              <Text style={{ fontWeight: 'bold', color: colors.textoEscuro }}>
                "Abrir com..."
              </Text>{' '}
              e envie uma lista de compras ou de lembretes para outra pessoa
              importar facilmente no aparelho dela.
            </Text>
          </View>

          {/* Official Repository Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.verdeSuave },
                ]}
              >
                <FontAwesome6
                  name="code-branch"
                  size={16}
                  color={colors.principal}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textoEscuro }]}>
                Repositório Oficial
              </Text>
            </View>
            <Text
              style={[
                styles.cardBody,
                { color: colors.textMuted, marginBottom: 12 },
              ]}
            >
              Acompanhe atualizações, código-fonte e documentação do projeto no
              GitHub:
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenRepo}
              style={[
                styles.repoButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.principal,
                },
              ]}
              accessibilityLabel="Abrir repositório oficial no GitHub"
            >
              <FontAwesome6
                name="github"
                size={18}
                color={colors.principal}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[styles.repoUrlText, { color: colors.principal }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {GITHUB_REPO_URL}
              </Text>
              <FontAwesome6
                name="arrow-up-right-from-square"
                size={13}
                color={colors.principal}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            Licença 0BSD • Funcionamento 100% local (Offline-First)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  logoBadge: {
    width: 74,
    height: 74,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  appTagline: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardBody: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  repoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  repoUrlText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  changelogItem: {
    width: '100%',
  },
  changelogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  changelogVerBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
  },
  changelogVerText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  changelogDate: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  changelogTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  changelogBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  changelogDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 8,
  },
  changelogBulletText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  buildTagText: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
});
