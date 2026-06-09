import api from './client'

// Delivery
export const getMyProfile        = ()     => api.get('/delivery/profile/')
export const updateMyProfile     = (data) => api.patch('/delivery/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const toggleShift         = ()     => api.patch('/delivery/toggle-shift/')
export const getHistory          = (days) => api.get('/delivery/history/', { params: { days } })

// Admin
export const getDeliveries       = ()           => api.get('/admin/deliveries/')
export const generateCode        = ()           => api.post('/admin/generate-delivery-code/')
export const getCodes            = (available)  => api.get('/admin/delivery-codes/', { params: available ? { available: 'true' } : {} })
export const generateBizToken    = (businessId) => api.post('/admin/generate-business-token/', { business: businessId })
