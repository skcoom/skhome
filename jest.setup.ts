import '@testing-library/jest-dom';

// グローバルモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          order: jest.fn(() => ({ data: [], error: null })),
        })),
        order: jest.fn(() => ({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => ({ data: { user: null }, error: null })),
    },
  })),
}));
