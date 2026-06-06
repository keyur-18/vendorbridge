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

export const poFiltersAtom = atom({
  key: 'poFilters',
  default: '',
});

export const invoiceFiltersAtom = atom({
  key: 'invoiceFilters',
  default: '',
});

// ─── Data List Atoms ─────────────────────────────────────────
export const vendorsAtom = atom({
  key: 'vendorsList',
  default: [],
});

export const rfqsAtom = atom({
  key: 'rfqsList',
  default: [],
});

export const purchaseOrdersAtom = atom({
  key: 'purchaseOrdersList',
  default: [],
});

export const invoicesAtom = atom({
  key: 'invoicesList',
  default: [],
});
