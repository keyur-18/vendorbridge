import { atom, selector } from 'recoil';

// ─── Auth Atoms ─────────────────────────────────────────────
export const authTokenAtom = atom({
  key: 'authToken',
  default: localStorage.getItem('vb_token') || null,
});

export const authUserAtom = atom({
  key: 'authUser',
  default: JSON.parse(localStorage.getItem('vb_user') || 'null'),
});

export const isAuthenticatedSelector = selector({
  key: 'isAuthenticated',
  get: ({ get }) => {
    const token = get(authTokenAtom);
    const user = get(authUserAtom);
    return !!(token && user);
  },
});

// ─── UI Atoms ────────────────────────────────────────────────
export const sidebarOpenAtom = atom({
  key: 'sidebarOpen',
  default: true,
});

export const notificationCountAtom = atom({
  key: 'notificationCount',
  default: 0,
});

// ─── Filter/Search Atoms ─────────────────────────────────────
export const vendorFiltersAtom = atom({
  key: 'vendorFilters',
  default: { search: '', category: '', status: '' },
});

export const rfqFiltersAtom = atom({
  key: 'rfqFilters',
  default: { search: '', status: '' },
});
