import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      token:   null,
      user:    null,
      profile: null,

      setAuth: ({ token, user, profile }) =>
        set({ token, user, profile: profile ?? null }),

      clearAuth: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, profile: null })
      },

      updateProfile: (profile) => set({ profile }),
    }),
    {
      name: 'delivery-auth',
      partialize: (s) => ({ token: s.token, user: s.user, profile: s.profile }),
      onRehydrateStorage: () => (state) => {
        // Sincroniza el token en localStorage para que el interceptor de axios lo lea
        if (state?.token) localStorage.setItem('token', state.token)
      },
    }
  )
)

export default useAuthStore
