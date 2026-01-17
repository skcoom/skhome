'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  Check,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Order, OrderItem, Supplier, Project } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

const statusLabels = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  ordered: { label: '発注済', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: '納品済', color: 'bg-green-100 text-green-800' },
};

function formatCurrency(value: number): string {
  return value.toLocaleString() + '円';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

export default function ProjectOrdersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materialBudget, setMaterialBudget] = useState<number | null>(null);
  const [orderedTotal, setOrderedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    status: 'ordered' as 'draft' | 'ordered' | 'delivered',
    notes: '',
    items: [{ item_name: '', specification: '', quantity: 1, unit: '', unit_price: 0, amount: 0 }] as Partial<OrderItem>[],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // プロジェクト情報を取得
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      setProject(projectData);

      // 発注先一覧を取得
      const suppliersRes = await fetch('/api/suppliers');
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.suppliers.filter((s: Supplier) => s.is_active));
      }

      // 発注一覧を取得
      const ordersRes = await fetch(`/api/projects/${projectId}/orders`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
        setMaterialBudget(ordersData.materialBudget);
        setOrderedTotal(ordersData.orderedTotal || 0);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateItemAmount = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      item.amount = calculateItemAmount(
        field === 'quantity' ? Number(value) : item.quantity || 1,
        field === 'unit_price' ? Number(value) : item.unit_price || 0
      );
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: '', specification: '', quantity: 1, unit: '', unit_price: 0, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id || !formData.order_date) {
      alert('発注先と発注日を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingOrder
        ? `/api/projects/${projectId}/orders/${editingOrder.id}`
        : `/api/projects/${projectId}/orders`;
      const method = editingOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      delivery_date: order.delivery_date || '',
      status: order.status,
      notes: order.notes || '',
      items: order.items && order.items.length > 0
        ? order.items
        : [{ item_name: '', specification: '', quantity: 1, unit: '', unit_price: 0, amount: 0 }],
    });
    setShowForm(true);
  };

  const handleDelete = async (order: Order) => {
    if (!confirm('この発注を削除しますか？')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/orders/${order.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOrder(null);
    setFormData({
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      status: 'ordered',
      notes: '',
      items: [{ item_name: '', specification: '', quantity: 1, unit: '', unit_price: 0, amount: 0 }],
    });
  };

  const remainingBudget = materialBudget ? materialBudget - orderedTotal : null;
  const isOverBudget = remainingBudget !== null && remainingBudget < 0;
  const isNearLimit = remainingBudget !== null && materialBudget !== null && !isOverBudget && remainingBudget < materialBudget * 0.2;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Link
            href={`/admin/projects/${projectId}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">発注管理</h1>
            <p className="text-gray-500 mt-1">{project?.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          発注を追加
        </Button>
      </div>

      {/* 予算サマリー */}
      {materialBudget && (
        <div className={`rounded-lg p-4 ${isOverBudget ? 'bg-red-50' : isNearLimit ? 'bg-yellow-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">材料費予算</p>
              <p className="text-lg font-bold">{formatCurrency(materialBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">発注済合計</p>
              <p className="text-lg font-bold">{formatCurrency(orderedTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">残り予算</p>
              <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'}`}>
                {remainingBudget !== null && (remainingBudget >= 0 ? formatCurrency(remainingBudget) : `-${formatCurrency(Math.abs(remainingBudget))}`)}
              </p>
            </div>
            {(isOverBudget || isNearLimit) && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`h-5 w-5 ${isOverBudget ? 'text-red-500' : 'text-yellow-500'}`} />
                <span className={`text-sm font-medium ${isOverBudget ? 'text-red-700' : 'text-yellow-700'}`}>
                  {isOverBudget ? '予算超過' : '残り予算少'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 発注一覧 */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{order.supplier?.name || '発注先不明'}</h3>
                  <p className="text-sm text-gray-500">
                    発注日: {formatDate(order.order_date)}
                    {order.delivery_date && ` / 納品予定: ${formatDate(order.delivery_date)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusLabels[order.status].color}`}>
                  {statusLabels[order.status].label}
                </span>
                <button
                  onClick={() => handleEdit(order)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(order)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 明細 */}
            {order.items && order.items.length > 0 && (
              <div className="border-t pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left pb-2">品名</th>
                      <th className="text-left pb-2">仕様</th>
                      <th className="text-right pb-2">数量</th>
                      <th className="text-right pb-2">単価</th>
                      <th className="text-right pb-2">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="py-2">{item.item_name}</td>
                        <td className="py-2 text-gray-500">{item.specification || '-'}</td>
                        <td className="py-2 text-right">{item.quantity}{item.unit}</td>
                        <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 合計 */}
            <div className="border-t mt-4 pt-4 flex justify-end space-x-8">
              <div className="text-right">
                <p className="text-sm text-gray-500">小計</p>
                <p className="font-medium">{formatCurrency(order.total_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">消費税</p>
                <p className="font-medium">{formatCurrency(order.tax_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">合計</p>
                <p className="text-lg font-bold">{formatCurrency(order.total_amount + order.tax_amount)}</p>
              </div>
            </div>

            {order.notes && (
              <p className="mt-4 text-sm text-gray-500 border-t pt-4">{order.notes}</p>
            )}
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>発注がありません</p>
            <p className="text-sm">「発注を追加」から登録してください</p>
          </div>
        )}
      </div>

      {/* 発注フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingOrder ? '発注を編集' : '発注を追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    発注先 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">選択してください</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'ordered' | 'delivered' })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="draft">下書き</option>
                    <option value="ordered">発注済</option>
                    <option value="delivered">納品済</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    発注日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    納品予定日
                  </label>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* 明細 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  発注明細
                </label>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={item.item_name || ''}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        placeholder="品名"
                        className="col-span-3 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={item.specification || ''}
                        onChange={(e) => updateItem(index, 'specification', e.target.value)}
                        placeholder="仕様"
                        className="col-span-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        placeholder="数量"
                        className="col-span-1 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                      />
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        placeholder="単位"
                        className="col-span-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        placeholder="単価"
                        className="col-span-2 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                      />
                      <div className="col-span-2 text-right text-sm font-medium">
                        {formatCurrency(item.amount || 0)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="col-span-1 p-1 text-gray-400 hover:text-red-600"
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + 明細を追加
                </button>
              </div>

              {/* 合計 */}
              <div className="flex justify-end space-x-8 p-4 bg-gray-50 rounded-lg">
                <div className="text-right">
                  <p className="text-sm text-gray-500">小計</p>
                  <p className="font-medium">{formatCurrency(getTotalAmount())}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">消費税(10%)</p>
                  <p className="font-medium">{formatCurrency(Math.floor(getTotalAmount() * 0.1))}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">合計</p>
                  <p className="text-lg font-bold">{formatCurrency(Math.floor(getTotalAmount() * 1.1))}</p>
                </div>
              </div>

              {/* 予算警告 */}
              {materialBudget && formData.status !== 'draft' && (
                (() => {
                  const newTotal = orderedTotal - (editingOrder ? editingOrder.total_amount + editingOrder.tax_amount : 0) + Math.floor(getTotalAmount() * 1.1);
                  const newRemaining = materialBudget - newTotal;
                  if (newRemaining < 0) {
                    return (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm">この発注を登録すると予算を {formatCurrency(Math.abs(newRemaining))} 超過します</span>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {editingOrder ? '更新' : '登録'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
