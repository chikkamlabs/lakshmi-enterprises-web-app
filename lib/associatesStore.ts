import { supabase } from './supabase';

export interface Associate {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'associate';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'lakshmi_associates_data';

const initialAssociates: Associate[] = [
  {
    id: 'assoc-1',
    name: 'Rajesh Sharma',
    email: 'rajesh.associate@lakshmi.com',
    mobile: '9876543210',
    role: 'associate',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'assoc-2',
    name: 'Suresh Kumar',
    email: 'suresh.associate@lakshmi.com',
    mobile: '9876543211',
    role: 'associate',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

/**
 * Fetch all associates from Supabase `profiles` table (role = 'associate'),
 * with local fallback if table is empty or offline.
 */
export async function getStoredAssociates(): Promise<Associate[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'associate')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Associate[];
    }
  } catch (err) {
    console.warn('Could not fetch profiles from Supabase, checking local fallback:', err);
  }

  // Fallback to localStorage or default sample associates
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Failed parsing local associates:', e);
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialAssociates));
  }

  return initialAssociates;
}

/**
 * Add a new associate to Supabase `profiles` and Auth.
 */
export async function addAssociate(newAssoc: {
  name: string;
  mobile: string;
  email: string;
  password?: string;
}): Promise<Associate> {
  let createdId = `assoc-${Date.now()}`;

  // Try creating via Supabase Auth signup if available
  if (newAssoc.password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAssoc.email,
        password: newAssoc.password,
        options: {
          data: {
            name: newAssoc.name,
            mobile: newAssoc.mobile,
            role: 'associate',
          },
        },
      });

      if (!authError && authData.user) {
        createdId = authData.user.id;
      }
    } catch (e) {
      console.warn('Supabase auth signup attempt warning:', e);
    }
  }

  const record: Associate = {
    id: createdId,
    name: newAssoc.name,
    email: newAssoc.email,
    mobile: newAssoc.mobile,
    role: 'associate',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Insert into profiles table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([
        {
          id: record.id,
          name: record.name,
          email: record.email,
          mobile: record.mobile,
          role: 'associate',
          status: 'active',
          updated_at: record.updated_at,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      // Sync local storage as well
      saveToLocalStorage(data as Associate);
      return data as Associate;
    }
  } catch (err) {
    console.warn('Failed inserting profile to Supabase, saving locally:', err);
  }

  // Local sync
  saveToLocalStorage(record);
  return record;
}

/**
 * Get associate by ID from Supabase profiles or local storage fallback.
 */
export async function getAssociateById(id: string): Promise<Associate | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as Associate;
    }
  } catch (err) {
    console.warn('Error fetching associate by ID from Supabase:', err);
  }

  const all = await getStoredAssociates();
  return all.find((a) => a.id === id || a.email === id) || null;
}

/**
 * Update associate profile in Supabase and local storage.
 */
export async function updateAssociate(
  id: string,
  updates: {
    name: string;
    mobile: string;
    email?: string;
    status?: 'active' | 'inactive';
  }
): Promise<Associate | null> {
  const updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        mobile: updates.mobile,
        status: updates.status || 'active',
        updated_at,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      updateInLocalStorage(data as Associate);
      return data as Associate;
    }
  } catch (err) {
    console.warn('Failed updating associate in Supabase, using local fallback:', err);
  }

  // Local fallback
  const existing = await getAssociateById(id);
  if (existing) {
    const updated: Associate = {
      ...existing,
      name: updates.name,
      mobile: updates.mobile,
      email: updates.email || existing.email,
      status: updates.status || existing.status || 'active',
      updated_at,
    };
    updateInLocalStorage(updated);
    return updated;
  }

  return null;
}

function updateInLocalStorage(assoc: Associate) {
  if (typeof window === 'undefined') return;
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: Associate[] = localStr ? JSON.parse(localStr) : [...initialAssociates];
    const index = list.findIndex((a) => a.id === assoc.id);
    if (index !== -1) {
      list[index] = assoc;
    } else {
      list.unshift(assoc);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }
}

function saveToLocalStorage(assoc: Associate) {
  if (typeof window === 'undefined') return;
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: Associate[] = localStr ? JSON.parse(localStr) : [...initialAssociates];
    // filter existing if updating
    list = list.filter((a) => a.id !== assoc.id && a.email !== assoc.email);
    list.unshift(assoc);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }
}
