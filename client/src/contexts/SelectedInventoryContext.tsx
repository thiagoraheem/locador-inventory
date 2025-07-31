import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SelectedInventoryContextType {
  selectedInventoryId: number | null;
  setSelectedInventoryId: (id: number | null) => void;
  clearSelectedInventory: () => void;
}

const SelectedInventoryContext = createContext<SelectedInventoryContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedInventoryId';

interface SelectedInventoryProviderProps {
  children: ReactNode;
}

export function SelectedInventoryProvider({ children }: SelectedInventoryProviderProps) {
  const [selectedInventoryId, setSelectedInventoryIdState] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId && !isNaN(Number(storedId))) {
      setSelectedInventoryIdState(Number(storedId));
    }
  }, []);

  // Save to localStorage and notify all consumers
  const setSelectedInventoryId = (id: number | null) => {
    setSelectedInventoryIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Clear selection
  const clearSelectedInventory = () => {
    setSelectedInventoryIdState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    selectedInventoryId,
    setSelectedInventoryId,
    clearSelectedInventory
  };

  return (
    <SelectedInventoryContext.Provider value={value}>
      {children}
    </SelectedInventoryContext.Provider>
  );
}

export function useSelectedInventory() {
  const context = useContext(SelectedInventoryContext);
  if (context === undefined) {
    throw new Error('useSelectedInventory must be used within a SelectedInventoryProvider');
  }
  return context;
}