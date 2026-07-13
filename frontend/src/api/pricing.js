import api from './client'

// Público (checkout)
export const getPublicPricing   = () => api.get('/pricing/')

// Admin
export const getAdminPricing    = () => api.get('/admin/pricing/')
export const updateAdminPricing = (fd) => api.patch('/admin/pricing/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getAdminRings      = () => api.get('/admin/rings/')
export const updateRing         = (id, price) => api.patch(`/admin/rings/${id}/`, { price })
