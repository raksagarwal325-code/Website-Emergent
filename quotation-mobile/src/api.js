import axios from "axios";

// This adapter supplies only the API used by the shared builder and PDF code.
// The gateway keeps the production session in an HttpOnly cookie on this host.
const client = axios.create({ baseURL: "/api", withCredentials: true, headers: { "X-Requested-With": "fetch" } });
const data = (promise) => promise.then(response => response.data);
export const api = {
  authMe: () => data(client.get("/auth/me")),
  authSession: (session_id) => data(client.post("/auth/session", { session_id })),
  authLogout: () => data(client.post("/auth/logout")),
  adminProductsExport: () => data(client.get("/admin/products/export")),
  listInquiryQuotations: (id) => data(client.get(`/admin/inquiries/${encodeURIComponent(id)}/quotations`)),
  listStandaloneQuotations: () => data(client.get("/admin/quotations")),
  updateQuotation: (id, body) => data(client.put(`/admin/quotations/${encodeURIComponent(id)}`, body)),
  deleteQuotation: (id) => data(client.delete(`/admin/quotations/${encodeURIComponent(id)}`)),
  createStandaloneQuotation: (body) => data(client.post("/admin/quotations", body)),
  createInquiryQuotation: (id, body) => data(client.post(`/admin/inquiries/${encodeURIComponent(id)}/quotations`, body)),
  aiQuotationCustomisation: (body) => data(client.post("/ai/quotation-customisation", body)),
  upload: (file) => {
    if (file.size > 4 * 1024 * 1024) return Promise.reject(new Error("Choose an image under 4 MB for the mobile quotation app."));
    const form = new FormData(); form.append("file", file);
    return data(client.post("/upload", form));
  },
  resolveImage: (url) => {
    if (!url) return "";
    if (/^https:\/\/samratglass\.com\/api\/files\//.test(url)) return new URL(url).pathname;
    if (url.startsWith("/api/files/")) return url;
    if (url.startsWith("/api/")) return url;
    // Remote product images may not allow cross-origin PDF fetches. The
    // original builder handles a missing image by retaining the text line.
    return url;
  },
};
