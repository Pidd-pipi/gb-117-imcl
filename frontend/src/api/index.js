import axios from 'axios';

const API_BASE_URL = 'http://localhost:8219/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const expoAPI = {
  getAll: () => api.get('/expos'),
  getById: (id) => api.get(`/expos/${id}`),
  create: (data) => api.post('/expos', data),
  update: (id, data) => api.put(`/expos/${id}`, data),
  addZone: (id, data) => api.post(`/expos/${id}/zones`, data),
  updateZone: (expoId, zoneId, data) => api.put(`/expos/${expoId}/zones/${zoneId}`, data),
  deleteZone: (expoId, zoneId) => api.delete(`/expos/${expoId}/zones/${zoneId}`),
};

export const boothAPI = {
  getByExpo: (expoId) => api.get(`/booths/expo/${expoId}`),
  getById: (id) => api.get(`/booths/${id}`),
  getPending: () => api.get('/booths/pending'),
  getMyBooth: (expoId) => api.get(`/booths/my/${expoId}`),
  create: (data) => api.post('/booths', data),
  approve: (id, data) => api.put(`/booths/${id}/approve`, data),
  reject: (id) => api.put(`/booths/${id}/reject`),
};

export const scheduleAPI = {
  getByExpo: (expoId) => api.get(`/schedules/expo/${expoId}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

export const favoriteAPI = {
  getMyFavorites: () => api.get('/favorites/my'),
  getExpoFavorites: (expoId) => api.get(`/favorites/expo/${expoId}`),
  addFavorite: (data) => api.post('/favorites', data),
  removeFavorite: (boothId) => api.delete(`/favorites/${boothId}`),
};

export const reviewAPI = {
  getByBooth: (boothId) => api.get(`/reviews/booth/${boothId}`),
  create: (data) => api.post('/reviews', data),
};
