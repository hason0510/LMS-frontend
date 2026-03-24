import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      loading: true,
      accessToken: null,

      // Set user data (called after fetching from API)
      setUser: (userData) => set({ user: userData }),

      // Set access token
      setAccessToken: (token) => set({ accessToken: token }),

      // Update user data partially (e.g., after profile update)
      updateUser: (updatedData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedData } : null,
        })),

      // Clear user data (logout)
      clearUser: () =>
        set({
          user: null,
          accessToken: null,
        }),

      // Initialize loading state
      setLoading: (isLoading) => set({ loading: isLoading }),

      // Initialize user and token from localStorage
      initializeAuth: (userData, token) => {
        set({
          user: userData,
          accessToken: token,
          loading: false,
        });
      },
    }),
    {
      name: "user-store", // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);

export default useUserStore;
