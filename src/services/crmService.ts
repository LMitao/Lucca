import { Task, TaskStatus } from '../types/crm';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'crm_kanban_tasks_v1';

export function getLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler tarefas locais:', err);
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Erro ao salvar tarefas locais:', err);
  }
}

export async function fetchTasks(): Promise<{ tasks: Task[]; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar do Supabase, utilizando dados locais:', error.message);
        return {
          tasks: getLocalTasks(),
          source: 'local',
          error: error.message,
        };
      }

      const tasks: Task[] = (data || []).map((row: any) => ({
        id: String(row.id),
        title: row.title || '',
        description: row.description || '',
        status: (row.status as TaskStatus) || 'Não iniciado',
        priority: row.priority || 'Média',
        deal_value: Number(row.deal_value || 0),
        contact_name: row.contact_name || '',
        contact_email: row.contact_email || '',
        contact_phone: row.contact_phone || '',
        company_name: row.company_name || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        due_date: row.due_date || null,
        position: Number(row.position || 0),
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      // Cache locally as fallback
      saveLocalTasks(tasks);

      return { tasks, source: 'supabase' };
    } catch (err: any) {
      console.warn('Exceção ao buscar do Supabase:', err);
      return {
        tasks: getLocalTasks(),
        source: 'local',
        error: err.message,
      };
    }
  }

  return {
    tasks: getLocalTasks(),
    source: 'local',
  };
}

export async function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<{ task: Task; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const payload = {
        title: taskData.title.trim(),
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        deal_value: taskData.deal_value || 0,
        contact_name: taskData.contact_name || '',
        contact_email: taskData.contact_email || '',
        contact_phone: taskData.contact_phone || '',
        company_name: taskData.company_name || '',
        tags: taskData.tags || [],
        due_date: taskData.due_date || null,
        position: taskData.position || 0,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const created: Task = {
        id: String(data.id),
        title: data.title,
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        deal_value: Number(data.deal_value || 0),
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        company_name: data.company_name || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        due_date: data.due_date || null,
        position: Number(data.position || 0),
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      const localTasks = getLocalTasks();
      saveLocalTasks([created, ...localTasks]);

      return { task: created, source: 'supabase' };
    } catch (err: any) {
      console.error('Falha ao salvar no Supabase, salvando localmente:', err);
      // Fallback local
      const fallbackTask: Task = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
        ...taskData,
        created_at: now,
        updated_at: now,
      };
      const localTasks = getLocalTasks();
      saveLocalTasks([fallbackTask, ...localTasks]);
      return { task: fallbackTask, source: 'local', error: err.message };
    }
  }

  // Local storage only
  const localTask: Task = {
    id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
    ...taskData,
    created_at: now,
    updated_at: now,
  };
  const localTasks = getLocalTasks();
  saveLocalTasks([localTask, ...localTasks]);
  return { task: localTask, source: 'local' };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Update in localStorage first for instant responsiveness
  const currentLocal = getLocalTasks();
  const updatedLocal = currentLocal.map((t) =>
    t.id === id ? { ...t, ...updates, updated_at: now } : t
  );
  saveLocalTasks(updatedLocal);

  if (supabase) {
    try {
      const payload: any = {
        updated_at: now,
      };

      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.deal_value !== undefined) payload.deal_value = updates.deal_value;
      if (updates.contact_name !== undefined) payload.contact_name = updates.contact_name;
      if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email;
      if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone;
      if (updates.company_name !== undefined) payload.company_name = updates.company_name;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date;
      if (updates.position !== undefined) payload.position = updates.position;

      const { error } = await supabase.from('tasks').update(payload).eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const currentLocal = getLocalTasks();
  const filtered = currentLocal.filter((t) => t.id !== id);
  saveLocalTasks(filtered);

  if (supabase) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

export async function migrateLocalTasksToSupabase(): Promise<{ count: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { count: 0, error: 'Supabase não está configurado.' };
  }

  const localTasks = getLocalTasks();
  if (localTasks.length === 0) {
    return { count: 0 };
  }

  try {
    const payload = localTasks.map((task) => ({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deal_value: task.deal_value || 0,
      contact_name: task.contact_name || '',
      contact_email: task.contact_email || '',
      contact_phone: task.contact_phone || '',
      company_name: task.company_name || '',
      tags: task.tags || [],
      due_date: task.due_date || null,
      position: task.position || 0,
    }));

    const { data, error } = await supabase.from('tasks').insert(payload).select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data ? data.length : payload.length };
  } catch (err: any) {
    return { count: 0, error: err.message };
  }
}
