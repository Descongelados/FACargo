import { create } from 'zustand';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { profileFromDB } from '../lib/mappers';

interface AuthState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  // Autenticación
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  initAuth: () => Promise<void>;
  // Gestión de usuarios (solo admin)
  loadUsers: () => Promise<void>;
  addUser: (email: string, password: string, name: string, role: Role) => Promise<string | null>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  updateUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  users: [],
  loading: true,

  initAuth: async () => {
    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        set({ currentUser: null, loading: false });
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, email:id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        set({
          currentUser: profileFromDB({ ...profile, email: session.user.email }),
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    });

    // Sesión inicial
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ loading: false });
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      set({
        currentUser: profileFromDB({ ...profile, email: session.user.email }),
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  signIn: async (username, password) => {
    // Si no trae '@', es un usuario simple: se completa con el dominio interno
    const email = username.includes('@') ? username.trim() : `${username.trim()}@facargo.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, users: [] });
  },

  loadUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error || !data) return;

    // Para obtener emails necesitamos la sesión del usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    const currentEmail = session?.user?.email ?? '';

    const users: User[] = data.map((row) =>
      profileFromDB({
        ...row,
        email: row.id === get().currentUser?.id ? currentEmail : '',
      })
    );
    set({ users });
  },

  addUser: async (email, password, name, role) => {
    // Crear usuario en Auth (requiere service_role en producción real;
    // aquí usamos signUp que Supabase permite si email confirm está desactivado)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    });
    if (error) return error.message;
    if (!data.user) return 'No se pudo crear el usuario';

    // El trigger on_auth_user_created crea el perfil automáticamente
    // pero si el rol no es el correcto lo actualizamos
    await supabase
      .from('profiles')
      .update({ role, full_name: name })
      .eq('id', data.user.id);

    await get().loadUsers();
    return null;
  },

  updateUserRole: async (userId, role) => {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
      currentUser: state.currentUser?.id === userId
        ? { ...state.currentUser, role }
        : state.currentUser,
    }));
  },

  updateUserStatus: async (userId, status) => {
    await supabase.from('profiles').update({ status }).eq('id', userId);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, status } : u)),
    }));
  },
}));
