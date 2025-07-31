
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'selectedInventoryId';

export function useSelectedInventory() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId && !isNaN(Number(storedId))) {
      setSelectedInventoryId(Number(storedId));
    }
  }, []);

  // Save to localStorage whenever selection changes
  const setAndPersistInventoryId = (id: number | null) => {
    setSelectedInventoryId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Clear selection
  const clearSelectedInventory = () => {
    setSelectedInventoryId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    selectedInventoryId,
    setSelectedInventoryId: setAndPersistInventoryId,
    clearSelectedInventory
  };
}
