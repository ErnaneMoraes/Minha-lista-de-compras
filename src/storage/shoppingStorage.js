import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isValidThemeId,
  getThemeById,
  THEME_IDS,
  DEFAULT_CUSTOM_THEME_CONFIG,
} from '../theme/themes';
import {
  RETENTION_DAY_OPTIONS,
  DEFAULT_RETENTION_DAYS,
  deleteTagPhotoFile,
  deleteMultipleTagPhotoFiles,
  deleteAllTagPhotos,
  findAndDeleteExpiredTagPhotos,
  exportTagPhotosAsBase64Map,
  restoreTagPhotosFromBase64Map,
} from '../services/tagPhotoStorage';
import {
  LEARNED_CATEGORIES_KEY,
  STANDARD_CATEGORIES,
  normalizeCategoryName,
  getCategoryMeta,
  inferCategorySmart,
  learnCategoryAssociation,
  loadLearnedCategories,
} from '../utils/categoryDictionary';

const STORAGE_KEYS = {
  LISTS: '@mlc_offline:lists',
  HISTORY: '@mlc_offline:history',
  REMINDERS: '@mlc_offline:reminders',
  SETTINGS: '@mlc_offline:settings',
  ONBOARDING_COMPLETED: '@mlc_offline:onboarding_completed',
  CUSTOM_THEME: '@mlc_offline:custom_theme',
};

export async function loadCustomThemeConfig() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_THEME);
    if (!raw) return { ...DEFAULT_CUSTOM_THEME_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CUSTOM_THEME_CONFIG,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_CUSTOM_THEME_CONFIG };
  }
}

export async function saveCustomThemeConfig(partial) {
  const current = await loadCustomThemeConfig();
  const next = {
    ...current,
    ...(partial && typeof partial === 'object' ? partial : {}),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_THEME, JSON.stringify(next));
  return next;
}

export async function loadOnboardingCompleted() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function saveOnboardingCompleted(completed = true) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ONBOARDING_COMPLETED,
      completed ? 'true' : 'false'
    );
  } catch {
    // ignore storage write errors
  }
}

export const DEFAULT_SETTINGS = {
  themeId: THEME_IDS.LIGHT,
  darkMode: false,
  cameraCaptureMode: 'partial', // fixed default: partial capture
  cameraSource: 'native',
  cameraSoundEnabled: true,
  saveTagPhotos: true,
  autoDeleteTagPhotos: false,
  tagPhotoRetentionDays: DEFAULT_RETENTION_DAYS,
};

export const CATEGORIES = STANDARD_CATEGORIES;

export {
  normalizeCategoryName,
  getCategoryMeta,
  inferCategorySmart,
  learnCategoryAssociation,
  loadLearnedCategories,
};

export const UNITS = ['un', 'kg', 'pct', 'g', 'L', 'ml', 'cx', 'dz'];

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateBR(value) {
  if (value === null || value === undefined || value === '') {
    return '--/--/----';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnly) {
      return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--/--/----';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatListDateLabel(list) {
  const formatted = formatDateBR(list?.createdAt);
  return list?.dataEditada
    ? `Referência: ${formatted}`
    : `Criada em ${formatted}`;
}

export function formatMonthYearBR(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { key: '0000-00', label: 'Sem data' };
  }
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const label = `${MONTH_NAMES_PT[monthIndex]} de ${year}`;
  return { key, label };
}

