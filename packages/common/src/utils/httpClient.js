import axios from "axios";

/**
 * High-Performance HTTP Client using Axios
 */
export class HTTPClient {
  constructor(baseURL, timeout = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request Interceptor (e.g., for logging or adding Auth headers)
    this.client.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error),
    );

    // Response Interceptor (Unifies error format)
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const message =
          error.response?.data?.error?.message ||
          error.message ||
          "Internal Service Call Failed";
        return Promise.reject(new Error(message));
      },
    );
  }

  async get(path, headers = {}) {
    return this.client.get(path, { headers });
  }

  async post(path, data, headers = {}) {
    return this.client.post(path, data, { headers });
  }

  async put(path, data, headers = {}) {
    return this.client.put(path, data, { headers });
  }

  async delete(path, headers = {}) {
    return this.client.delete(path, { headers });
  }
}
