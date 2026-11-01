export const API_ROUTES = {
  works: {
    list: '/works',
  },
  suppliers: {
    list: '/suppliers',
  },
  users: {
    list: '/users',
  },
  orders: {
    list: '/orders',
    byId: (id: number) => `/orders/${id}`,
    approve: (id: number) => `/orders/${id}/approve`,
    reject: (id: number) => `/orders/${id}/reject`,
  },
  approvalRules: {
    byWork: (workId: number | string) => `/works/${workId}/approval-rules`,
  },
} as const;
