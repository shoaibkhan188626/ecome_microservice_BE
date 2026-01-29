/**
 * HTTP Client for inter-service communication
 */
export class HTTPClient {
  constructor(baseURL, timeout = 30000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  async request(method, path, data = null, headers = {}) {
    const url = `${this.baseURL}${path}`;

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error?.message || "Request failed");
      }

      return responseData;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  async get(path, headers = {}) {
    return this.request("GET", path, null, headers);
  }

  async post(path, data, headers = {}) {
    return this.request("POST", path, data, headers);
  }

  async put(path, data, headers = {}) {
    return this.request("PUT", path, data, headers);
  }

  async delete(path, headers = {}) {
    return this.request("DELETE", path, null, headers);
  }
}
