import { createContext } from 'react';
import type { AuthContextType } from './auth-types';

/** Context object only — Fast Refresh: separate from AuthProvider component file. */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
