import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      login: (adminData) => {
        set({ admin: adminData, isAuthenticated: true });
      },
      logout: () => {
        set({ admin: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-store',
    }
  )
);

export default useAuthStore;
