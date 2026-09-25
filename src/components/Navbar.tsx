import React from 'react';
import { 
  Trello, 
  Plus, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  DollarSign, 
  Layers
} from 'lucide-react';
import { Task, TaskPriority } from '../types/crm';

interface Props {
  tasks: Task[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  onOpenNewTask: () => void;
  onOpenSupabaseConfig: () => void;
  supabaseConnected: boolean;
  totalDealValue: number;
}

export const Navbar: React.FC<Props> = ({
  tasks,
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  onOpenNewTask,
  onOpenSupabaseConfig,
  supabaseConnected,
  totalDealValue,
}) => {
  const inProgressCount = tasks.filter((t) => t.status === 'Em Andamento').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Trello className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  CRM Kanban
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Supabase Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Gestão manual de oportunidades e tarefas
              </p>
            </div>
          </div>

          {/* Search bar & Priority Filter */}
          <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar tarefa, cliente, empresa ou tag..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white outline-none transition"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              )}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">Todas Prioridades</option>
              <option value="Urgente">Urgente</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>

          {/* Right actions: Supabase status & New Task Button */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Supabase Connection Button */}
            <button
              onClick={onOpenSupabaseConfig}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                supabaseConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
              title="Configurar integração com Supabase"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {supabaseConnected ? 'Supabase Conectado' : 'Conectar Supabase'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </button>

            {/* "+ Nova Tarefa" */}
            <button
              onClick={onOpenNewTask}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="py-2.5 border-t border-slate-200/80 dark:border-slate-800 flex md:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar tarefas..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Prioridade</option>
            <option value="Urgente">Urgente</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>
    </header>
  );
};
