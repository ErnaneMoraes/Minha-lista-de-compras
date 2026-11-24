import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import { detectShelfTagCropBounds } from '../../../src/services/labelOcr.native';
import { recordAppErrorLog } from '../../../src/services/diagnosticLogService';

const BARCODE_TYPES = ['ean13', 'ean8'];

function isValidGs1BarcodeChecksum(digits) {
  const n = digits.length;
  if (n !== 8 && n !== 13) return false;
  if (digits.startsWith('2')) return false;
  // EAN-13 brasileiro exige prefixo oficial GS1 Brasil (789 ou 790)
  if (n === 13 && !digits.startsWith('789') && !digits.startsWith('790')) {
    return false;
  }
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = n - 2; i >= 0; i -= 1) {
    const posFromRight = n - 1 - i;
    const weight = posFromRight % 2 === 1 ? 3 : 1;
    sum += Number(digits[i]) * weight;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(digits[n - 1]);
}

// Proportions of the central horizontal strip in Partial Capture mode
const PARTIAL_TOP_RATIO = 0.31;
const PARTIAL_HEIGHT_RATIO = 0.38;
const PARTIAL_SIDE_MARGIN_RATIO = 0.05;

// Strict minimum crop box dimensions in screen pixels (40x30 as specified)
const MIN_CROP_WIDTH = 40;
const MIN_CROP_HEIGHT = 30;

