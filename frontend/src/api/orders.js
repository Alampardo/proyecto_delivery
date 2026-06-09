import api from './client'

// Cliente
export const createOrder        = (data) => api.post('/orders/', data)

// Dueño de negocio
export const getOwnerOrders     = (all = false) => api.get('/owner/orders/', { params: all ? { all: 'true' } : {} })
export const startPreparation   = (id)  => api.patch(`/owner/orders/${id}/start-preparation/`)
export const handToDelivery     = (id)  => api.patch(`/owner/orders/${id}/hand-to-delivery/`)

// Admin
export const getAdminOrders     = (params) => api.get('/admin/orders/', { params })
