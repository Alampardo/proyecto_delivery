import api from './client'

// Cliente
export const createOrder        = (data) => api.post('/orders/', data)

// Dueño de negocio
export const getOwnerOrders     = (all = false) => api.get('/owner/orders/', { params: all ? { all: 'true' } : {} })
export const startPreparation   = (id)  => api.patch(`/owner/orders/${id}/start-preparation/`)
export const handToDelivery     = (id)  => api.patch(`/owner/orders/${id}/hand-to-delivery/`)

// Admin
export const getAdminOrders     = (params) => api.get('/admin/orders/', { params })
export const getAdminReports    = (params) => api.get('/admin/orders/reports/', { params })
export const assignDelivery     = (orderId, deliveryUserId) => api.patch(`/admin/orders/${orderId}/assign-delivery/`, { delivery: deliveryUserId })

// Admin — pagos pendientes
export const getBusinessPayouts = () => api.get('/admin/payouts/businesses/')
export const markBusinessPaid   = (businessId) => api.post(`/admin/payouts/businesses/${businessId}/mark-paid/`)
export const getDeliveryPayouts = () => api.get('/admin/payouts/deliveries/')
export const markDeliveryPaid   = (userId) => api.post(`/admin/payouts/deliveries/${userId}/mark-paid/`)
