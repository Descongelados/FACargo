import { useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { useClientsStore } from '../store/useClientsStore';
import { useNotifyStore } from '../store/useNotifyStore';
import { Client } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { formatCurrency } from '../utils/formatters';

const EMPTY_CLIENT: Omit<Client, 'id'> = {
  name: '', taxId: '', contactName: '', email: '', phone: '',
  address: '', creditDays: 30, creditLimit: 100000, status: 'active',
};

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useClientsStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id'>>(EMPTY_CLIENT);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_CLIENT); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (c: Client) => {
    const { id, ...rest } = c;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };
  const handleSave = () => {
    if (!form.name.trim() || !form.contactName.trim()) {
      useNotifyStore.getState().notifyError('Completa los campos obligatorios: Nombre de la Empresa y Nombre de Contacto.');
      return;
    }
    if (editingId) updateClient(editingId, form);
    else addClient(form);
    setIsModalOpen(false);
  };
  const f = (key: keyof Omit<Client, 'id'>, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes registrados`}
        icon={Users}
        action={{ label: 'Nuevo Cliente', onClick: openAdd }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, RFC o contacto..." />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes" description="Agrega tu primer cliente para comenzar." action={{ label: 'Nuevo Cliente', onClick: openAdd }} />
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Empresa', 'RFC', 'Contacto', 'Crédito', 'Límite', 'Estatus', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{c.taxId || <span className="text-slate-500">—</span>}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300">{c.contactName}</p>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.creditDays} días</td>
                    <td className="px-4 py-3 text-slate-300">{formatCurrency(c.creditLimit)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        colorClass={c.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}
                        label={c.status === 'active' ? 'Activo' : 'Inactivo'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteClient(c.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre de la Empresa" required className="col-span-2">
            <Input value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Distribuidora del Norte S.A." />
          </FormField>
          <FormField label="RFC / Tax ID">
            <Input value={form.taxId} onChange={(e) => f('taxId', e.target.value)} placeholder="ABC123456XY0" />
          </FormField>
          <FormField label="Estatus">
            <Select value={form.status} onChange={(e) => f('status', e.target.value as 'active' | 'inactive')}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </FormField>
          <FormField label="Nombre de Contacto" required>
            <Input value={form.contactName} onChange={(e) => f('contactName', e.target.value)} placeholder="Ing. Juan Pérez" />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="contacto@empresa.com" />
          </FormField>
          <FormField label="Teléfono">
            <Input value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+52 55 1234 5678" />
          </FormField>
          <FormField label="Días de Crédito">
            <Input type="number" value={form.creditDays} onChange={(e) => f('creditDays', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Límite de Crédito (MXN)">
            <Input type="number" value={form.creditLimit} onChange={(e) => f('creditLimit', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Dirección" className="col-span-2">
            <Input value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Av. Industrial 400, Ciudad, Estado" />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