export function formatCurrency(value) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const sign = safe < 0 ? '-' : '';
  const fixed = Math.abs(safe).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${withThousands},${decPart}`;
}

export function maskBRLInput(rawText) {
  const digits = String(rawText || '').replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents === 0) return '';
  return formatCurrency(cents / 100);
}

export function parseBRLInput(maskedText) {
  if (typeof maskedText === 'number') {
    return Number.isFinite(maskedText) && maskedText > 0 ? maskedText : 0;
  }
  const digits = String(maskedText || '').replace(/\D/g, '');
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  return Number.isFinite(cents) && cents > 0 ? cents / 100 : 0;
}

export function numberToBRLMask(num) {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) return '';
  return formatCurrency(n);
}

export function parseDecimal(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  if (!value) return 0;
  const normalized = String(value).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function calculateListStats(list) {
  const items = Array.isArray(list?.items) ? list.items : [];
  let checkedItems = 0;
  let totalQuantity = 0;
  let estimatedTotal = 0;
  let checkedTotal = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity ?? item.quantidade ?? 1) || 0);
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
    const subtotal = qty * unitPrice;
    totalQuantity += qty;
    estimatedTotal += subtotal;
    if (item.checked) {
      checkedItems += 1;
      checkedTotal += subtotal;
    }
  }

  estimatedTotal = Math.round(estimatedTotal * 100) / 100;
  checkedTotal = Math.round(checkedTotal * 100) / 100;

  const budget = Math.max(0, Number(list?.budget) || 0);
  const budgetRatio = budget > 0 ? estimatedTotal / budget : 0;
  let budgetStatus = 'none';
  if (budget > 0) {
    if (budgetRatio >= 1) {
      budgetStatus = 'exceeded';
    } else if (budgetRatio >= 0.8) {
      budgetStatus = 'warning';
    } else {
      budgetStatus = 'normal';
    }
  }

  return {
    totalItems: items.length,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    checkedItems,
    pendingItems: items.length - checkedItems,
    estimatedTotal,
    checkedTotal,
    budget,
    budgetRatio,
    budgetStatus,
    budgetDiff: budget > 0 ? Math.round((budget - estimatedTotal) * 100) / 100 : 0,
  };
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const resolvedThemeId = isValidThemeId(parsed?.themeId)
      ? parsed.themeId
      : parsed?.darkMode
        ? THEME_IDS.DARK
        : THEME_IDS.LIGHT;
    const theme = getThemeById(resolvedThemeId);
    const rawDays = Number(parsed?.tagPhotoRetentionDays);
    const validDays = RETENTION_DAY_OPTIONS.includes(rawDays)
      ? rawDays
      : DEFAULT_RETENTION_DAYS;
    return {
      themeId: resolvedThemeId,
      darkMode: theme.isDark,
      cameraCaptureMode: 'partial',
      cameraSource:
        parsed?.cameraSource === 'inapp' ? 'inapp' : 'native',
      saveTagPhotos:
        parsed?.saveTagPhotos !== undefined
          ? Boolean(parsed.saveTagPhotos)
          : DEFAULT_SETTINGS.saveTagPhotos,
      autoDeleteTagPhotos: Boolean(parsed?.autoDeleteTagPhotos),
      tagPhotoRetentionDays: validDays,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = {
    ...current,
    ...partial,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
  return next;
}

export async function loadLists() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.LISTS);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((list) => ({
      ...list,
      importedReminderIds: Array.isArray(list?.importedReminderIds)
        ? list.importedReminderIds
        : [],
      items: Array.isArray(list?.items)
        ? list.items.map((item) => ({
            ...item,
            category: normalizeCategoryName(item?.category),
          }))
        : [],
    }));
  } catch {
    return [];
  }
}

export async function saveLists(lists) {
  await AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
  return lists;
}

export async function getListById(listId) {
  const lists = await loadLists();
  return lists.find((list) => list.id === listId) || null;
}

export async function getLatestOpenList() {
  const lists = await loadLists();
  const openLists = lists.filter((list) => !list.completed);
  if (openLists.length === 0) return null;
  return openLists[0];
}

export async function createList(nameOrPayload, maybeBudget = 0, maybeCreatedAt = null) {
  const rawName =
    typeof nameOrPayload === 'object' ? nameOrPayload?.name : nameOrPayload;
  const rawBudget =
    typeof nameOrPayload === 'object' ? nameOrPayload?.budget : maybeBudget;
  const rawCreatedAt =
    typeof nameOrPayload === 'object' ? nameOrPayload?.createdAt : maybeCreatedAt;
  const trimmed = String(rawName || '').trim();
  if (!trimmed) return null;
  const budget = Math.max(0, Number(rawBudget) || 0);
  const createdAt =
    rawCreatedAt && !Number.isNaN(new Date(rawCreatedAt).getTime())
      ? new Date(rawCreatedAt).toISOString()
      : new Date().toISOString();

  const lists = await loadLists();
  const newList = {
    id: generateId(),
    name: trimmed,
    budget,
    completed: false,
    completedAt: null,
    createdAt,
    dataEditada: false,
    importedReminderIds: [],
    items: [],
  };
  const updated = [newList, ...lists];
  await saveLists(updated);
  return newList;
}

export async function updateListDetails(listId, updates) {
  const lists = await loadLists();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    const nextName =
      updates?.name !== undefined
        ? String(updates.name).trim() || list.name
        : list.name;
    const nextBudget =
      updates?.budget !== undefined
        ? Math.max(0, Number(updates.budget) || 0)
        : Math.max(0, Number(list.budget) || 0);
    const hasNewValidDate =
      updates?.createdAt && !Number.isNaN(new Date(updates.createdAt).getTime());
    const nextCreatedAt = hasNewValidDate
      ? new Date(updates.createdAt).toISOString()
      : list.createdAt;
    const dateChanged =
      hasNewValidDate && formatDateBR(nextCreatedAt) !== formatDateBR(list.createdAt);
    const nextDataEditada =
      Boolean(list.dataEditada) || Boolean(updates?.dataEditada) || dateChanged;
    return {
      ...list,
      name: nextName,
      budget: nextBudget,
      createdAt: nextCreatedAt,
      dataEditada: nextDataEditada,
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function finalizeList(listId) {
  const lists = await loadLists();
  const target = lists.find((l) => l.id === listId);
  if (!target) return null;

  const completedAt = new Date().toISOString();
  const updatedLists = lists.map((list) =>
    list.id === listId
      ? { ...list, completed: true, completedAt }
      : list
  );
  await saveLists(updatedLists);

  const items = Array.isArray(target.items) ? target.items : [];
  if (items.length > 0) {
    let total = 0;
    const byCategory = {};
    for (const item of items) {
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
      const sub = (Number(item.quantity) || 0) * unitPrice;
      total += sub;
      const cat = normalizeCategoryName(item.category);
      byCategory[cat] = (byCategory[cat] || 0) + sub;
    }
    const history = await loadHistory();
    const filteredHistory = history.filter((h) => h.listId !== listId);
    const tripRecord = {
      id: generateId(),
      listId: target.id,
      listName: target.name,
      date: target.createdAt || completedAt,
      itemCount: items.length,
      total,
      byCategory,
    };
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify([tripRecord, ...filteredHistory])
    );
  }

  return updatedLists.find((list) => list.id === listId) || null;
}

export async function reopenList(listId) {
  const lists = await loadLists();
  const updated = lists.map((list) =>
    list.id === listId
      ? { ...list, completed: false, completedAt: null }
      : list
  );
  await saveLists(updated);

  const history = await loadHistory();
  const filteredHistory = history.filter((h) => h.listId !== listId);
  if (filteredHistory.length !== history.length) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify(filteredHistory)
    );
  }

  return updated.find((list) => list.id === listId) || null;
}

export async function deleteList(listId) {
  const lists = await loadLists();
  const target = lists.find((list) => list.id === listId);
  const photosToDelete = (Array.isArray(target?.items) ? target.items : [])
    .map((it) => it?.photoFilename)
    .filter(Boolean);

  const updated = lists.filter((list) => list.id !== listId);
  await saveLists(updated);

  if (photosToDelete.length > 0) {
    await deleteMultipleTagPhotoFiles(photosToDelete);
  }

  const history = await loadHistory();
  const filteredHistory = history.filter((h) => h.listId !== listId);
  if (filteredHistory.length !== history.length) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify(filteredHistory)
    );
  }

  return updated;
}

export async function deleteMultipleLists(listIds) {
  const idSet = new Set(Array.isArray(listIds) ? listIds : []);
  const lists = await loadLists();
  const photosToDelete = [];
  for (const list of lists) {
    if (idSet.has(list.id) && Array.isArray(list.items)) {
      for (const it of list.items) {
        if (it?.photoFilename) photosToDelete.push(it.photoFilename);
      }
    }
  }

  const updated = lists.filter((list) => !idSet.has(list.id));
  await saveLists(updated);

  if (photosToDelete.length > 0) {
    await deleteMultipleTagPhotoFiles(photosToDelete);
  }

  const history = await loadHistory();
  const filteredHistory = history.filter((h) => !idSet.has(h.listId));
  if (filteredHistory.length !== history.length) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify(filteredHistory)
    );
  }

  return updated;
}

export async function addItemToList(listId, itemData) {
  const trimmedName = String(itemData?.name || '').trim();
  if (!trimmedName) return null;
  const lists = await loadLists();
  const desc = String(itemData?.description ?? itemData?.notes ?? '').trim();
  const normalizedCat = normalizeCategoryName(itemData?.category);

  await learnCategoryAssociation(trimmedName, normalizedCat);

  const newItem = {
    id: generateId(),
    name: trimmedName,
    quantity: Math.max(0.1, parseDecimal(itemData?.quantity) || 1),
    unit: itemData?.unit || 'un',
    category: normalizedCat,
    price: parseDecimal(itemData?.price),
    description: desc,
    checked: Boolean(itemData?.checked),
    ...(itemData?.photoFilename
      ? {
          photoFilename: itemData.photoFilename,
          photoCapturedAt: itemData.photoCapturedAt || new Date().toISOString(),
        }
      : {}),
  };

  const sourceRemId = itemData?.sourceReminderId || null;

  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    const prevImported = Array.isArray(list.importedReminderIds)
      ? list.importedReminderIds
      : [];
    const nextImported =
      sourceRemId && !prevImported.includes(sourceRemId)
        ? [...prevImported, sourceRemId]
        : prevImported;
    return {
      ...list,
      importedReminderIds: nextImported,
      items: [newItem, ...(list.items || [])],
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function updateItemInList(listId, itemId, updates) {
  const lists = await loadLists();
  let learnedName = null;
  let learnedCat = null;

  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.map((item) => {
        if (item.id !== itemId) return item;
        const hasDesc = updates.description !== undefined || updates.notes !== undefined;
        const nextDesc = hasDesc
          ? String(updates.description ?? updates.notes ?? '').trim()
          : item.description ?? item.notes ?? '';
        const nextName =
          updates.name !== undefined
            ? String(updates.name).trim() || item.name
            : item.name;
        const nextCat = normalizeCategoryName(
          updates.category !== undefined ? updates.category : item.category
        );
        learnedName = nextName;
        learnedCat = nextCat;

        const nextPhotoFilename =
          updates.photoFilename !== undefined
            ? updates.photoFilename
            : item.photoFilename;
        const nextPhotoCapturedAt =
          updates.photoCapturedAt !== undefined
            ? updates.photoCapturedAt
            : item.photoCapturedAt;

        return {
          id: item.id,
          name: nextName,
          quantity:
            updates.quantity !== undefined
              ? Math.max(0.1, parseDecimal(updates.quantity) || 1)
              : item.quantity,
          unit: updates.unit !== undefined ? updates.unit : item.unit,
          category: nextCat,
          price: updates.price !== undefined ? parseDecimal(updates.price) : item.price,
          description: nextDesc,
          checked: updates.checked !== undefined ? Boolean(updates.checked) : item.checked,
          ...(nextPhotoFilename
            ? {
                photoFilename: nextPhotoFilename,
                photoCapturedAt: nextPhotoCapturedAt || null,
              }
            : {}),
        };
      }),
    };
  });

  if (learnedName && learnedCat) {
    await learnCategoryAssociation(learnedName, learnedCat);
  }

  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function updateItemQuantity(listId, itemId, delta) {
  const lists = await loadLists();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.map((item) => {
        if (item.id !== itemId) return item;
        const nextQty = Math.max(
          0,
          Math.round(((Number(item.quantity) || 0) + delta) * 100) / 100
        );
        return { ...item, quantity: nextQty };
      }),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function deleteItemFromList(listId, itemId) {
  const lists = await loadLists();
  let photoToDelete = null;
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    const targetItem = (list.items || []).find((item) => item.id === itemId);
    if (targetItem?.photoFilename) {
      photoToDelete = targetItem.photoFilename;
    }
    return {
      ...list,
      items: (list.items || []).filter((item) => item.id !== itemId),
    };
  });
  await saveLists(updated);
  if (photoToDelete) {
    await deleteTagPhotoFile(photoToDelete);
  }
  return updated.find((list) => list.id === listId) || null;
}

export async function removeTagPhotosFromItems(photoFilenames) {
  const targetSet = new Set(
    Array.isArray(photoFilenames) ? photoFilenames.filter(Boolean) : []
  );
  if (targetSet.size === 0) return { removedCount: 0 };

  const lists = await loadLists();
  let removedCount = 0;
  const updated = lists.map((list) => {
    const items = Array.isArray(list.items) ? list.items : [];
    let changed = false;
    const nextItems = items.map((item) => {
      if (item?.photoFilename && targetSet.has(item.photoFilename)) {
        changed = true;
        removedCount += 1;
        const { photoFilename, photoCapturedAt, ...rest } = item;
        return rest;
      }
      return item;
    });
    return changed ? { ...list, items: nextItems } : list;
  });

  await saveLists(updated);
  await deleteMultipleTagPhotoFiles(Array.from(targetSet));
  return { removedCount };
}

export async function removeAllTagPhotos() {
  const lists = await loadLists();
  let removedCount = 0;
  const updated = lists.map((list) => {
    const items = Array.isArray(list.items) ? list.items : [];
    let changed = false;
    const nextItems = items.map((item) => {
      if (item?.photoFilename) {
        removedCount += 1;
        changed = true;
        const { photoFilename, photoCapturedAt, ...rest } = item;
        return rest;
      }
      return item;
    });
    return changed ? { ...list, items: nextItems } : list;
  });

  await Promise.all([saveLists(updated), deleteAllTagPhotos()]);
  return { removedCount };
}

export async function runTagPhotoRetentionCleanup(retentionDays) {
  const lists = await loadLists();
  const result = await findAndDeleteExpiredTagPhotos(lists, retentionDays);
  if (result.changed) {
    await saveLists(result.updatedLists);
  }
  return result.removedCount;
}

export async function deleteAllShoppingLists() {
  const lists = await loadLists();
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify([])),
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([])),
    deleteAllTagPhotos(),
  ]);
  return { deletedLists: lists.length };
}

export async function deleteAllReminderLists() {
  const reminders = await loadReminderLists();
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([]));
  return { deletedReminders: reminders.length };
}

export async function deleteAllAppData() {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify([])),
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([])),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([])),
    AsyncStorage.removeItem(LEARNED_CATEGORIES_KEY),
    deleteAllTagPhotos(),
  ]);
  return { cleared: true };
}

export async function loadHistory() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ==========================================
// LISTAS DE LEMBRETES REUTILIZÁVEIS (MODELOS)
// ==========================================

function normalizeReminderListItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && String(it.name || '').trim())
    .map((it) => ({
      id: it.id || generateId(),
      name: String(it.name).trim(),
      quantity: Math.max(0.1, parseDecimal(it.quantity ?? it.quantidade ?? 1) || 1),
      unit: it.unit || 'un',
      category: normalizeCategoryName(it.category),
      notes: String(it.notes ?? it.description ?? '').trim(),
      createdAt: it.createdAt || new Date().toISOString(),
    }));
}

export function normalizeIncomingRemindersData(rawArray) {
  if (!Array.isArray(rawArray) || rawArray.length === 0) {
    return [];
  }

  const reminderLists = [];
  const legacyOrphanItems = [];

  for (const entry of rawArray) {
    if (!entry || typeof entry !== 'object') continue;
    if (Array.isArray(entry.items)) {
      reminderLists.push({
        id: entry.id || generateId(),
        name: String(entry.name || 'Lista de Lembretes').trim() || 'Lista de Lembretes',
        createdAt: entry.createdAt || new Date().toISOString(),
        items: normalizeReminderListItems(entry.items),
      });
    } else if (String(entry.name || '').trim()) {
      legacyOrphanItems.push(entry);
    }
  }

  if (legacyOrphanItems.length > 0) {
    reminderLists.push({
      id: generateId(),
      name: 'Lembretes Gerais',
      createdAt: new Date().toISOString(),
      items: normalizeReminderListItems(legacyOrphanItems),
    });
  }

  return reminderLists;
}

export async function loadReminderLists() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const needsMigration = parsed.some(
      (entry) => entry && typeof entry === 'object' && !Array.isArray(entry.items)
    );
    const normalized = normalizeIncomingRemindersData(parsed);

    if (needsMigration) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.REMINDERS,
        JSON.stringify(normalized)
      );
    }
    return normalized;
  } catch {
    return [];
  }
}

// Alias for compatibility
export const loadReminders = loadReminderLists;

export async function saveReminderLists(lists) {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(lists));
  return lists;
}

export const saveReminders = saveReminderLists;

export async function createReminderList(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const lists = await loadReminderLists();
  const newList = {
    id: generateId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    items: [],
  };
  const updated = [newList, ...lists];
  await saveReminderLists(updated);
  return newList;
}

export async function renameReminderList(reminderListId, newName) {
  const trimmed = String(newName || '').trim();
  if (!trimmed) return null;
  const lists = await loadReminderLists();
  const updated = lists.map((list) =>
    list.id === reminderListId ? { ...list, name: trimmed } : list
  );
  await saveReminderLists(updated);
  return updated.find((list) => list.id === reminderListId) || null;
}

export async function deleteReminderList(reminderListId) {
  const lists = await loadReminderLists();
  const updated = lists.filter((list) => list.id !== reminderListId);
  await saveReminderLists(updated);
  return updated;
}

export async function deleteMultipleReminderLists(reminderListIds) {
  const idSet = new Set(Array.isArray(reminderListIds) ? reminderListIds : []);
  const lists = await loadReminderLists();
  const updated = lists.filter((list) => !idSet.has(list.id));
  await saveReminderLists(updated);
  return updated;
}

export async function addReminderListItem(
  reminderListId,
  { name, quantity = 1, unit = 'un', category = 'Outros', notes = '' }
) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const normalizedCat = normalizeCategoryName(category);
  await learnCategoryAssociation(trimmed, normalizedCat);

  const lists = await loadReminderLists();
  const newItem = {
    id: generateId(),
    name: trimmed,
    quantity: Math.max(0.1, parseDecimal(quantity) || 1),
    unit: unit || 'un',
    category: normalizedCat,
    notes: String(notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  const updated = lists.map((list) =>
    list.id === reminderListId
      ? { ...list, items: [newItem, ...(list.items || [])] }
      : list
  );
  await saveReminderLists(updated);
  return updated.find((list) => list.id === reminderListId) || null;
}

export async function updateReminderListItem(reminderListId, itemId, updates) {
  const lists = await loadReminderLists();
  let learnedName = null;
  let learnedCat = null;

  const updated = lists.map((list) => {
    if (list.id !== reminderListId) return list;
    return {
      ...list,
      items: (list.items || []).map((item) => {
        if (item.id !== itemId) return item;
        const nextName =
          updates.name !== undefined
            ? String(updates.name).trim() || item.name
            : item.name;
        const nextCat = normalizeCategoryName(
          updates.category !== undefined ? updates.category : item.category
        );
        learnedName = nextName;
        learnedCat = nextCat;

        return {
          ...item,
          name: nextName,
          quantity:
            updates.quantity !== undefined
              ? Math.max(0.1, parseDecimal(updates.quantity) || 1)
              : item.quantity,
          unit: updates.unit !== undefined ? updates.unit : item.unit,
          category: nextCat,
          notes:
            updates.notes !== undefined || updates.description !== undefined
              ? String(updates.notes ?? updates.description ?? '').trim()
              : item.notes || '',
        };
      }),
    };
  });

  if (learnedName && learnedCat) {
    await learnCategoryAssociation(learnedName, learnedCat);
  }

  await saveReminderLists(updated);
  return updated.find((list) => list.id === reminderListId) || null;
}

export async function getReminderListById(reminderListId) {
  const lists = await loadReminderLists();
  return lists.find((list) => list.id === reminderListId) || null;
}

export async function updateReminderListItemQuantity(
  reminderListId,
  itemId,
  delta
) {
  const lists = await loadReminderLists();
  const updated = lists.map((list) => {
    if (list.id !== reminderListId) return list;
    return {
      ...list,
      items: (list.items || []).map((item) => {
        if (item.id !== itemId) return item;
        const current = Number(item.quantity) || 1;
        const nextQty = Math.max(1, Math.round((current + delta) * 100) / 100);
        return { ...item, quantity: nextQty };
      }),
    };
  });
  await saveReminderLists(updated);
  return updated.find((list) => list.id === reminderListId) || null;
}

export async function deleteReminderListItem(reminderListId, itemId) {
  const lists = await loadReminderLists();
  const updated = lists.map((list) => {
    if (list.id !== reminderListId) return list;
    return {
      ...list,
      items: (list.items || []).filter((item) => item.id !== itemId),
    };
  });
  await saveReminderLists(updated);
  return updated.find((list) => list.id === reminderListId) || null;
}

export async function importReminderItemsToShoppingList(
  shoppingListId,
  reminderItemsToImport
) {
  if (!shoppingListId || !Array.isArray(reminderItemsToImport) || reminderItemsToImport.length === 0) {
    return null;
  }

  const lists = await loadLists();
  const updatedLists = lists.map((list) => {
    if (list.id !== shoppingListId) return list;

    const currentImportedIds = new Set(
      Array.isArray(list.importedReminderIds) ? list.importedReminderIds : []
    );

    const newShoppingItems = reminderItemsToImport.map((rem) => {
      if (rem.id) {
        currentImportedIds.add(rem.id);
      }
      return {
        id: generateId(),
        name: String(rem.name || '').trim(),
        quantity: Math.max(0.1, parseDecimal(rem.quantity) || 1),
        unit: rem.unit || 'un',
        category: normalizeCategoryName(rem.category),
        price: 0,
        description: String(rem.notes ?? rem.description ?? '').trim(),
        checked: false,
        sourceReminderId: rem.id || null,
      };
    });

    return {
      ...list,
      importedReminderIds: Array.from(currentImportedIds),
      items: [...newShoppingItems, ...(list.items || [])],
    };
  });

  await saveLists(updatedLists);
  return updatedLists.find((l) => l.id === shoppingListId) || null;
}

// ==========================================
// BACKUP SELETIVO E RESTAURAÇÃO AUTOMÁTICA (JSON)
// ==========================================

export const BACKUP_APP_ID = 'minha-lista-de-compras';

export async function exportBackupPayload(exportType = 'all') {
  const safeType =
    exportType === 'lists' || exportType === 'reminders' ? exportType : 'all';

  const data = {};

  if (safeType === 'all' || safeType === 'lists') {
    const [lists, history] = await Promise.all([loadLists(), loadHistory()]);
    data.lists = lists;
    data.history = history;

    // Embed compressed tag photos only in full backup ('all')
    if (safeType === 'all') {
      const photoFilenames = [];
      for (const list of lists) {
        const items = Array.isArray(list?.items) ? list.items : [];
        for (const item of items) {
          if (item?.photoFilename) {
            photoFilenames.push(item.photoFilename);
          }
        }
      }
      if (photoFilenames.length > 0) {
        const photosMap = await exportTagPhotosAsBase64Map(photoFilenames);
        if (Object.keys(photosMap).length > 0) {
          data.photos = photosMap;
        }
      }
    }
  }

  if (safeType === 'all' || safeType === 'reminders') {
    const reminders = await loadReminderLists();
    data.reminders = reminders;
  }

  return {
    appId: BACKUP_APP_ID,
    version: 2,
    exportType: safeType,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function validateBackupPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'O arquivo selecionado não é um JSON válido.' };
  }
  if (raw.appId !== BACKUP_APP_ID) {
    return {
      valid: false,
      error: 'Este arquivo não pertence ao aplicativo Minha Lista de Compras.',
    };
  }
  if (!raw.data || typeof raw.data !== 'object') {
    return {
      valid: false,
      error: 'A estrutura de dados do arquivo de backup está inválida ou corrompida.',
    };
  }

  const declaredType = raw.exportType;
  const hasListsKey = Array.isArray(raw.data.lists);
  const hasRemindersKey = Array.isArray(raw.data.reminders);
  const photoCount =
    raw.data.photos && typeof raw.data.photos === 'object'
      ? Object.keys(raw.data.photos).length
      : 0;
  const hasPhotos = photoCount > 0 || declaredType === 'photos';

  let hasLists = hasListsKey;
  let hasReminders = hasRemindersKey;

  if (declaredType === 'lists') {
    hasLists = hasListsKey;
    hasReminders = false;
  } else if (declaredType === 'reminders') {
    hasLists = false;
    hasReminders = hasRemindersKey;
  } else if (declaredType === 'photos') {
    hasLists = false;
    hasReminders = false;
  }

  if (!hasLists && !hasReminders && !hasPhotos) {
    return {
      valid: false,
      error:
        'O arquivo de backup não contém listas de compras, lembretes nem fotos válidas.',
    };
  }

  const detectedType =
    declaredType === 'photos' && !hasLists && !hasReminders
      ? 'photos'
      : hasLists && hasReminders
        ? 'all'
        : hasLists
          ? 'lists'
          : hasReminders
            ? 'reminders'
            : 'photos';

  const listCount = hasLists ? raw.data.lists.length : 0;
  const normalizedReminders = hasReminders
    ? normalizeIncomingRemindersData(raw.data.reminders)
    : [];
  const reminderListCount = normalizedReminders.length;
  const reminderItemCount = normalizedReminders.reduce(
    (acc, rl) => acc + (Array.isArray(rl.items) ? rl.items.length : 0),
    0
  );

  return {
    valid: true,
    summary: {
      detectedType,
      hasLists,
      hasReminders,
      hasPhotos,
      listCount,
      reminderListCount,
      reminderItemCount,
      photoCount,
      exportedAt: raw.exportedAt || null,
    },
  };
}

export async function importBackupPayload(raw) {
  const check = validateBackupPayload(raw);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const { hasLists, hasReminders } = check.summary;
  const tasks = [];

  if (hasLists) {
    const incomingLists = (Array.isArray(raw.data.lists) ? raw.data.lists : []).map(
      (list) => ({
        ...list,
        importedReminderIds: Array.isArray(list?.importedReminderIds)
          ? list.importedReminderIds
          : [],
        items: Array.isArray(list?.items)
          ? list.items.map((item) => ({
              ...item,
              category: normalizeCategoryName(item?.category),
            }))
          : [],
      })
    );
    tasks.push(
      AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(incomingLists))
    );

    if (Array.isArray(raw.data.history)) {
      tasks.push(
        AsyncStorage.setItem(
          STORAGE_KEYS.HISTORY,
          JSON.stringify(raw.data.history)
        )
      );
    }
  }

  if (hasReminders) {
    const incomingReminders = normalizeIncomingRemindersData(raw.data.reminders);
    tasks.push(
      AsyncStorage.setItem(
        STORAGE_KEYS.REMINDERS,
        JSON.stringify(incomingReminders)
      )
    );
  }

  if (raw.data.photos && typeof raw.data.photos === 'object') {
    tasks.push(restoreTagPhotosFromBase64Map(raw.data.photos));
  }

  await Promise.all(tasks);

  // If this was a photos-only restore with a manifest, relink photoFilename on matching existing items
  if (
    !hasLists &&
    Array.isArray(raw.data.photosManifest) &&
    raw.data.photosManifest.length > 0
  ) {
    const existingLists = await loadLists();
    let changed = false;
    const byListAndItem = new Map();
    for (const m of raw.data.photosManifest) {
      if (m?.listId && m?.itemId && m?.photoFilename) {
        byListAndItem.set(`${m.listId}::${m.itemId}`, m);
      }
    }
    const relinked = existingLists.map((list) => {
      const items = Array.isArray(list?.items) ? list.items : [];
      let listChanged = false;
      const nextItems = items.map((item) => {
        const match = byListAndItem.get(`${list.id}::${item.id}`);
        if (match && !item.photoFilename) {
          listChanged = true;
          changed = true;
          return {
            ...item,
            photoFilename: match.photoFilename,
            photoCapturedAt: match.photoCapturedAt || list.createdAt || null,
          };
        }
        return item;
      });
      return listChanged ? { ...list, items: nextItems } : list;
    });
    if (changed) {
      await saveLists(relinked);
    }
  }

  return check.summary;
}
