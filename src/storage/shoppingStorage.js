import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LISTS: '@mlc_offline:lists',
  HISTORY: '@mlc_offline:history',
  REMINDERS: '@mlc_offline:reminders',
  SETTINGS: '@mlc_offline:settings',
  PANTRY: '@mlc_offline:pantry',
};

export const DEFAULT_SETTINGS = {
  darkMode: false,
  cameraCaptureMode: 'partial', // 'full' | 'partial'
  cameraSource: 'native', // 'native' (câmera nativa do celular) | 'inapp' (câmera integrada)
};

export const CATEGORIES = [
  'Hortifruti',
  'Mercearia',
  'Laticínios',
  'Carnes',
  'Padaria',
  'Bebidas',
  'Limpeza',
  'Higiene',
  'Outros',
];

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

export function maskDateBRInput(rawText) {
  const digits = String(rawText || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function parseDateBRToISO(dateBR, fallbackIso = null) {
  const trimmed = String(dateBR || '').trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1970 || year > 2100) {
    return null;
  }
  const ref = fallbackIso ? new Date(fallbackIso) : new Date();
  const safeRef = Number.isNaN(ref.getTime()) ? new Date() : ref;
  const constructed = new Date(
    year,
    month - 1,
    day,
    safeRef.getHours(),
    safeRef.getMinutes(),
    safeRef.getSeconds()
  );
  if (
    constructed.getFullYear() !== year ||
    constructed.getMonth() !== month - 1 ||
    constructed.getDate() !== day
  ) {
    return null;
  }
  return constructed.toISOString();
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
      Number(item.precoUnitario ?? item.price ?? item.preco ?? 0) || 0
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
    return {
      darkMode: Boolean(parsed?.darkMode),
      cameraCaptureMode:
        parsed?.cameraCaptureMode === 'full' ? 'full' : 'partial',
      cameraSource:
        parsed?.cameraSource === 'inapp' ? 'inapp' : 'native',
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
    return Array.isArray(parsed) ? parsed : [];
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

export async function renameList(listId, nameOrPayload, maybeBudget) {
  if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
    return updateListDetails(listId, nameOrPayload);
  }
  const updates = { name: nameOrPayload };
  if (maybeBudget !== undefined) {
    updates.budget = maybeBudget;
  }
  return updateListDetails(listId, updates);
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
      const sub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      total += sub;
      const cat = item.category || 'Outros';
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
  const updated = lists.filter((list) => list.id !== listId);
  await saveLists(updated);

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
  const updated = lists.filter((list) => !idSet.has(list.id));
  await saveLists(updated);

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
  const newItem = {
    id: generateId(),
    name: trimmedName,
    quantity: Math.max(0.1, parseDecimal(itemData?.quantity) || 1),
    unit: itemData?.unit || 'un',
    category: itemData?.category || 'Outros',
    price: parseDecimal(itemData?.price),
    priceType: itemData?.priceType === 'atacado' ? 'atacado' : 'varejo',
    retailPrice: parseDecimal(itemData?.retailPrice),
    wholesalePrice: parseDecimal(itemData?.wholesalePrice),
    description: desc,
    checked: Boolean(itemData?.checked),
  };

  const updated = lists.map((list) =>
    list.id === listId ? { ...list, items: [newItem, ...list.items] } : list
  );
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function updateItemInList(listId, itemId, updates) {
  const lists = await loadLists();
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
        return {
          ...item,
          name: updates.name !== undefined ? String(updates.name).trim() || item.name : item.name,
          quantity:
            updates.quantity !== undefined
              ? Math.max(0.1, parseDecimal(updates.quantity) || 1)
              : item.quantity,
          unit: updates.unit !== undefined ? updates.unit : item.unit,
          category: updates.category !== undefined ? updates.category : item.category,
          price: updates.price !== undefined ? parseDecimal(updates.price) : item.price,
          priceType:
            updates.priceType !== undefined
              ? updates.priceType === 'atacado'
                ? 'atacado'
                : 'varejo'
              : item.priceType || 'varejo',
          retailPrice:
            updates.retailPrice !== undefined
              ? parseDecimal(updates.retailPrice)
              : item.retailPrice || 0,
          wholesalePrice:
            updates.wholesalePrice !== undefined
              ? parseDecimal(updates.wholesalePrice)
              : item.wholesalePrice || 0,
          description: nextDesc,
          checked: updates.checked !== undefined ? Boolean(updates.checked) : item.checked,
        };
      }),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function toggleItemChecked(listId, itemId) {
  const lists = await loadLists();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function setItemQuantity(listId, itemId, nextQty) {
  const lists = await loadLists();
  const safeQty = Math.max(0, Math.round((Number(nextQty) || 0) * 100) / 100);
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.map((item) =>
        item.id === itemId ? { ...item, quantity: safeQty } : item
      ),
    };
  });
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
        const nextQty = Math.max(0, Math.round(((Number(item.quantity) || 0) + delta) * 100) / 100);
        return { ...item, quantity: nextQty };
      }),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function deleteItemFromList(listId, itemId) {
  const lists = await loadLists();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function clearCheckedItems(listId) {
  const lists = await loadLists();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.filter((item) => !item.checked),
    };
  });
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
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

