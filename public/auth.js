// Shared by every portal page: talks to the backend API and keeps the login token.

const TOKEN_KEY = 'ewaste-token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(token, role) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('ewaste-role', role || 'user');
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('ewaste-role');
    }
  } catch {}
}
// Only decides whether to show the Admin link; the server checks the real role on every admin request.
function isAdmin() {
  try { return localStorage.getItem('ewaste-role') === 'admin'; } catch { return false; }
}

// fetch() wrapper: sends JSON with the token, throws an Error carrying the server's message and field errors.
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Check your internet connection.'), { fields: {} });
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken(null);
    location.href = `/login.html?next=${encodeURIComponent(location.pathname)}`;
  }
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status}).`), { fields: data.fields || {} });
  return data;
}

// Pages that need an account call this first.
function requireLogin() {
  if (!getToken()) location.replace(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
}

function logout() {
  setToken(null);
  location.href = '/login.html';
}

// Same rules as the server (api/_lib.js), so users see mistakes before submitting.
const RULES = {
  name: (v) => /^[A-Za-z .'-]{2,60}$/.test(v) || 'Name must be 2–60 letters.',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.',
  password: (v) => (v.length >= 8 && /\d/.test(v) && /[A-Za-z]/.test(v)) || 'Password needs 8+ characters with a letter and a number.',
  phone: (v) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^\+91/, '')) || 'Enter a 10-digit Indian mobile number.',
  address: (v) => (v.length >= 10 && v.length <= 300) || 'Address must be 10–300 characters.',
  pincode: (v) => /^\d{6}$/.test(v) || 'PIN code must be 6 digits.',
};

// Shows a message under each field (an element with id "<field>-error") and marks the input invalid.
function showFieldErrors(form, fields) {
  form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  for (const [name, message] of Object.entries(fields)) {
    const out = form.querySelector(`#${name}-error`);
    if (out) out.textContent = message;
    const input = form.elements[name];
    if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
  }
  const first = Object.keys(fields)[0];
  const input = first && form.elements[first];
  if (input && input.focus) input.focus();
}

// Runs RULES on the named fields. Optional fields are skipped when empty.
function checkFields(form, names, optional = []) {
  const errors = {};
  for (const name of names) {
    const v = form.elements[name].value.trim();
    if (!v) { if (!optional.includes(name)) errors[name] = 'This field is required.'; continue; }
    const ok = RULES[name](v);
    if (ok !== true) errors[name] = ok;
  }
  return errors;
}

// Header: show "Log in" or "My profile · Log out" depending on the token.
document.addEventListener('DOMContentLoaded', () => {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;
  if (getToken()) {
    slot.innerHTML = (isAdmin() ? '<a href="/admin.html">Admin</a> ' : '') +
      '<a href="/profile.html">My profile</a> <button type="button" class="linkish" id="logout">Log out</button>';
    document.getElementById('logout').addEventListener('click', logout);
  } else {
    slot.innerHTML = '<a href="/login.html">Log in</a>';
  }
});
