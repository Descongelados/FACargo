import { create } from 'zustand';
import { User, Role } from '../types';
import { MOCK_USERS } from '../data/mockData';

interface AuthState {
  currentUser: User;
  users: User[];
  setUserRole: (role: Role) => void;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id'>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: MOCK_USERS[0],
  users: MOCK_USERS,
  setUserRole: (role: Role) =>
    set((state) => ({
      currentUser: { ...state.currentUser, role },
    })),
  switchUser: (userId: string) =>
    set((state) => {
      const user = state.users.find((u) => u.id === userId);
      return user ? { currentUser: user } : {};
    }),
  addUser: (userData) =>
    set((state) => ({
      users: [...state.users, { ...userData, id: `usr-${Date.now()}` }],
    })),
}));