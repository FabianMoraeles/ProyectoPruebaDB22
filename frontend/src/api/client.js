const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  get: (p) => fetch(`${BASE}${p}`).then(handle),
  post: (p, body) => fetch(`${BASE}${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(handle),
  put: (p, body) => fetch(`${BASE}${p}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(handle),
  patch: (p, body) => fetch(`${BASE}${p}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(handle),
  del: (p, body) => fetch(`${BASE}${p}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
  }).then(handle)
};

// Entity-specific helpers
export const entity = (label) => ({
  list: (q) => api.get(`/${label}${q ? `?${new URLSearchParams(q)}` : ''}`),
  stats: () => api.get(`/${label}/stats`),
  get: (id) => api.get(`/${label}/${encodeURIComponent(id)}`),
  create: (body) => api.post(`/${label}`, body),
  createMulti: (body) => api.post(`/${label}/multi-label`, body),
  update: (id, props) => api.put(`/${label}/${encodeURIComponent(id)}`, props),
  updateMany: (filter, props) => api.put(`/${label}/many`, { filter, props }),
  removeProps: (id, props) => api.patch(`/${label}/${encodeURIComponent(id)}/remove-props`, { props }),
  removePropsMany: (filter, props) => api.patch(`/${label}/remove-props-many`, { filter, props }),
  del: (id) => api.del(`/${label}/${encodeURIComponent(id)}`),
  delMany: (filter) => api.del(`/${label}/many`, filter)
});
