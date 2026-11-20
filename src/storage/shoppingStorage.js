import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LISTS: '@mlc_offline:lists',
  HISTORY: '@mlc_offline:history',
  PANTRY: '@mlc_offline:pantry',
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

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateBR(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--/--/----';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const subtotal = qty * price;
    totalQuantity += qty;
    estimatedTotal += subtotal;
    if (item.checked) {
      checkedItems += 1;
      checkedTotal += subtotal;
    }
  }

  return {
    totalItems: items.length,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    checkedItems,
    pendingItems: items.length - checkedItems,
    estimatedTotal,
    checkedTotal,
  };
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

export async function createList(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const lists = await loadLists();
  const newList = {
    id: generateId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    items: [],
  };
  const updated = [newList, ...lists];
  await saveLists(updated);
  return newList;
}

export async function renameList(listId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const lists = await loadLists();
  const updated = lists.map((list) =>
    list.id === listId ? { ...list, name: trimmed } : list
  );
  await saveLists(updated);
  return updated.find((list) => list.id === listId) || null;
}

export async function deleteList(listId) {
  const lists = await loadLists();
  const updated = lists.filter((list) => list.id !== listId);
  await saveLists(updated);
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

export async function completeShoppingTrip(listId) {
  const lists = await loadLists();
  const target = lists.find((list) => list.id === listId);
  if (!target || target.items.length === 0) return null;

  const checkedItems = target.items.filter((item) => item.checked);
  const itemsToRecord = checkedItems.length > 0 ? checkedItems : target.items;

  let total = 0;
  const byCategory = {};

  for (const item of itemsToRecord) {
    const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
    total += subtotal;
    const cat = item.category || 'Outros';
    byCategory[cat] = (byCategory[cat] || 0) + subtotal;
  }

  const tripRecord = {
    id: generateId(),
    listId: target.id,
    listName: target.name,
    date: new Date().toISOString(),
    itemCount: itemsToRecord.length,
    total,
    byCategory,
  };

  const history = await loadHistory();
  const updatedHistory = [tripRecord, ...history];
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));

  if (checkedItems.length > 0) {
    const updatedLists = lists.map((list) =>
      list.id === listId
        ? { ...list, items: list.items.filter((item) => !item.checked) }
        : list
    );
    await saveLists(updatedLists);
  }

  return tripRecord;
}

export async function loadPantry() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PANTRY);
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

export async function savePantry(pantry) {
  await AsyncStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(pantry));
  return pantry;
}

export async function addPantryItem(itemData) {
  const trimmedName = String(itemData?.name || '').trim();
  if (!trimmedName) return null;
  const pantry = await loadPantry();
  const newItem = {
    id: generateId(),
    name: trimmedName,
    quantity: Math.max(0, parseDecimal(itemData?.quantity)),
    minQuantity: Math.max(0, parseDecimal(itemData?.minQuantity) || 1),
    unit: itemData?.unit || 'un',
    category: itemData?.category || 'Outros',
  };
  const updated = [newItem, ...pantry];
  await savePantry(updated);
  return updated;
}

export async function updatePantryQuantity(itemId, delta) {
  const pantry = await loadPantry();
  const updated = pantry.map((item) => {
    if (item.id !== itemId) return item;
    const nextQty = Math.max(0, Math.round(((Number(item.quantity) || 0) + delta) * 100) / 100);
    return { ...item, quantity: nextQty };
  });
  await savePantry(updated);
  return updated;
}

export async function deletePantryItem(itemId) {
  const pantry = await loadPantry();
  const updated = pantry.filter((item) => item.id !== itemId);
  await savePantry(updated);
  return updated;
}

export async function sendPantryItemToActiveList(pantryItem) {
  let lists = await loadLists();
  let targetList = lists[0];

  if (!targetList) {
    targetList = {
      id: generateId(),
      name: 'Lista de Compras',
      createdAt: new Date().toISOString(),
      items: [],
    };
    lists = [targetList];
  }

  const normalizedName = String(pantryItem?.name || '').trim().toLowerCase();
  const existingIndex = targetList.items.findIndex(
    (item) => !item.checked && item.name.trim().toLowerCase() === normalizedName
  );

  let updatedItems;
  if (existingIndex >= 0) {
    updatedItems = targetList.items.map((item, idx) =>
      idx === existingIndex
        ? { ...item, quantity: (Number(item.quantity) || 1) + 1 }
        : item
    );
  } else {
    const missingQty = Math.max(
      1,
      (Number(pantryItem?.minQuantity) || 1) - (Number(pantryItem?.quantity) || 0)
    );
    const newItem = {
      id: generateId(),
      name: pantryItem.name,
      quantity: missingQty,
      unit: pantryItem.unit || 'un',
      category: pantryItem.category || 'Outros',
      price: 0,
      description: 'Reposição da despensa',
      checked: false,
    };
    updatedItems = [newItem, ...targetList.items];
  }

  const updatedLists = lists.map((list) =>
    list.id === targetList.id ? { ...list, items: updatedItems } : list
  );
  await saveLists(updatedLists);

  return {
    listName: targetList.name,
    itemName: pantryItem.name,
  };
}