export async function clearHistory() {
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
  return [];
}

// ==========================================
// LISTA DE LEMBRETE (PLANEJAMENTO)
// ==========================================

export async function loadReminders() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveReminders(reminders) {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  return reminders;
}

export async function addReminderItem({ name, quantity = 1, unit = 'un', category = 'Outros', notes = '' }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const reminders = await loadReminders();
  const newItem = {
    id: generateId(),
    name: trimmed,
    quantity: Math.max(1, parseDecimal(quantity) || 1),
    unit: unit || 'un',
    category: category || 'Outros',
    notes: String(notes || '').trim(),
    checked: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...reminders];
  await saveReminders(updated);
  return updated;
}

export async function setReminderChecked(reminderId, checked) {
  const reminders = await loadReminders();
  const updated = reminders.map((item) =>
    item.id === reminderId ? { ...item, checked: Boolean(checked) } : item
  );
  await saveReminders(updated);
  return updated;
}

export async function toggleReminderChecked(reminderId) {
  const reminders = await loadReminders();
  const updated = reminders.map((item) =>
    item.id === reminderId ? { ...item, checked: !item.checked } : item
  );
  await saveReminders(updated);
  return updated;
}

export async function deleteReminderItem(reminderId) {
  const reminders = await loadReminders();
  const updated = reminders.filter((item) => item.id !== reminderId);
  await saveReminders(updated);
  return updated;
}

export async function clearCheckedReminders() {
  const reminders = await loadReminders();
  const updated = reminders.filter((item) => !item.checked);
  await saveReminders(updated);
  return updated;
}

export async function sendCheckedRemindersToActiveList() {
  const reminders = await loadReminders();
  const selected = reminders.filter((r) => r.checked);
  const toSend = selected.length > 0 ? selected : reminders;
  if (toSend.length === 0) return null;

  let lists = await loadLists();
  let targetList = lists.find((l) => !l.completed);

  if (!targetList) {
    targetList = {
      id: generateId(),
      name: 'Nova Compra',
      budget: 0,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      items: [],
    };
    lists = [targetList, ...lists];
  }

  let updatedItems = [...(targetList.items || [])];
  for (const rem of toSend) {
    const normalized = rem.name.trim().toLowerCase();
    const existingIdx = updatedItems.findIndex(
      (it) => it.name.trim().toLowerCase() === normalized
    );
    if (existingIdx >= 0) {
      updatedItems[existingIdx] = {
        ...updatedItems[existingIdx],
        quantity:
          (Number(updatedItems[existingIdx].quantity) || 1) +
          (Number(rem.quantity) || 1),
      };
    } else {
      updatedItems = [
        {
          id: generateId(),
          name: rem.name,
          quantity: Number(rem.quantity) || 1,
          unit: rem.unit || 'un',
          category: rem.category || 'Outros',
          price: 0,
          priceType: 'varejo',
          retailPrice: 0,
          wholesalePrice: 0,
          description: rem.notes || 'Adicionado da Lista de Lembrete',
          checked: false,
        },
        ...updatedItems,
      ];
    }
  }

  const updatedLists = lists.map((l) =>
    l.id === targetList.id ? { ...l, items: updatedItems } : l
  );
  await saveLists(updatedLists);

  return {
    listId: targetList.id,
    listName: targetList.name,
    addedCount: toSend.length,
  };
}

// ==========================================
// BACKUP E RESTAURAÇÃO (JSON)
// ==========================================

export const BACKUP_APP_ID = 'minha-lista-de-compras';

export async function exportBackupPayload() {
  const [lists, reminders, history] = await Promise.all([
    loadLists(),
    loadReminders(),
    loadHistory(),
  ]);

  return {
    appId: BACKUP_APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      lists,
      reminders,
      history,
    },
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
  if (!raw.data || typeof raw.data !== 'object' || !Array.isArray(raw.data.lists)) {
    return {
      valid: false,
      error: 'A estrutura de listas do arquivo de backup está inválida ou corrompida.',
    };
  }

  const listCount = raw.data.lists.length;
  const reminderCount = Array.isArray(raw.data.reminders)
    ? raw.data.reminders.length
    : 0;

  return {
    valid: true,
    summary: {
      listCount,
      reminderCount,
      exportedAt: raw.exportedAt || null,
    },
  };
}

export async function importBackupPayload(raw) {
  const check = validateBackupPayload(raw);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const incomingLists = Array.isArray(raw.data.lists) ? raw.data.lists : [];
  const incomingReminders = Array.isArray(raw.data.reminders)
    ? raw.data.reminders
    : [];
  const incomingHistory = Array.isArray(raw.data.history)
    ? raw.data.history
    : [];

  // Restore only lists, reminders, and history — ignore any legacy `settings` key
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(incomingLists)),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(incomingReminders)),
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(incomingHistory)),
  ]);

  return true;
}
