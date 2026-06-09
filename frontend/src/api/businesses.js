import api from './client'

// Público
export const getBusinesses       = (category) => api.get('/businesses/', { params: category ? { category } : {} })
export const getBusiness         = (id)        => api.get(`/businesses/${id}/`)

// Dueño de negocio
export const getMyProducts       = ()          => api.get('/owner/products/')
export const createProduct       = (data)      => api.post('/owner/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateProduct       = (id, data)  => api.patch(`/owner/products/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteProduct       = (id)        => api.delete(`/owner/products/${id}/`)
export const toggleAvailability  = (id)        => api.patch(`/owner/products/${id}/toggle-availability/`)
