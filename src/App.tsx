import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trello, 
  Plus, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Briefcase, 
  Layers, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Task, TaskStatus } from './types/crm';
import { 
  fetchTasks, 
  createTask, 
  updateTask, 
  deleteTask 
} from './services/crmService';
import { 
  getStoredSupabaseCredentials, 
  testSupabaseConnection 
} from './lib/supabase';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>('Não iniciado');

  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Banner & Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Check Supabase connection on mount
  const verifySupabase = async () => {
    const creds = getStoredSupabaseCredentials();
    if (creds.url && creds.anonKey) {
      const res = await testSupabaseConnection(creds.url, creds.anonKey);
      setSupabaseConnected(res.success);
      setSupabaseError(res.success ? null : res.message);
    } else {
      setSupabaseConnected(false);
      setSupabaseError(null);
    }
  };

  // Load tasks
  const loadTasksData = async () => {
    setLoading(true);
    await verifySupabase();
    const result = await fetchTasks();
    setTasks(result.tasks);
    setLoading(false);
  };

  useEffect(() => {
    loadTasksData();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await verifySupabase();
    const result = await fetchTasks();
    setTasks(result.tasks);
    setIsRefreshing(false);
    showToast('Dados sincronizados com sucesso!', 'info');
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchTerm, priorityFilter]);

  // Handle task creation or update
  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'position'>
  ) => {
    if (taskToEdit) {
      // Update existing
      const result = await updateTask(taskToEdit.id, taskData);
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskToEdit.id ? { ...t, ...taskData, updated_at: new Date().toISOString() } : t))
        );
        showToast('Tarefa atualizada com sucesso!');
      } else {
        showToast(`Erro ao atualizar: ${result.error}`, 'error');
      }
      setTaskToEdit(null);
    } else {
      // Create new
      const result = await createTask({
        ...taskData,
        position: tasks.filter((t) => t.status === taskData.status).length,
      });

      setTasks((prev) => [result.task, ...prev]);
      showToast(
        result.source === 'supabase'
          ? 'Tarefa criada e salva no Supabase!'
          : 'Tarefa criada localmente. Conecte o Supabase para sincronizar em nuvem.'
      );
    }
  };

  // Handle status change (Drag & Drop or quick change)
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
    );

    if (selectedTaskForDetail && selectedTaskForDetail.id === taskId) {
      setSelectedTaskForDetail({
        ...selectedTaskForDetail,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
    }

    const res = await updateTask(taskId, { status: newStatus });
    if (!res.success) {
      showToast(`Erro ao atualizar status: ${res.error}`, 'error');
      // Revert if error
      loadTasksData();
    } else {
      showToast(`Status atualizado para "${newStatus}"!`);
    }
  };

  // Handle deletion
  const handleDeleteTask = async (taskId: string) => {
    const res = await deleteTask(taskId);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Tarefa excluída com sucesso.');
    } else {
      showToast(`Erro ao excluir: ${res.error}`, 'error');
    }
  };

  const handleOpenNewTaskWithStatus = (status: TaskStatus) => {
    setTaskToEdit(null);
    setDefaultStatusForNew(status);
    setIsTaskModalOpen(true);
  };

  // Calculations for dashboard
  const totalTasksCount = tasks.length;
  const notStartedCount = tasks.filter((t) => t.status === 'Não iniciado').length;
  const inProgressCount = tasks.filter((t) => t.status === 'Em Andamento').length;
  const finishedCount = tasks.filter((t) => t.status === 'Finalizado').length;
  const totalPipelineValue = tasks.reduce((sum, t) => sum + (t.deal_value || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        tasks={tasks}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        onOpenNewTask={() => {
          setTaskToEdit(null);
          setDefaultStatusForNew('Não iniciado');
          setIsTaskModalOpen(true);
        }}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
        supabaseConnected={supabaseConnected}
        totalDealValue={totalPipelineValue}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Supabase Notice Banner */}
        {!supabaseConnected && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-200/60 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0 text-amber-700 dark:text-amber-300">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold">
                  Conecte seu banco de dados Supabase
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  O sistema está pronto para salvar suas tarefas no Supabase. Clique para inserir sua URL e Chave Anon ou visualizar o script SQL da tabela.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-center flex-shrink-0 shadow-sm"
            >
              Configurar Supabase
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total de Tarefas</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {totalTasksCount}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Não iniciado</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {notStartedCount}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Em Andamento</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {inProgressCount}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pipeline Oportunidades</p>
              <h3 className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Header & Filter info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Quadro Kanban
            </h2>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Atualizar tarefas"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {(searchTerm || priorityFilter !== 'all') && (
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Exibindo {filteredTasks.length} de {tasks.length} tarefas
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setDefaultStatusForNew('Não iniciado');
                setIsTaskModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Tarefa
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500">Carregando tarefas do CRM...</p>
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onSelectTask={(task) => setSelectedTaskForDetail(task)}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onAddTaskInStatus={handleOpenNewTaskWithStatus}
          />
        )}
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={handleSaveTask}
        initialTask={taskToEdit}
        defaultStatus={defaultStatusForNew}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={Boolean(selectedTaskForDetail)}
        onClose={() => setSelectedTaskForDetail(null)}
        onEdit={(task) => {
          setSelectedTaskForDetail(null);
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
      />

      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectionSuccess={() => {
          verifySupabase();
          loadTasksData();
          showToast('Conectado ao Supabase com sucesso!');
        }}
      />
    </div>
  );
}
