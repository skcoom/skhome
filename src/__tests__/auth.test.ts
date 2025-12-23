import { hasPermission, PERMISSIONS } from '@/lib/auth';
import type { UserRole } from '@/types/database';

describe('auth - hasPermission', () => {
  describe('admin権限', () => {
    const role: UserRole = 'admin';

    it('全ての権限を持つ', () => {
      const permissions = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];
      permissions.forEach((permission) => {
        expect(hasPermission(role, permission)).toBe(true);
      });
    });
  });

  describe('staff権限', () => {
    const role: UserRole = 'staff';

    it('プロジェクト読み取り・書き込み権限を持つ', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'projects:write')).toBe(true);
    });

    it('プロジェクト削除権限を持たない', () => {
      expect(hasPermission(role, 'projects:delete')).toBe(false);
    });

    it('ユーザー管理権限を持たない', () => {
      expect(hasPermission(role, 'users:read')).toBe(false);
      expect(hasPermission(role, 'users:write')).toBe(false);
      expect(hasPermission(role, 'users:delete')).toBe(false);
    });

    it('AI機能の使用権限を持つ', () => {
      expect(hasPermission(role, 'ai:use')).toBe(true);
    });

    it('設定変更権限を持たない', () => {
      expect(hasPermission(role, 'settings:write')).toBe(false);
    });
  });

  describe('partner権限', () => {
    const role: UserRole = 'partner';

    it('プロジェクト読み取り権限のみ持つ', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'projects:write')).toBe(false);
      expect(hasPermission(role, 'projects:delete')).toBe(false);
    });

    it('ブログ管理権限を持たない', () => {
      expect(hasPermission(role, 'blog:read')).toBe(false);
      expect(hasPermission(role, 'blog:write')).toBe(false);
      expect(hasPermission(role, 'blog:delete')).toBe(false);
    });

    it('AI機能の使用権限を持たない', () => {
      expect(hasPermission(role, 'ai:use')).toBe(false);
    });
  });
});

describe('PERMISSIONS定義', () => {
  it('全ての権限キーが定義されている', () => {
    const expectedPermissions = [
      'users:read',
      'users:write',
      'users:delete',
      'projects:read',
      'projects:write',
      'projects:delete',
      'media:read',
      'media:write',
      'media:delete',
      'blog:read',
      'blog:write',
      'blog:delete',
      'contacts:read',
      'contacts:write',
      'contacts:delete',
      'settings:read',
      'settings:write',
      'ai:use',
    ];

    expectedPermissions.forEach((permission) => {
      expect(PERMISSIONS).toHaveProperty(permission);
    });
  });

  it('各権限には有効な役割が設定されている', () => {
    const validRoles = ['admin', 'staff', 'partner'];

    Object.values(PERMISSIONS).forEach((roles) => {
      roles.forEach((role) => {
        expect(validRoles).toContain(role);
      });
    });
  });
});
