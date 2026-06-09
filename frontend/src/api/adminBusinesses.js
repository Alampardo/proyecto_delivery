import api from './client'

export const getAdminBusinesses  = ()          => api.get('/admin/businesses/')
export const getAdminBusiness    = (id)        => api.get(`/admin/businesses/${id}/`)
export const createAdminBusiness = (data)      => api.post('/admin/businesses/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateAdminBusiness = (id, data)  => api.patch(`/admin/businesses/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteAdminBusiness = (id)        => api.delete(`/admin/businesses/${id}/`)
