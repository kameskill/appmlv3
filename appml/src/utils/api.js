import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ML_BASE = import.meta.env.VITE_ML_URL || 'http://localhost:5001'

// ── Axios instances ───────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: API_BASE, timeout: 10000 })
export const mlApi = axios.create({ baseURL: ML_BASE, timeout: 8000 })

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (data) => api.post('/auth/login', data),
    sendRegisterOtp: (data) => api.post('/auth/register/send-otp', data),
    register: (data) => api.post('/auth/register', data),
    sendPasswordOtp: (data) => api.post('/auth/password/send-otp', data),
    resetPassword: (data) => api.post('/auth/password/reset', data),
    me: () => api.get('/auth/me'),
    updatePhone: (data) => api.patch('/auth/me/phone', data)
}

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsApi = {
    create: (data) => api.post('/appointments', data),
    getAvailability: (date) => api.get(`/appointments/availability?date=${date}`),
    getRecommendations: (breed, season, topN = 3) =>
        api.get('/appointments/recommendations', {
            params: { breed, season, top_n: topN }
        }),
    getMy: () => api.get('/appointments/my'),
    cancel: (id) => api.delete(`/appointments/${id}`)
}

// ── Contact ───────────────────────────────────────────────────────────────────
export const contactApi = {
    send: (data) => api.post('/contact', data)
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
    getStats: () => api.get('/admin/stats'),
    getAppointments: (params) => api.get('/admin/appointments', { params }),
    updateStatus: (id, status) => api.patch(`/admin/appointments/${id}/status`, { status }),
    deleteAppointment: (id) => api.delete(`/admin/appointments/${id}`),
    getAnalytics: () => api.get('/admin/analytics', { timeout: 25000 }),
    getContacts: () => api.get('/admin/contacts'),

    // Added for the specific-user notification dropdown
    getUsers: () => api.get('/admin/users'),

    getNotifications: () => api.get('/admin/notifications'),
    createNotification: (data) => api.post('/admin/notifications', data)
}

// ── Notifications ──────────────────────────────────────────────────────────────
export const notificationsApi = {
    getMine: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`)
}

// ── ML Service ────────────────────────────────────────────────────────────────
export const mlRecommendApi = {
    recommend: (breed, season, topN = 3, country = 'philippines') =>
        mlApi.get('/recommend', { params: { breed, season, top_n: topN, country } }),
    getCurrentSeason: () => mlApi.get('/season'),
    getBreeds: () => mlApi.get('/breeds'),
    getModelInfo: () => mlApi.get('/model-info')
}

// ── Error helper ──────────────────────────────────────────────────────────────
export const getErrorMessage = (error) => {
    if (error?.response?.data?.message) return error.response.data.message
    if (error?.response?.data?.errors?.length) return error.response.data.errors[0].msg
    if (error?.message) return error.message
    return 'An unexpected error occurred'
}