// Touch target sizes (>= 44x44 pts for corners)
const CORNER_HIT_SIZE = 48;
const EDGE_HIT_SIZE = 32;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function InteractiveCropCanvas({
  photo,
  mode = 'partial',
  initialCropNormalized = null,
  onCropMetaReady,
  onCropBoxChange,
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({
    width: Number(photo?.width) || 0,
    height: Number(photo?.height) || 0,
  });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const cropBoxRef = useRef(cropBox);
  const startCropRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const onCropBoxChangeRef = useRef(onCropBoxChange);
  onCropBoxChangeRef.current = onCropBoxChange;

  const renderedMetaRef = useRef({
    scale: 1,
    renderedWidth: 0,
    renderedHeight: 0,
    offsetX: 0,
    offsetY: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });

  cropBoxRef.current = cropBox;

  // Ensure exact naturalWidth & naturalHeight from Image.getSize
  useEffect(() => {
    if (!photo?.uri) return;
    const initW = Number(photo?.width) || 0;
    const initH = Number(photo?.height) || 0;
    if (initW > 0 && initH > 0) {
      setNaturalSize({ width: initW, height: initH });
    }
    Image.getSize(
      photo.uri,
      (w, h) => {
        if (w > 0 && h > 0) {
          setNaturalSize((prev) =>
            prev.width === w && prev.height === h ? prev : { width: w, height: h }
          );
        }
      },
      () => {}
    );
  }, [photo?.uri, photo?.width, photo?.height]);

  const naturalWidth = naturalSize.width || Number(photo?.width) || 1200;
  const naturalHeight = naturalSize.height || Number(photo?.height) || 1600;

  // 1. Calculate renderedRect inside container (resizeMode="contain")
  const renderedMeta = useMemo(() => {
    if (
      containerSize.width <= 0 ||
      containerSize.height <= 0 ||
      naturalWidth <= 0 ||
      naturalHeight <= 0
    ) {
      return {
        scale: 1,
        renderedWidth: 0,
        renderedHeight: 0,
        offsetX: 0,
        offsetY: 0,
        naturalWidth,
        naturalHeight,
      };
    }

    const scale = Math.min(
      containerSize.width / naturalWidth,
      containerSize.height / naturalHeight
    );
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const offsetX = (containerSize.width - renderedWidth) / 2;
    const offsetY = (containerSize.height - renderedHeight) / 2;

    return {
      scale,
      renderedWidth,
      renderedHeight,
      offsetX,
      offsetY,
      naturalWidth,
      naturalHeight,
    };
  }, [containerSize.width, containerSize.height, naturalWidth, naturalHeight]);

  renderedMetaRef.current = renderedMeta;

  // Initialize or reset crop box whenever photo or container layout changes
  useEffect(() => {
    if (renderedMeta.renderedWidth <= 0 || renderedMeta.renderedHeight <= 0) {
      return;
    }

    onCropMetaReady?.(renderedMeta);

    const rw = renderedMeta.renderedWidth;
    const rh = renderedMeta.renderedHeight;
    const ox = renderedMeta.offsetX;
    const oy = renderedMeta.offsetY;

    const minW = Math.min(MIN_CROP_WIDTH, rw);
    const minH = Math.min(MIN_CROP_HEIGHT, rh);

    let initW;
    let initH;
    let initX;
    let initY;

    if (
      initialCropNormalized &&
      initialCropNormalized.width >= 0.15 &&
      initialCropNormalized.height >= 0.08
    ) {
      // Auto-enquadramento inteligente detectado ao redor da etiqueta
      initW = clamp(rw * initialCropNormalized.width, minW, rw);
      initH = clamp(rh * initialCropNormalized.height, minH, rh);
      initX = ox + clamp(rw * initialCropNormalized.x, 0, rw - initW);
      initY = oy + clamp(rh * initialCropNormalized.y, 0, rh - initH);
    } else if (mode === 'partial') {
      // Horizontal central strip over shelf tag
      initW = clamp(rw * (1 - PARTIAL_SIDE_MARGIN_RATIO * 2), minW, rw);
      initH = clamp(rh * PARTIAL_HEIGHT_RATIO, minH, rh);
      initX = ox + (rw - initW) / 2;
      initY = oy + clamp(rh * PARTIAL_TOP_RATIO, 0, rh - initH);
    } else {
      // Full frame crop with comfortable margin
      initW = clamp(rw * 0.9, minW, rw);
      initH = clamp(rh * 0.8, minH, rh);
      initX = ox + (rw - initW) / 2;
      initY = oy + (rh - initH) / 2;
    }

    const initialBox = {
      x: initX,
      y: initY,
      width: initW,
      height: initH,
    };

    cropBoxRef.current = initialBox;
    startCropRef.current = initialBox;
    setCropBox(initialBox);
    onCropBoxChangeRef.current?.(initialBox);
  }, [
    renderedMeta.renderedWidth,
    renderedMeta.renderedHeight,
    renderedMeta.offsetX,
    renderedMeta.offsetY,
    photo?.uri,
    mode,
    initialCropNormalized,
  ]);

  // 2. PanResponders using startCropRef.current + gestureState.dx / dy (never accumulating on state)
  const responders = useMemo(() => {
    const makeResponder = (actionType) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startCropRef.current = { ...cropBoxRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const meta = renderedMetaRef.current;
          if (meta.renderedWidth <= 0 || meta.renderedHeight <= 0) return;

          const start = startCropRef.current;
          const { dx, dy } = gestureState;

          const minX = meta.offsetX;
          const maxX = meta.offsetX + meta.renderedWidth;
          const minY = meta.offsetY;
          const maxY = meta.offsetY + meta.renderedHeight;
          const minW = Math.min(MIN_CROP_WIDTH, meta.renderedWidth);
          const minH = Math.min(MIN_CROP_HEIGHT, meta.renderedHeight);

          let { x, y, width, height } = start;

          if (actionType === 'move') {
            x = clamp(start.x + dx, minX, maxX - start.width);
            y = clamp(start.y + dy, minY, maxY - start.height);
          } else if (actionType === 'tl') {
            const fixedRight = start.x + start.width;
            const fixedBottom = start.y + start.height;
            x = clamp(start.x + dx, minX, fixedRight - minW);
            y = clamp(start.y + dy, minY, fixedBottom - minH);
            width = fixedRight - x;
            height = fixedBottom - y;
          } else if (actionType === 'tr') {
            const fixedLeft = start.x;
            const fixedBottom = start.y + start.height;
            x = fixedLeft;
            y = clamp(start.y + dy, minY, fixedBottom - minH);
            width = clamp(start.width + dx, minW, maxX - fixedLeft);
            height = fixedBottom - y;
          } else if (actionType === 'bl') {
            const fixedRight = start.x + start.width;
            const fixedTop = start.y;
            x = clamp(start.x + dx, minX, fixedRight - minW);
            y = fixedTop;
            width = fixedRight - x;
            height = clamp(start.height + dy, minH, maxY - fixedTop);
          } else if (actionType === 'br') {
            const fixedLeft = start.x;
            const fixedTop = start.y;
            x = fixedLeft;
            y = fixedTop;
            width = clamp(start.width + dx, minW, maxX - fixedLeft);
            height = clamp(start.height + dy, minH, maxY - fixedTop);
          } else if (actionType === 'top') {
            const fixedBottom = start.y + start.height;
            y = clamp(start.y + dy, minY, fixedBottom - minH);
            height = fixedBottom - y;
          } else if (actionType === 'bottom') {
            height = clamp(start.height + dy, minH, maxY - start.y);
          } else if (actionType === 'left') {
            const fixedRight = start.x + start.width;
            x = clamp(start.x + dx, minX, fixedRight - minW);
            width = fixedRight - x;
          } else if (actionType === 'right') {
            width = clamp(start.width + dx, minW, maxX - start.x);
          }

          const nextBox = { x, y, width, height };
          cropBoxRef.current = nextBox;
          setCropBox(nextBox);
          onCropBoxChangeRef.current?.(nextBox);
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
  }, []);

  const hasLayout =
    renderedMeta.renderedWidth > 0 &&
    renderedMeta.renderedHeight > 0 &&
    cropBox.width > 0 &&
    cropBox.height > 0;

  const halfCorner = CORNER_HIT_SIZE / 2;
  const halfEdge = EDGE_HIT_SIZE / 2;

  return (
    <View
      style={styles.cropPreviewWrapper}
      collapsable={false}
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
      {hasLayout ? (
        <>
          {/* Render image contained exactly within renderedRect */}
          <Image
            source={{ uri: photo.uri }}
            style={{
              position: 'absolute',
              left: renderedMeta.offsetX,
              top: renderedMeta.offsetY,
              width: renderedMeta.renderedWidth,
              height: renderedMeta.renderedHeight,
            }}
            resizeMode="contain"
            onLoad={(e) => {
              const src = e?.nativeEvent?.source;
              if (src?.width > 0 && src?.height > 0) {
                setNaturalSize((prev) =>
                  prev.width === src.width && prev.height === src.height
                    ? prev
                    : { width: src.width, height: src.height }
                );
              }
            }}
          />

          {/* Dark masks outside crop box */}
          <View
            pointerEvents="none"
            style={[
              styles.cropOutsideMask,
              { top: 0, left: 0, right: 0, height: cropBox.y },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.cropOutsideMask,
              {
                top: cropBox.y + cropBox.height,
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
                top: cropBox.y,
                left: 0,
                width: cropBox.x,
                height: cropBox.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.cropOutsideMask,
              {
                top: cropBox.y,
                left: cropBox.x + cropBox.width,
                right: 0,
                height: cropBox.height,
              },
            ]}
          />

          {/* Center Draggable Crop Box */}
          <View
            collapsable={false}
            style={[
              styles.cropSelectionBox,
              {
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height,
              },
            ]}
            {...responders.move.panHandlers}
          >
            {/* Rule of thirds guide lines */}
            <View pointerEvents="none" style={[styles.gridLineH, { top: '33.33%' }]} />
            <View pointerEvents="none" style={[styles.gridLineH, { top: '66.66%' }]} />
            <View pointerEvents="none" style={[styles.gridLineV, { left: '33.33%' }]} />
            <View pointerEvents="none" style={[styles.gridLineV, { left: '66.66%' }]} />
          </View>

          {/* Draggable Edges rendered as direct children of full-screen wrapper so Android never clips touches */}
          <View
            collapsable={false}
            style={[
              styles.edgeHitH,
              {
                left: cropBox.x + halfCorner,
                top: cropBox.y - halfEdge,
                width: Math.max(0, cropBox.width - CORNER_HIT_SIZE),
                height: EDGE_HIT_SIZE,
              },
            ]}
            {...responders.top.panHandlers}
          >
            <View style={styles.edgePillH} />
          </View>

          <View
            collapsable={false}
            style={[
              styles.edgeHitH,
              {
                left: cropBox.x + halfCorner,
                top: cropBox.y + cropBox.height - halfEdge,
                width: Math.max(0, cropBox.width - CORNER_HIT_SIZE),
                height: EDGE_HIT_SIZE,
              },
            ]}
            {...responders.bottom.panHandlers}
          >
            <View style={styles.edgePillH} />
          </View>

          <View
            collapsable={false}
            style={[
              styles.edgeHitV,
              {
                left: cropBox.x - halfEdge,
                top: cropBox.y + halfCorner,
                width: EDGE_HIT_SIZE,
                height: Math.max(0, cropBox.height - CORNER_HIT_SIZE),
              },
            ]}
            {...responders.left.panHandlers}
          >
            <View style={styles.edgePillV} />
          </View>

          <View
            collapsable={false}
            style={[
              styles.edgeHitV,
              {
                left: cropBox.x + cropBox.width - halfEdge,
                top: cropBox.y + halfCorner,
                width: EDGE_HIT_SIZE,
                height: Math.max(0, cropBox.height - CORNER_HIT_SIZE),
              },
            ]}
            {...responders.right.panHandlers}
          >
            <View style={styles.edgePillV} />
          </View>

          {/* 4 Draggable Corners rendered as direct children of full-screen wrapper (48x48 touch area >= 44x44) */}
          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.cornerHit,
              {
                left: cropBox.x - halfCorner,
                top: cropBox.y - halfCorner,
              },
            ]}
            {...responders.tl.panHandlers}
          >
            <View style={[styles.cropCornerVisual, styles.cropCornerTL]} />
            <View style={styles.cropCornerDot} />
          </View>

          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.cornerHit,
              {
                left: cropBox.x + cropBox.width - halfCorner,
                top: cropBox.y - halfCorner,
              },
            ]}
            {...responders.tr.panHandlers}
          >
            <View style={[styles.cropCornerVisual, styles.cropCornerTR]} />
            <View style={styles.cropCornerDot} />
          </View>

          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.cornerHit,
              {
                left: cropBox.x - halfCorner,
                top: cropBox.y + cropBox.height - halfCorner,
              },
            ]}
            {...responders.bl.panHandlers}
          >
            <View style={[styles.cropCornerVisual, styles.cropCornerBL]} />
            <View style={styles.cropCornerDot} />
          </View>

          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.cornerHit,
              {
                left: cropBox.x + cropBox.width - halfCorner,
                top: cropBox.y + cropBox.height - halfCorner,
              },
            ]}
            {...responders.br.panHandlers}
          >
            <View style={[styles.cropCornerVisual, styles.cropCornerBR]} />
            <View style={styles.cropCornerDot} />
          </View>
        </>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      )}
    </View>
  );
}

