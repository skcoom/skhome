/**
 * 役割ベースアクセス制御（RBAC）
 *
 * 役割の権限レベル:
 * - admin: 全機能にアクセス可能
 * - staff: プロジェクト・ブログ・お問い合わせ管理
 * - partner: 自分が関わるプロジェクトの閲覧のみ
 */

import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_name?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * 認証済みユーザーを取得（usersテーブルから役割情報も取得）
 */
export async function getAuthUser(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { user: null, error: '認証が必要です' };
    }

    // usersテーブルから役割情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, company_name')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return { user: null, error: 'ユーザー情報が見つかりません' };
    }

    return {
      user: userData as AuthUser,
      error: null,
    };
  } catch {
    return { user: null, error: '認証エラーが発生しました' };
  }
}

/**
 * 権限定義
 */
export const PERMISSIONS = {
  // ユーザー管理
  'users:read': ['admin'],
  'users:write': ['admin'],
  'users:delete': ['admin'],

  // プロジェクト管理
  'projects:read': ['admin', 'staff', 'partner'],
  'projects:write': ['admin', 'staff'],
  'projects:delete': ['admin'],

  // メディア管理
  'media:read': ['admin', 'staff', 'partner'],
  'media:write': ['admin', 'staff'],
  'media:delete': ['admin', 'staff'],

  // ブログ管理
  'blog:read': ['admin', 'staff'],
  'blog:write': ['admin', 'staff'],
  'blog:delete': ['admin'],

  // お問い合わせ管理
  'contacts:read': ['admin', 'staff'],
  'contacts:write': ['admin', 'staff'],
  'contacts:delete': ['admin'],

  // 設定管理
  'settings:read': ['admin', 'staff'],
  'settings:write': ['admin'],

  // AI機能
  'ai:use': ['admin', 'staff'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * ユーザーが特定の権限を持っているかチェック
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * 認証と権限チェックを行う
 * @param permission 必要な権限
 * @returns 認証結果とエラー
 */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const { user, error } = await getAuthUser();

  if (error || !user) {
    return { user: null, error: error || '認証が必要です' };
  }

  if (!hasPermission(user.role, permission)) {
    return { user: null, error: 'この操作を行う権限がありません' };
  }

  return { user, error: null };
}

/**
 * 管理者のみアクセス可能
 */
export async function requireAdmin(): Promise<AuthResult> {
  const { user, error } = await getAuthUser();

  if (error || !user) {
    return { user: null, error: error || '認証が必要です' };
  }

  if (user.role !== 'admin') {
    return { user: null, error: '管理者権限が必要です' };
  }

  return { user, error: null };
}

/**
 * スタッフ以上（admin, staff）がアクセス可能
 */
export async function requireStaff(): Promise<AuthResult> {
  const { user, error } = await getAuthUser();

  if (error || !user) {
    return { user: null, error: error || '認証が必要です' };
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    return { user: null, error: 'スタッフ以上の権限が必要です' };
  }

  return { user, error: null };
}
