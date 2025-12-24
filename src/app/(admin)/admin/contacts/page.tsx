'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Phone, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Contact, ContactStatus } from '@/types/database';

const statusConfig: Record<ContactStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '未対応', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  in_progress: { label: '対応中', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { label: '完了', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filter, setFilter] = useState<ContactStatus | 'all'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) {
        throw new Error('お問い合わせの取得に失敗しました');
      }
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ContactStatus) => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }

      const updatedContact = await response.json();
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? updatedContact : c))
      );
      if (selectedContact?.id === id) {
        setSelectedContact(updatedContact);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedContact(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredContacts = filter === 'all'
    ? contacts
    : contacts.filter((c) => c.status === filter);

  const statusCounts = {
    all: contacts.length,
    pending: contacts.filter((c) => c.status === 'pending').length,
    in_progress: contacts.filter((c) => c.status === 'in_progress').length,
    completed: contacts.filter((c) => c.status === 'completed').length,
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">お問い合わせ管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          お客様からのお問い合わせを管理します
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          すべて ({statusCounts.all})
        </button>
        {(Object.keys(statusConfig) as ContactStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-gray-900 text-white'
                : `${statusConfig[status].color} hover:opacity-80`
            }`}
          >
            {statusConfig[status].label} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact list */}
        <div className="lg:col-span-1 space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {filter === 'all' ? 'お問い合わせがありません' : `${statusConfig[filter as ContactStatus].label}のお問い合わせがありません`}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const StatusIcon = statusConfig[contact.status].icon;
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left rounded-lg bg-white p-4 shadow transition-all hover:shadow-md ${
                    selectedContact?.id === contact.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {contact.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {contact.email}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {contact.message}
                      </p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusConfig[contact.status].color}`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig[contact.status].label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(contact.created_at).toLocaleString('ja-JP')}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Contact detail */}
        <div className="lg:col-span-2">
          {selectedContact ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedContact.name} 様
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedContact.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>

              {/* Contact info */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">メールアドレス</p>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                </div>
                {selectedContact.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">電話番号</p>
                      <a
                        href={`tel:${selectedContact.phone}`}
                        className="text-sm font-medium text-green-600 hover:underline"
                      >
                        {selectedContact.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  お問い合わせ内容
                </h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedContact.message}
                  </p>
                </div>
              </div>

              {/* Status update */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  ステータスを変更
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as ContactStatus[]).map((status) => {
                    const StatusIcon = statusConfig[status].icon;
                    const isActive = selectedContact.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedContact.id, status)}
                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : `${statusConfig[status].color} hover:opacity-80`
                        }`}
                      >
                        <StatusIcon className="mr-2 h-4 w-4" />
                        {statusConfig[status].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                左のリストからお問い合わせを選択してください
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900">お問い合わせを削除</h3>
            <p className="mt-2 text-sm text-gray-500">
              {selectedContact.name}様からのお問い合わせを削除しますか？この操作は取り消せません。
            </p>
            <div className="mt-6 flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
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