export const normalizeAndCropImage = async (rawAsset, applyPartialBand = false) => {
  const actions = [];
  let w = Number(rawAsset.width) || 0;
  let h = Number(rawAsset.height) || 0;

  if (applyPartialBand && w > 0 && h > 0) {
    const originX = Math.max(0, Math.round(w * PARTIAL_SIDE_MARGIN_RATIO));
    const originY = Math.max(0, Math.round(h * PARTIAL_TOP_RATIO));
    const cropW = Math.max(
      MIN_CROP_WIDTH,
      Math.min(w - originX, Math.round(w * (1 - PARTIAL_SIDE_MARGIN_RATIO * 2)))
    );
    const cropH = Math.max(
      MIN_CROP_HEIGHT,
      Math.min(h - originY, Math.round(h * PARTIAL_HEIGHT_RATIO))
    );
    actions.push({
      crop: { originX, originY, width: cropW, height: cropH },
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
  const { colors, cameraSoundEnabled } = useAppSettings();
  const insets = useSafeAreaInsets();

  // Safe top padding so Android status bar never clips the header
  const safeTopPadding =
    Math.max(
      insets.top,
      Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12,
      12
    ) + 8;
  const safeBottomPadding = Math.max(insets.bottom, 14);

  const [permission, requestPermission] = useCameraPermissions();

  // stage: 'camera' | 'preview' | 'crop'
  const [stage, setStage] = useState('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [autoCropBounds, setAutoCropBounds] = useState(null);
  const [lockedBarcode, setLockedBarcode] = useState(null);
  const [liveBarcodeIsScale, setLiveBarcodeIsScale] = useState(false);
  const [capturedBarcode, setCapturedBarcode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const cameraRef = useRef(null);
  const cropMetaRef = useRef(null);
  const currentCropBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const lockedBarcodeRef = useRef(null);
  const capturedBarcodeRef = useRef('');

  const resetLockedBarcode = useCallback(() => {
    lockedBarcodeRef.current = null;
    setLockedBarcode(null);
    setLiveBarcodeIsScale(false);
  }, []);

  const setupPhoto = useCallback((photo, scannedCode = '', detectedBounds = null) => {
    capturedBarcodeRef.current = scannedCode || '';
    setCapturedBarcode(scannedCode || '');
    setAutoCropBounds(detectedBounds || null);
    setCapturedPhoto(photo);
    setErrorMsg('');
    setStage('crop');
  }, []);

  const openLiveCamera = useCallback(() => {
    setCapturedPhoto(null);
    setAutoCropBounds(null);
    capturedBarcodeRef.current = '';
    setCapturedBarcode('');
    resetLockedBarcode();
    setErrorMsg('');
    setStage('camera');
  }, [resetLockedBarcode]);

  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setIsCapturing(false);
      setTorchEnabled(false);
      setErrorMsg('');
      resetLockedBarcode();
      if (initialPhoto) {
        setupPhoto(initialPhoto, '');
      } else {
        openLiveCamera();
        if (permission && !permission.granted && permission.canAskAgain) {
          requestPermission().catch(() => {});
        }
      }
    } else {
      setCapturedPhoto(null);
      setTorchEnabled(false);
      capturedBarcodeRef.current = '';
      setCapturedBarcode('');
      resetLockedBarcode();
    }
  }, [visible, initialPhoto]);

  const handleBarcodeScanned = useCallback(({ data }) => {
    // Mantém o código já travado imutável até a foto ser capturada ou o usuário tocar em "Recomeçar"
    if (lockedBarcodeRef.current) {
      return;
    }

    const digits = String(data || '').replace(/\D/g, '');
    if (digits.length !== 8 && digits.length !== 13) {
      return;
    }

    // Códigos de balança começam com '2': ignoramos para consulta EAN comercial
    if (digits.startsWith('2')) {
      setLiveBarcodeIsScale(true);
      return;
    }

    // Rejeita leituras parciais ou corrompidas que não passam no dígito verificador GS1
    if (!isValidGs1BarcodeChecksum(digits)) {
      return;
    }

    lockedBarcodeRef.current = digits;
    setLiveBarcodeIsScale(false);
    setLockedBarcode(digits);
  }, []);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing || isProcessing) return;
    setIsCapturing(true);
    setErrorMsg('');
    try {
      const scannedCode = lockedBarcodeRef.current || '';

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
        shutterSound: cameraSoundEnabled,
      });

      if (!photo?.uri) {
        setErrorMsg('Não foi possível capturar a foto. Tente novamente.');
        return;
      }

      let photoW = Number(photo.width) || 0;
      let photoH = Number(photo.height) || 0;
      if (!photoW || !photoH) {
        await new Promise((resolve) => {
          Image.getSize(
            photo.uri,
            (w, h) => {
              photoW = w;
              photoH = h;
              resolve();
            },
            () => resolve()
          );
        });
      }

      const detectedBounds = await detectShelfTagCropBounds(photo.uri).catch(
        () => null
      );

      setTorchEnabled(false);
      resetLockedBarcode();
      setupPhoto(
        {
          uri: photo.uri,
          width: photoW || 1200,
          height: photoH || 1600,
        },
        scannedCode,
        detectedBounds
      );
    } catch (err) {
      const msg = err?.message || String(err);
      setErrorMsg(`Erro ao capturar foto: ${msg}`);
      recordAppErrorLog({
        scope: 'Câmera',
        message: `Erro ao capturar foto: ${msg}`,
        stack: err?.stack || '',
      }).catch(() => {});
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLaunchNativeCamera = async () => {
    openLiveCamera();
    if (permission && !permission.granted) {
      await requestPermission().catch(() => {});
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

      const asset = result.assets[0];
      let photoW = Number(asset.width) || 0;
      let photoH = Number(asset.height) || 0;

      if (!photoW || !photoH) {
        await new Promise((resolve) => {
          Image.getSize(
            asset.uri,
            (w, h) => {
              photoW = w;
              photoH = h;
              resolve();
            },
            () => resolve()
          );
        });
      }

      setupPhoto({
        uri: asset.uri,
        width: photoW || 1200,
        height: photoH || 1600,
      });
    } catch (err) {
      const msg = err?.message || String(err);
      if (!/cancel/i.test(msg)) {
        setErrorMsg(`Erro ao abrir galeria: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto?.uri || isProcessing) return;
    setIsProcessing(true);
    try {
      let finalBase64 = capturedPhoto.base64;
      let finalUri = capturedPhoto.uri;

      if (!finalBase64) {
        const manip = await ImageManipulator.manipulateAsync(
          capturedPhoto.uri,
          capturedPhoto.width > 1280 ? [{ resize: { width: 1280 } }] : [],
          {
            compress: 0.92,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        finalBase64 = manip.base64;
        finalUri = manip.uri;
      }

      onConfirmImage({
        uri: finalUri,
        base64: finalBase64,
        barcode: capturedBarcodeRef.current || '',
      });
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setErrorMsg('Não foi possível utilizar esta imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Exact screen coordinate conversion to real image pixels
  const handleApplyCrop = async () => {
    if (!capturedPhoto?.uri || isProcessing) return;
    const meta = cropMetaRef.current;
    const box = currentCropBoxRef.current;

    if (!meta || !box || box.width <= 0 || box.height <= 0 || meta.scale <= 0) {
      await handleUsePhoto();
      return;
    }

    setIsProcessing(true);
    try {
      const { scale, offsetX, offsetY, naturalWidth, naturalHeight } = meta;

      const rawOriginX = clamp(
        Math.round((box.x - offsetX) / scale),
        0,
        Math.max(0, naturalWidth - 1)
      );
      const rawOriginY = clamp(
        Math.round((box.y - offsetY) / scale),
        0,
        Math.max(0, naturalHeight - 1)
      );
      const width = clamp(
        Math.round(box.width / scale),
        1,
        Math.max(1, naturalWidth - rawOriginX)
      );
      const rawHeight = clamp(
        Math.round(box.height / scale),
        1,
        Math.max(1, naturalHeight - rawOriginY)
      );

      // Expande +12% na margem superior (limitada à imagem) para nunca cortar títulos no topo da etiqueta
      const extraTop = Math.round(rawHeight * 0.12);
      const originX = rawOriginX;
      const originY = Math.max(0, rawOriginY - extraTop);
      const height = clamp(
        rawHeight + (rawOriginY - originY),
        1,
        Math.max(1, naturalHeight - originY)
      );

      const actions = [{ crop: { originX, originY, width, height } }];
      // Normaliza largura entre 1000px e 1200px para preservar nitidez de centavos sobrescritos e fontes pequenas
      if (width > 1200) {
        actions.push({ resize: { width: 1200 } });
      } else if (width < 1000) {
        actions.push({ resize: { width: 1100 } });
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        capturedPhoto.uri,
        actions,
        {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      onConfirmImage({
        uri: manipulated.uri,
        base64: manipulated.base64,
        barcode: capturedBarcodeRef.current || '',
      });
    } catch (err) {
      console.error('Erro ao recortar imagem:', err);
      setErrorMsg('Não foi possível aplicar o recorte.');
      recordAppErrorLog({
        scope: 'Recorte de Etiqueta',
        message: err?.message || String(err || 'Falha ao recortar imagem'),
        stack: err?.stack || '',
      }).catch(() => {});
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header with Safe Area inset so Android status bar never cuts it off */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.primary,
              paddingTop: safeTopPadding,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            accessibilityLabel="Fechar"
          >
            <FontAwesome6 name="xmark" size={18} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Fechar</Text>
          </TouchableOpacity>

          <Text style={styles.stageTitle} numberOfLines={1}>
            {stage === 'camera' ? 'Capturar Etiqueta' : 'Recortar Etiqueta'}
          </Text>

          <View style={styles.headerRightActions}>
            {stage !== 'camera' ? (
              <TouchableOpacity
                onPress={handleLaunchNativeCamera}
                style={[styles.headerBtn, { marginRight: 4 }]}
                accessibilityLabel="Tirar outra foto"
              >
                <FontAwesome6 name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handlePickFromGallery}
              style={styles.headerBtn}
              accessibilityLabel="Escolher da Galeria"
            >
              <FontAwesome6 name="images" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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

        {/* STAGE 0: LIVE CAMERA WITH NATIVE BARCODE SCANNER (expo-camera) */}
        {stage === 'camera' ? (
          <View style={styles.cameraStage}>
            {!permission ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.cameraHintText}>
                  Preparando câmera...
                </Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <FontAwesome6 name="camera" size={38} color="#22C55E" />
                <Text style={styles.permissionTitle}>
                  Permissão de câmera necessária
                </Text>
                <Text style={styles.permissionDesc}>
                  Autorize o acesso à câmera para fotografar etiquetas e ler códigos de barras automaticamente.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.permissionBtn,
                    { backgroundColor: colors.principal },
                  ]}
                  onPress={() => requestPermission()}
                >
                  <Text style={styles.permissionBtnText}>Permitir Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.permissionSecondaryBtn}
                  onPress={handlePickFromGallery}
                >
                  <Text style={styles.permissionSecondaryText}>
                    Escolher da Galeria
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.cameraPreviewWrap}>
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    mute={!cameraSoundEnabled}
                    enableTorch={torchEnabled}
                    barcodeScannerSettings={{
                      barcodeTypes: BARCODE_TYPES,
                    }}
                    onBarcodeScanned={
                      lockedBarcode ? undefined : handleBarcodeScanned
                    }
                  />

                  <View
                    style={[StyleSheet.absoluteFill, styles.cameraOverlay]}
                    pointerEvents="box-none"
                  >
                    <View style={styles.cameraGuideFrame} pointerEvents="none">
                      <View style={[styles.guideCorner, styles.guideCornerTL]} />
                      <View style={[styles.guideCorner, styles.guideCornerTR]} />
                      <View style={[styles.guideCorner, styles.guideCornerBL]} />
                      <View style={[styles.guideCorner, styles.guideCornerBR]} />
                    </View>

                    <View
                      style={styles.barcodeStatusContainer}
                      pointerEvents="box-none"
                    >
                      {lockedBarcode ? (
                        <View style={styles.lockedBarcodePill}>
                          <View style={styles.lockedBarcodeInfo}>
                            <FontAwesome6
                              name="barcode"
                              size={14}
                              color="#FFFFFF"
                            />
                            <Text
                              style={styles.liveBarcodeText}
                              numberOfLines={1}
                            >
                              Código lido: {lockedBarcode}
                            </Text>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={resetLockedBarcode}
                            style={styles.resetBarcodeBtn}
                            accessibilityLabel="Recomeçar leitura do código de barras"
                          >
                            <FontAwesome6
                              name="rotate-left"
                              size={11}
                              color="#FFFFFF"
                            />
                            <Text style={styles.resetBarcodeBtnText}>
                              Recomeçar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : liveBarcodeIsScale ? (
                        <View style={styles.liveScaleBadge} pointerEvents="none">
                          <FontAwesome6
                            name="scale-balanced"
                            size={13}
                            color="#FEF08A"
                          />
                          <Text style={styles.liveScaleText}>
                            Etiqueta de balança — fotografe para ler o texto
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={styles.cameraFrameHint}
                          pointerEvents="none"
                        >
                          Aponte para o código de barras ou fotografe a etiqueta
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.cameraControlsBar,
                    { paddingBottom: safeBottomPadding + 6 },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cameraSideBtn}
                    onPress={handlePickFromGallery}
                    accessibilityLabel="Escolher foto da galeria"
                  >
                    <FontAwesome6 name="images" size={20} color="#FFFFFF" />
                    <Text style={styles.cameraSideBtnLabel}>Galeria</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.shutterOuter,
                      isCapturing && { opacity: 0.65 },
                    ]}
                    disabled={isCapturing}
                    onPress={handleTakePhoto}
                    accessibilityLabel="Capturar foto da etiqueta"
                  >
                    {isCapturing ? (
                      <ActivityIndicator size="small" color={colors.principal} />
                    ) : (
                      <View
                        style={[
                          styles.shutterInner,
                          { backgroundColor: colors.principal },
                        ]}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cameraSideBtn}
                    onPress={() => setTorchEnabled((prev) => !prev)}
                    accessibilityLabel={
                      torchEnabled ? 'Desligar lanterna' : 'Ligar lanterna'
                    }
                  >
                    <FontAwesome6
                      name="bolt"
                      size={20}
                      color={torchEnabled ? '#FACC15' : '#FFFFFF'}
                    />
                    <Text
                      style={[
                        styles.cameraSideBtnLabel,
                        torchEnabled && { color: '#FACC15' },
                      ]}
                    >
                      {torchEnabled ? 'Flash On' : 'Flash'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : null}

        {/* STAGE 1: FULL PHOTO PREVIEW (Com botões 'Usar Foto' e 'Recortar Foto') */}
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
                  paddingBottom: safeBottomPadding,
                },
              ]}
            >
              <Text
                style={[styles.previewPrompt, { color: colors.textoEscuro }]}
              >
                Foto capturada! Deseja usar o quadro completo ou recortar a etiqueta?
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
                  disabled={isProcessing}
                  onPress={handleUsePhoto}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.usePhotoBtnText}>Usar Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.retakeLink}
                onPress={handleLaunchNativeCamera}
              >
                <FontAwesome6
                  name="rotate-left"
                  size={13}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.retakeLinkText, { color: colors.textMuted }]}
                >
                  Tirar outra foto na câmera nativa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STAGE 2: INTERACTIVE DRAG-TO-CROP */}
        {stage === 'crop' && capturedPhoto ? (
          <View
            style={[
              styles.previewStage,
              { backgroundColor: colors.background },
            ]}
          >
            <InteractiveCropCanvas
              photo={capturedPhoto}
              mode="partial"
              initialCropNormalized={autoCropBounds}
              onCropMetaReady={(meta) => {
                cropMetaRef.current = meta;
              }}
              onCropBoxChange={(box) => {
                currentCropBoxRef.current = box;
              }}
            />

            <View
              style={[
                styles.cropControlsPanel,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.borderColor,
                  paddingBottom: safeBottomPadding,
                },
              ]}
            >
              {capturedBarcode ? (
                <View
                  style={[
                    styles.capturedBarcodePill,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderColor: colors.principal,
                    },
                  ]}
                >
                  <FontAwesome6
                    name="barcode"
                    size={13}
                    color={colors.principal}
                  />
                  <Text
                    style={[
                      styles.capturedBarcodePillText,
                      { color: colors.principal },
                    ]}
                  >
                    Código EAN capturado: {capturedBarcode}
                  </Text>
                </View>
              ) : null}

              <Text
                style={[styles.cropPanelTitle, { color: colors.textoEscuro }]}
              >
                Arraste os cantos ou bordas para ajustar a etiqueta
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
                  onPress={onClose}
                >
                  <Text
                    style={[
                      styles.optionalCropBtnText,
                      { color: colors.textoEscuro, marginLeft: 0 },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.usePhotoBtn,
                    { backgroundColor: colors.principal },
                  ]}
                  disabled={isProcessing}
                  onPress={handleApplyCrop}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome6 name="crop" size={15} color="#FFFFFF" />
                      <Text style={styles.usePhotoBtnText}>
                        Confirmar Recorte
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.retakeLink}
                onPress={handleLaunchNativeCamera}
              >
                <FontAwesome6
                  name="rotate-left"
                  size={13}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.retakeLinkText, { color: colors.textMuted }]}
                >
                  Tirar outra foto na câmera nativa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Fallback state when loading photo */}
        {stage !== 'camera' && !capturedPhoto ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.cameraHintText}>
              Preparando imagem...
            </Text>
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
    paddingBottom: 12,
  },
  stageTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    paddingHorizontal: 18,
    paddingTop: 16,
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
    paddingHorizontal: 16,
    paddingTop: 14,
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
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  cropSelectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 5,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 15,
  },
  edgeHitV: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 15,
  },
  edgePillH: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
  edgePillV: {
    width: 5,
    height: 36,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
  cornerHit: {
    position: 'absolute',
    width: CORNER_HIT_SIZE,
    height: CORNER_HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 25,
  },
  cropCornerVisual: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cropCornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cropCornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cropCornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cropCornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  cropCornerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraStage: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraPreviewWrap: {
    flex: 1,
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraGuideFrame: {
    width: '90%',
    height: '38%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#22C55E',
  },
  guideCornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  guideCornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  guideCornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  guideCornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  barcodeStatusContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 16,
    alignItems: 'center',
  },
  lockedBarcodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(21, 128, 61, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  lockedBarcodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 10,
  },
  resetBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resetBarcodeBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 5,
  },
  liveBarcodeBadge: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  liveBarcodeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },
  liveScaleBadge: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  liveScaleText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 7,
  },
  cameraFrameHint: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cameraHintText: {
    color: '#FFFFFF',
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  cameraSideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingVertical: 8,
  },
  cameraSideBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },
  permissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  permissionSecondaryBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },
  permissionSecondaryText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  capturedBarcodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  capturedBarcodePillText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});
