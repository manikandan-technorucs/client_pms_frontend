import axios from 'axios';


const axiosClient = axios.create({
  // Use absolute URL from environment if set (e.g. production), fallback to Vite proxy path
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
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
