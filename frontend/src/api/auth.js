import api from './client'

export const login            = (data) => api.post('/auth/login/', data)
export const logout           = ()     => api.post('/auth/logout/')
export const me               = ()     => api.get('/auth/me/')
export const registerClient   = (data) => api.post('/auth/register/client/', data)
export const registerDelivery = (data) => api.post('/auth/register/delivery/', data)
export const registerOwner    = (data) => api.post('/auth/register/owner/', data)
export const changePassword   = (data) => api.post('/auth/change-password/', data)
