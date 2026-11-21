import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAppSettings } from '../../../src/context/AppSettingsContext';

// Proportions of the central horizontal strip in Partial Capture mode
const PARTIAL_TOP_RATIO = 0.31;
const PARTIAL_HEIGHT_RATIO = 0.38;
const PARTIAL_SIDE_MARGIN_RATIO = 0.05;
const MIN_CROP_SIZE = 44;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function InteractiveCropCanvas({
  photo,
  cropRect,
  setCropRect,
  onDisplayBoxReady,
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rectRef = useRef(cropRect);
  const startRectRef = useRef(cropRect);
  const dispRef = useRef({ width: 0, height: 0 });

  rectRef.current = cropRect;

  const photoW = Number(photo?.width) || 1000;
  const photoH = Number(photo?.height) || 1000;

  let dispW = 0;
  let dispH = 0;
  let offsetX = 0;
  let offsetY = 0;

  if (containerSize.width > 0 && containerSize.height > 0) {
    const containerAspect = containerSize.width / containerSize.height;
    const imageAspect = photoW / photoH;
    if (imageAspect > containerAspect) {
      dispW = containerSize.width;
      dispH = containerSize.width / imageAspect;
      offsetX = 0;
      offsetY = (containerSize.height - dispH) / 2;
    } else {
      dispH = containerSize.height;
      dispW = containerSize.height * imageAspect;
      offsetX = (containerSize.width - dispW) / 2;
      offsetY = 0;
    }
  }

  dispRef.current = { width: dispW, height: dispH };

  useEffect(() => {
    if (dispW > 0 && dispH > 0) {
      onDisplayBoxReady({ width: dispW, height: dispH });
      const initW = Math.max(MIN_CROP_SIZE, dispW * 0.84);
      const initH = Math.max(MIN_CROP_SIZE, dispH * 0.7);
      setCropRect({
        x: (dispW - initW) / 2,
        y: (dispH - initH) / 2,
        width: initW,
        height: initH,
      });
    }
  }, [dispW, dispH, photo?.uri]);

  const responders = useMemo(() => {
    const makeResponder = (mode) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRectRef.current = { ...rectRef.current };
        },
        onPanResponderMove: (_, gesture) => {
          const { width: maxW, height: maxH } = dispRef.current;
          if (maxW <= 0 || maxH <= 0) return;

          const start = startRectRef.current;
          const { dx, dy } = gesture;
          let { x, y, width, height } = start;
          const minSize = Math.min(MIN_CROP_SIZE, maxW, maxH);

          if (mode === 'move') {
            x = clamp(start.x + dx, 0, maxW - start.width);
            y = clamp(start.y + dy, 0, maxH - start.height);
          } else {
            if (mode === 'left' || mode === 'tl' || mode === 'bl') {
              const rightEdge = start.x + start.width;
              const nextX = clamp(start.x + dx, 0, rightEdge - minSize);
              x = nextX;
              width = rightEdge - nextX;
            }
            if (mode === 'right' || mode === 'tr' || mode === 'br') {
              width = clamp(start.width + dx, minSize, maxW - start.x);
            }
            if (mode === 'top' || mode === 'tl' || mode === 'tr') {
              const bottomEdge = start.y + start.height;
              const nextY = clamp(start.y + dy, 0, bottomEdge - minSize);
              y = nextY;
              height = bottomEdge - nextY;
            }
            if (mode === 'bottom' || mode === 'bl' || mode === 'br') {
              height = clamp(start.height + dy, minSize, maxH - start.y);
            }
          }

          setCropRect({ x, y, width, height });
        },
      });

    return {
      move: makeResponder('move'),
      tl: makeResponder('tl'),
      tr: makeResponder('tr'),
      bl: makeResponder('bl'),
      br: makeResponder('br'),
      top: makeResponder('top'),
      bottom: makeResponder('bottom'),
      left: makeResponder('left'),
      right: makeResponder('right'),
    };
  }, [setCropRect]);

  const hasValidBox = dispW > 0 && dispH > 0 && cropRect.width > 0 && cropRect.height > 0;

  return (
    <View
      style={styles.cropPreviewWrapper}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (
          width > 0 &&
          height > 0 &&
          (Math.abs(width - containerSize.width) > 1 ||
            Math.abs(height - containerSize.height) > 1)
        ) {
          setContainerSize({ width, height });
        }
      }}
    >
      {dispW > 0 && dispH > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: offsetX,
            top: offsetY,
            width: dispW,
            height: dispH,
          }}
        >
          <Image
            source={{ uri: photo.uri }}
            style={{ width: dispW, height: dispH }}
            resizeMode="stretch"
          />

          {hasValidBox ? (
            <>
              {/* Dark outside masks */}
              <View
                pointerEvents="none"
                style={[
                  styles.cropOutsideMask,
                  { top: 0, left: 0, right: 0, height: cropRect.y },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.cropOutsideMask,
                  {
                    top: cropRect.y + cropRect.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.cropOutsideMask,
                  {
                    top: cropRect.y,
                    left: 0,
                    width: cropRect.x,
                    height: cropRect.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.cropOutsideMask,
                  {
                    top: cropRect.y,
                    left: cropRect.x + cropRect.width,
                    right: 0,
                    height: cropRect.height,
                  },
                ]}
              />

              {/* Interactive Draggable Crop Box */}
              <View
                style={[
                  styles.cropSelectionBox,
                  {
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                  },
                ]}
                {...responders.move.panHandlers}
              >
                {/* Rule of thirds guide lines */}
                <View pointerEvents="none" style={[styles.gridLineH, { top: '33.33%' }]} />
                <View pointerEvents="none" style={[styles.gridLineH, { top: '66.66%' }]} />
                <View pointerEvents="none" style={[styles.gridLineV, { left: '33.33%' }]} />
                <View pointerEvents="none" style={[styles.gridLineV, { left: '66.66%' }]} />

                {/* Draggable Edges */}
                <View
                  style={[styles.edgeHitH, { top: -12 }]}
                  {...responders.top.panHandlers}
                >
                  <View style={styles.edgePillH} />
                </View>
                <View
                  style={[styles.edgeHitH, { bottom: -12 }]}
                  {...responders.bottom.panHandlers}
                >
                  <View style={styles.edgePillH} />
                </View>
                <View
                  style={[styles.edgeHitV, { left: -12 }]}
                  {...responders.left.panHandlers}
                >
                  <View style={styles.edgePillV} />
                </View>
                <View
                  style={[styles.edgeHitV, { right: -12 }]}
                  {...responders.right.panHandlers}
                >
                  <View style={styles.edgePillV} />
                </View>

                {/* Draggable Corners */}
                <View
                  style={[styles.cornerHit, { top: -18, left: -18 }]}
                  {...responders.tl.panHandlers}
                >
                  <View style={[styles.cropCornerVisual, styles.cropCornerTL]} />
                  <View style={styles.cropCornerDot} />
                </View>
                <View
                  style={[styles.cornerHit, { top: -18, right: -18 }]}
                  {...responders.tr.panHandlers}
                >
                  <View style={[styles.cropCornerVisual, styles.cropCornerTR]} />
                  <View style={styles.cropCornerDot} />
                </View>
                <View
                  style={[styles.cornerHit, { bottom: -18, left: -18 }]}
                  {...responders.bl.panHandlers}
                >
                  <View style={[styles.cropCornerVisual, styles.cropCornerBL]} />
                  <View style={styles.cropCornerDot} />
                </View>
                <View
                  style={[styles.cornerHit, { bottom: -18, right: -18 }]}
                  {...responders.br.panHandlers}
                >
                  <View style={[styles.cropCornerVisual, styles.cropCornerBR]} />
                  <View style={styles.cropCornerDot} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const normalizeAndCropImage = async (rawAsset, applyPartialBand) => {
  const actions = [];
  let w = Number(rawAsset.width) || 0;
  let h = Number(rawAsset.height) || 0;

  if (applyPartialBand && w > 0 && h > 0) {
    const originX = Math.max(0, Math.round(w * PARTIAL_SIDE_MARGIN_RATIO));
    const originY = Math.max(0, Math.round(h * PARTIAL_TOP_RATIO));
    const cropW = Math.max(
      50,
      Math.min(w - originX, Math.round(w * (1 - PARTIAL_SIDE_MARGIN_RATIO * 2)))
    );
    const cropH = Math.max(
      50,
      Math.min(h - originY, Math.round(h * PARTIAL_HEIGHT_RATIO))
    );
    actions.push({
      crop: {
        originX,
        originY,
        width: cropW,
        height: cropH,
      },
    });
    w = cropW;
    h = cropH;
  }

  if (w > 1280) {
    const ratio = 1280 / w;
    actions.push({ resize: { width: 1280 } });
    w = 1280;
    h = Math.round(h * ratio);
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    rawAsset.uri,
    actions,
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return {
    uri: manipulated.uri,
    base64: manipulated.base64,
    width: manipulated.width || w,
    height: manipulated.height || h,
  };
};

export default function CameraCaptureModal({
  visible,
  initialPhoto = null,
  onClose,
  onConfirmImage,
}) {
  const { colors, cameraCaptureMode, setCameraCaptureMode, cameraSource } =
    useAppSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // stage: 'camera' | 'preview' | 'crop'
  const [stage, setStage] = useState('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Ensure Android Modal surface and layout are ready before mounting CameraView
  // to prevent black camera preview on Android
  const [isModalShown, setIsModalShown] = useState(false);
  const [hasContainerLayout, setHasContainerLayout] = useState(false);
  const [cameraMountKey, setCameraMountKey] = useState(0);

  const [cropRect, setCropRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const cropDisplayBoxRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (visible) {
      if (initialPhoto) {
        setCapturedPhoto(initialPhoto);
        setStage('preview');
      } else {
        setCapturedPhoto(null);
        setStage('camera');
      }
      setIsProcessing(false);
      setErrorMsg('');
      setCropRect({ x: 0, y: 0, width: 0, height: 0 });
      const timer = setTimeout(() => {
        setIsModalShown(true);
        setCameraMountKey((k) => k + 1);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsModalShown(false);
      setHasContainerLayout(false);
    }
  }, [visible, initialPhoto]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission().then((res) => {
        if (res?.granted) {
          setCameraMountKey((k) => k + 1);
        }
      });
    }
  }, [visible, permission]);

  const handleRequestPermission = async () => {
    const res = await requestPermission();
    if (res?.granted) {
      setCameraMountKey((k) => k + 1);
    }
  };

  const handleLaunchNativeCamera = async () => {
    if (isProcessing) return;
    setErrorMsg('');
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        setErrorMsg('Permissão de câmera negada nas configurações do aparelho.');
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

      setIsProcessing(true);
      const processed = await normalizeAndCropImage(
        result.assets[0],
        cameraCaptureMode === 'partial'
      );
      setCapturedPhoto(processed);
      setStage('preview');
    } catch (err) {
      const msg = err?.message || String(err);
      if (!/cancel/i.test(msg)) {
        setErrorMsg(`Erro ao abrir câmera do celular: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        throw new Error('Não foi possível capturar a imagem.');
      }

      const processed = await normalizeAndCropImage(
        photo,
        cameraCaptureMode === 'partial'
      );
      setCapturedPhoto(processed);
      setStage('preview');
    } catch (err) {
      console.error('Erro ao capturar foto:', err);
      setErrorMsg(
        'Falha na captura direta. Tente novamente ou escolha uma foto da galeria.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (isProcessing) return;
    setErrorMsg('');
    try {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        setErrorMsg('Permissão da galeria negada nas configurações.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      setIsProcessing(true);
      const processed = await normalizeAndCropImage(result.assets[0], false);
      setCapturedPhoto(processed);
      setStage('preview');
    } catch (err) {
      const msg = err?.message || String(err);
      if (!/cancel/i.test(msg)) {
        setErrorMsg(`Erro ao abrir galeria: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto?.uri) return;
    onConfirmImage({
      uri: capturedPhoto.uri,
      base64: capturedPhoto.base64,
    });
  };

  const handleApplyManualCrop = async () => {
    if (!capturedPhoto?.uri || isProcessing) return;
    const dispW = cropDisplayBoxRef.current.width;
    const dispH = cropDisplayBoxRef.current.height;
    if (dispW <= 0 || dispH <= 0 || cropRect.width <= 0 || cropRect.height <= 0) {
      setStage('preview');
      return;
    }

    setIsProcessing(true);
    try {
      const photoW = Number(capturedPhoto.width) || 1000;
      const photoH = Number(capturedPhoto.height) || 600;
      const scaleX = photoW / dispW;
      const scaleY = photoH / dispH;

      const originX = Math.max(
        0,
        Math.min(photoW - 20, Math.round(cropRect.x * scaleX))
      );
      const originY = Math.max(
        0,
        Math.min(photoH - 20, Math.round(cropRect.y * scaleY))
      );
      const cropW = Math.max(
        20,
        Math.min(photoW - originX, Math.round(cropRect.width * scaleX))
      );
      const cropH = Math.max(
        20,
        Math.min(photoH - originY, Math.round(cropRect.height * scaleY))
      );

      const manipulated = await ImageManipulator.manipulateAsync(
        capturedPhoto.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropW,
              height: cropH,
            },
          },
        ],
        {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const updatedPhoto = {
        uri: manipulated.uri,
        base64: manipulated.base64,
        width: manipulated.width || cropW,
        height: manipulated.height || cropH,
      };
      setCapturedPhoto(updatedPhoto);
      setStage('preview');
    } catch (err) {
      console.error('Erro ao recortar foto:', err);
      setErrorMsg('Não foi possível aplicar o recorte.');
    } finally {
      setIsProcessing(false);
    }
  };

  const shouldRenderCameraView =
    visible &&
    stage === 'camera' &&
    Boolean(permission?.granted) &&
    isModalShown &&
    hasContainerLayout;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      visible={visible}
      onShow={() => {
        setIsModalShown(true);
        setCameraMountKey((k) => k + 1);
      }}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View
          style={[
            styles.topBar,
            { backgroundColor: colors.primary },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            accessibilityLabel="Fechar câmera"
          >
            <FontAwesome6 name="xmark" size={18} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Fechar</Text>
          </TouchableOpacity>

          {stage === 'camera' ? (
            <View style={styles.modeTogglePill}>
              <TouchableOpacity
                onPress={() => setCameraCaptureMode('partial')}
                style={[
                  styles.modeOption,
                  cameraCaptureMode === 'partial' && styles.modeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeOptionText,
                    cameraCaptureMode === 'partial' && styles.modeOptionTextActive,
                  ]}
                >
                  Parcial
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCameraCaptureMode('full')}
                style={[
                  styles.modeOption,
                  cameraCaptureMode === 'full' && styles.modeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeOptionText,
                    cameraCaptureMode === 'full' && styles.modeOptionTextActive,
                  ]}
                >
                  Completa
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.stageTitle}>
              {stage === 'preview' ? 'Conferir Foto' : 'Recortar Etiqueta'}
            </Text>
          )}

          <TouchableOpacity
            onPress={handlePickFromGallery}
            style={styles.headerBtn}
          >
            <FontAwesome6 name="images" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Galeria</Text>
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.dangerSoft },
            ]}
          >
            <Text style={[styles.errorBannerText, { color: colors.logoutRed }]}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* STAGE 1: CAMERA */}
        {stage === 'camera' ? (
          !permission ? (
            <View
              style={[
                styles.centered,
                { backgroundColor: colors.background },
              ]}
            >
              <ActivityIndicator size="large" color={colors.verdePrincipal} />
            </View>
          ) : !permission.granted ? (
            <View
              style={[
                styles.permissionBox,
                { backgroundColor: colors.background },
              ]}
            >
              <FontAwesome6
                name="camera"
                size={38}
                color={colors.principal}
                style={{ marginBottom: 14 }}
              />
              <Text
                style={[styles.permissionTitle, { color: colors.textoEscuro }]}
              >
                Permissão da Câmera Necessária
              </Text>
              <Text
                style={[styles.permissionDesc, { color: colors.textMuted }]}
              >
                Permita o acesso à câmera para fotografar etiquetas de preço ou escolha uma imagem da galeria.
              </Text>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: colors.principal, marginBottom: 10 },
                ]}
                onPress={handleRequestPermission}
              >
                <Text style={styles.primaryActionText}>Permitir Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryActionBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={handlePickFromGallery}
              >
                <Text
                  style={[
                    styles.secondaryActionText,
                    { color: colors.textoEscuro },
                  ]}
                >
                  Escolher Foto da Galeria
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={styles.cameraContainer}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0 && !hasContainerLayout) {
                  setHasContainerLayout(true);
                }
              }}
            >
              {shouldRenderCameraView ? (
                <CameraView
                  key={`cam-${cameraMountKey}`}
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  active={true}
                  onMountError={(err) => {
                    console.warn('Erro ao montar CameraView, tentando remontar:', err);
                    setTimeout(() => setCameraMountKey((k) => k + 1), 250);
                  }}
                />
              ) : (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#22C55E" />
                </View>
              )}

              {/* Partial Capture Mask Overlay: Dark top & bottom leaving central horizontal strip transparent */}
              {cameraCaptureMode === 'partial' ? (
                <View
                  style={styles.overlayRoot}
                  pointerEvents="none"
                >
                  <View style={styles.maskTop}>
                    <View style={styles.maskHintBadge}>
                      <FontAwesome6
                        name="compress"
                        size={12}
                        color="#FFFFFF"
                      />
                      <Text style={styles.maskHintText}>
                        Captura Parcial: Posicione a etiqueta na faixa central
                      </Text>
                    </View>
                  </View>

                  <View style={styles.middleRow}>
                    <View style={styles.maskSide} />
                    <View style={styles.focusWindow}>
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.maskSide} />
                  </View>

                  <View style={styles.maskBottom}>
                    <Text style={styles.maskSubText}>
                      Apenas a área iluminada será recortada automaticamente
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.fullModeHintWrap} pointerEvents="none">
                  <View style={styles.maskHintBadge}>
                    <FontAwesome6 name="expand" size={12} color="#FFFFFF" />
                    <Text style={styles.maskHintText}>
                      Captura Completa: Quadro inteiro da câmera
                    </Text>
                  </View>
                </View>
              )}

              {/* Bottom Shutter Bar */}
              <View style={styles.shutterBar}>
                <TouchableOpacity
                  style={styles.systemCameraPill}
                  onPress={handleLaunchNativeCamera}
                  activeOpacity={0.8}
                >
                  <FontAwesome6 name="camera" size={13} color="#FFFFFF" />
                  <Text style={styles.systemCameraPillText}>
                    Abrir Câmera do Celular (Sem Tela Preta)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTakePicture}
                  disabled={isProcessing || !shouldRenderCameraView}
                  style={styles.shutterOuter}
                  accessibilityLabel="Tirar foto da etiqueta"
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.principal}
                    />
                  ) : (
                    <View
                      style={[
                        styles.shutterInner,
                        { backgroundColor: colors.verdePrincipal },
                      ]}
                    >
                      <FontAwesome6 name="camera" size={22} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : null}

        {/* STAGE 2: PREVIEW WITH OPTIONAL CROP ("Usar Foto" or "Recortar Foto") */}
        {stage === 'preview' && capturedPhoto ? (
          <View
            style={[
              styles.previewStage,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.previewImageBox}>
              <Image
                source={{ uri: capturedPhoto.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>

            <View
              style={[
                styles.previewFooter,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.borderColor,
                },
              ]}
            >
              <Text
                style={[styles.previewPrompt, { color: colors.textoEscuro }]}
              >
                Foto capturada! Você pode usar a imagem diretamente ou recortar opcionalmente:
              </Text>

              <View style={styles.previewBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.optionalCropBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.principal,
                    },
                  ]}
                  onPress={() => setStage('crop')}
                >
                  <FontAwesome6
                    name="crop-simple"
                    size={16}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      styles.optionalCropBtnText,
                      { color: colors.principal },
                    ]}
                  >
                    Recortar Foto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.usePhotoBtn,
                    { backgroundColor: colors.principal },
                  ]}
                  onPress={handleUsePhoto}
                >
                  <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.usePhotoBtnText}>Usar Foto</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.retakeLink}
                onPress={() => {
                  if (cameraSource === 'native') {
                    handleLaunchNativeCamera();
                  } else {
                    setCapturedPhoto(null);
                    setStage('camera');
                  }
                }}
              >
                <FontAwesome6
                  name="rotate-left"
                  size={13}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.retakeLinkText, { color: colors.textMuted }]}
                >
                  Tirar outra foto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STAGE 3: INTERACTIVE DRAG-TO-CROP */}
        {stage === 'crop' && capturedPhoto ? (
          <View
            style={[
              styles.previewStage,
              { backgroundColor: colors.background },
            ]}
          >
            <InteractiveCropCanvas
              photo={capturedPhoto}
              cropRect={cropRect}
              setCropRect={setCropRect}
              onDisplayBoxReady={(box) => {
                cropDisplayBoxRef.current = box;
              }}
            />

            <View
              style={[
                styles.cropControlsPanel,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.borderColor,
                },
              ]}
            >
              <Text
                style={[styles.cropPanelTitle, { color: colors.textoEscuro }]}
              >
                Arraste os cantos, bordas ou o centro para enquadrar a etiqueta
              </Text>

              <View style={styles.previewBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.optionalCropBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderColor,
                    },
                  ]}
                  onPress={() => setStage('preview')}
                >
                  <Text
                    style={[
                      styles.optionalCropBtnText,
                      { color: colors.textoEscuro, marginLeft: 0 },
                    ]}
                  >
                    Cancelar Corte
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.usePhotoBtn,
                    { backgroundColor: colors.principal },
                  ]}
                  disabled={isProcessing}
                  onPress={handleApplyManualCrop}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome6 name="crop" size={15} color="#FFFFFF" />
                      <Text style={styles.usePhotoBtnText}>
                        Aplicar Recorte
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  stageTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeTogglePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 20,
    padding: 3,
  },
  modeOption: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 17,
  },
  modeOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  modeOptionText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modeOptionTextActive: {
    color: '#15803D',
  },
  errorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  primaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  maskTop: {
    height: `${PARTIAL_TOP_RATIO * 100}%`,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 14,
  },
  middleRow: {
    height: `${PARTIAL_HEIGHT_RATIO * 100}%`,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  maskSide: {
    width: `${PARTIAL_SIDE_MARGIN_RATIO * 100}%`,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  focusWindow: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#22C55E',
    backgroundColor: 'transparent',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    paddingTop: 14,
  },
  fullModeHintWrap: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  maskHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  maskHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  maskSubText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  shutterBar: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  systemCameraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  systemCameraPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 7,
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewStage: {
    flex: 1,
  },
  previewImageBox: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  cropPreviewWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    padding: 18,
    borderTopWidth: 1,
  },
  previewPrompt: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  previewBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionalCropBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionalCropBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  usePhotoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  retakeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  retakeLinkText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  cropControlsPanel: {
    padding: 16,
    borderTopWidth: 1,
  },
  cropPanelTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  cropOutsideMask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  cropSelectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: 'transparent',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  edgeHitH: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeHitV: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgePillH: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  edgePillV: {
    width: 4,
    height: 34,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  cornerHit: {
    position: 'absolute',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cropCornerVisual: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#FFFFFF',
  },
  cropCornerTL: {
    top: 15,
    left: 15,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cropCornerTR: {
    top: 15,
    right: 15,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  cropCornerBL: {
    bottom: 15,
    left: 15,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cropCornerBR: {
    bottom: 15,
    right: 15,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  cropCornerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
