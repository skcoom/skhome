'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Briefcase, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User, UserRole } from '@/types/database';

const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: '管理者', color: 'bg-red-100 text-red-800', icon: Shield },
  staff: { label: 'スタッフ', color: 'bg-blue-100 text-blue-800', icon: Briefcase },
  partner: { label: '協力会社', color: 'bg-green-100 text-green-800', icon: Building },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'staff' as UserRole,
    company_name: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('ユーザーの取得に失敗しました');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      role: 'staff',
      company_name: '',
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      company_name: user.company_name || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role) {
      setError('名前と役割は必須です');
      return;
    }

    if (!editingUser && !formData.email) {
      setError('メールアドレスは必須です');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          role: formData.role,
          company_name: formData.company_name || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }

      if (editingUser) {
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      } else {
        setUsers((prev) => [data, ...prev]);
        // 招待メール送信成功メッセージを表示
        if (data.message) {
          setSuccessMessage(data.message);
        }
      }

      setShowModal(false);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || '削除に失敗しました');
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch {
      setError('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            システムを利用するユーザーを管理します
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          ユーザーを追加
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Role summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
          const config = roleConfig[role];
          const count = users.filter((u) => u.role === role).length;
          const Icon = config.icon;
          return (
            <div key={role} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500">{config.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                役割
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会社名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const config = roleConfig[user.role];
              const Icon = config.icon;
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.company_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">ユーザーが登録されていません</p>
            <Button onClick={openCreateModal} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              最初のユーザーを追加
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              {editingUser ? 'ユーザーを編集' : 'ユーザーを追加'}
            </h3>

            <div className="space-y-4">
              {!editingUser && (
                <Input
                  id="email"
                  type="email"
                  label="メールアドレス *"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              )}

              <Input
                id="name"
                label="名前 *"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="山田太郎"
                required
              />

              <div className="space-y-1">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  役割 *
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="admin">管理者</option>
                  <option value="staff">スタッフ</option>
                  <option value="partner">協力会社</option>
                </select>
              </div>

              <Input
                id="company_name"
                label="会社名"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                placeholder="株式会社〇〇"
              />
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                {editingUser ? '更新する' : '追加する'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900">ユーザーを削除</h3>
            <p className="mt-2 text-sm text-gray-500">
              {userToDelete.name}さんを削除しますか？この操作は取り消せません。
            </p>
            <div className="mt-6 flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
