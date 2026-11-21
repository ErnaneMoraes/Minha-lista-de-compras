import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import { formatCurrency, formatDateBR } from '../../../src/storage/shoppingStorage';

const { height: SCREEN_H } = Dimensions.get('window');

export default function TagPhotoPreviewModal({
  visible,
  photoUri,
  productName = '',
  listName = '',
  price = 0,
  capturedAt = null,
  onClose,
  onDelete = null,
}) {
  const { colors, radiusCard, radiusButton, borderWidth } = useAppSettings();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
              borderRadius: radiusCard,
              borderWidth,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={[styles.title, { color: colors.textoEscuro }]}
                numberOfLines={2}
              >
                {productName || 'Foto da Etiqueta'}
              </Text>
              {listName ? (
                <Text
                  style={[styles.subtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  Lista: {listName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radiusButton,
                },
              ]}
              accessibilityLabel="Fechar visualização da foto"
            >
              <FontAwesome6 name="xmark" size={16} color={colors.textoEscuro} />
            </TouchableOpacity>
          </View>

          {/* Zoomable / Scrollable Image Container */}
          <ScrollView
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={[
                  styles.image,
                  {
                    backgroundColor: '#000000',
                    borderRadius: Math.min(12, radiusCard),
                  },
                ]}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.missingBox,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radiusCard,
                  },
                ]}
              >
                <FontAwesome6
                  name="image-slash"
                  size={28}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.missingText, { color: colors.textMuted }]}
                >
                  Imagem não encontrada no aparelho.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Details Footer */}
          <View
            style={[
              styles.metaBar,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.borderColor,
                borderRadius: radiusButton,
                borderWidth,
              },
            ]}
          >
            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Preço registrado
              </Text>
              <Text style={[styles.metaValue, { color: colors.principal }]}>
                {Number(price) > 0 ? formatCurrency(price) : 'Não informado'}
              </Text>
            </View>
            <View style={styles.metaColRight}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Capturada em
              </Text>
              <Text style={[styles.metaValue, { color: colors.textoEscuro }]}>
                {capturedAt ? formatDateBR(capturedAt) : '--/--/----'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {onDelete ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onDelete}
                style={[
                  styles.deleteBtn,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.logoutRed,
                    borderRadius: radiusButton,
                  },
                ]}
              >
                <FontAwesome6
                  name="trash-can"
                  size={14}
                  color={colors.logoutRed}
                />
                <Text
                  style={[styles.deleteBtnText, { color: colors.logoutRed }]}
                >
                  Excluir Foto
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={[
                styles.okBtn,
                {
                  backgroundColor: colors.principal,
                  borderRadius: radiusButton,
                },
              ]}
            >
              <Text
                style={[styles.okBtnText, { color: colors.textoPrincipal }]}
              >
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageScroll: {
    maxHeight: Math.min(380, SCREEN_H * 0.48),
    marginBottom: 12,
  },
  imageScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: Math.min(340, SCREEN_H * 0.44),
  },
  missingBox: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  missingText: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  metaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaColRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  okBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
