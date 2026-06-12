import axios from 'axios';

/**
 * Base Axios instance pre-configured for the TechnoRUCS PMS API.
 * Uses Vite proxy in dev so baseURL is relative.
 */
const axiosClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Response interceptor — normalise errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(String(message)));
  },
);

export default axiosClient;
