import { createContext, useContext, useState, ReactNode } from 'react';

export type Screen =
  | 'dashboard'
  | 'pomodoro'
  | 'tasks'
  | 'goals'
  | 'create-task'
  | 'create-goal'
  | 'settings';

interface NavigationContextType {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');

  return (
    <NavigationContext.Provider
      value={{ currentScreen, setCurrentScreen }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
