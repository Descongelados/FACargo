import { Bell, User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { ROLE_LABELS } from '../constants/roles';

export default function Topbar() {
  const { currentUser, switchUser, users } = useAuthStore();

  return (
    <header className="h-14 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Usuario activo */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{currentUser.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{ROLE_LABELS[currentUser.role]}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Dropdown cambiar usuario (demo) */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2">
              <p className="text-xs text-slate-500 px-2 py-1 font-medium uppercase tracking-wider">Cambiar usuario (demo)</p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                    u.id === currentUser.id ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium leading-tight">{u.name}</p>
                    <p className="text-xs text-slate-400 leading-tight">{ROLE_LABELS[u.role]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
