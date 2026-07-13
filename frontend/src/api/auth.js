import api from './client'

export const login            = (data) => api.post('/auth/login/', data)
export const logout           = ()     => api.post('/auth/logout/')
export const me               = ()     => api.get('/auth/me/')
export const registerClient   = (data) => api.post('/auth/register/client/', data)
export const registerDelivery = (data) => api.post('/auth/register/delivery/', data)
export const registerOwner    = (data) => api.post('/auth/register/owner/', data)
export const changePassword   = (data) => api.post('/auth/change-password/', data)

// Verificación de email
export const verifyEmail          = (token) => api.post('/auth/verify-email/', { token })
export const resendVerification   = (email) => api.post('/auth/resend-verification/', { email })

// Recuperación de contraseña
export const requestPasswordReset = (email) => api.post('/auth/request-password-reset/', { email })
export const resetPassword        = (data)  => api.post('/auth/reset-password/', data)
