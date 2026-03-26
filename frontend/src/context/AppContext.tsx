import React, { createContext, useContext, useState, useCallback } from 'react';
import type { GroupType, ViewMode } from '../types';
import { NEW_GROUP_OPERATORS, OLD_GROUP_OPERATORS } from '../types';

interface AppContextType {
  groupType: GroupType;
  viewMode: ViewMode;
  currentOperator: string;
  setGroupType: (g: GroupType) => void;
  setViewMode: (v: ViewMode) => void;
  setCurrentOperator: (o: string) => void;
  operators: string[];
}

const AppContext = createContext<AppContextType>({
  groupType: '新群',
  viewMode: '群视图',
  currentOperator: '',
  setGroupType: () => {},
  setViewMode: () => {},
  setCurrentOperator: () => {},
  operators: [],
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groupType, setGroupTypeState] = useState<GroupType>('新群');
  const [viewMode, setViewMode] = useState<ViewMode>('群视图');
  const [currentOperator, setCurrentOperator] = useState<string>(NEW_GROUP_OPERATORS[0]);

  const operators = groupType === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;

  const setGroupType = useCallback((g: GroupType) => {
    setGroupTypeState(g);
    const ops = g === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;
    setCurrentOperator(ops[0]);
  }, []);

  return (
    <AppContext.Provider value={{
      groupType,
      viewMode,
      currentOperator,
      setGroupType,
      setViewMode,
      setCurrentOperator,
      operators,
    }}>
      {children}
    </AppContext.Provider>
  );
};
