import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ShowMoneyContextType {
  showMoney: boolean;
  toggleShowMoney: () => void;
}

const ShowMoneyContext = createContext<ShowMoneyContextType | undefined>(undefined);

export const ShowMoneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showMoney, setShowMoney] = useState(() => {
    // Recupera a preferência do localStorage ou usa true como padrão
    const saved = localStorage.getItem('showMoney');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleShowMoney = () => {
    const newValue = !showMoney;
    setShowMoney(newValue);
    localStorage.setItem('showMoney', JSON.stringify(newValue));
  };

  return (
    <ShowMoneyContext.Provider value={{ showMoney, toggleShowMoney }}>
      {children}
    </ShowMoneyContext.Provider>
  );
};

export const useShowMoney = () => {
  const context = useContext(ShowMoneyContext);
  if (context === undefined) {
    throw new Error('useShowMoney must be used within a ShowMoneyProvider');
  }
  return context;
};

// Função utilitária para formatar valores monetários
export const formatCurrency = (value: number, showMoney: boolean = true): string => {
  if (!showMoney) {
    return '***';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

// Função utilitária para ocultar valores sensíveis
export const hideValue = (value: string | number, showMoney: boolean = true): string => {
  if (!showMoney) {
    return '***';
  }
  
  return typeof value === 'number' ? value.toString() : value;
};