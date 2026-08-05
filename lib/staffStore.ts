import { supabase } from './supabase';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'staff';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'lakshmi_staff_data';

const initialStaff: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Venkatesh Rao',
    email: 'venkatesh.staff@lakshmi.com',
    mobile: '9123456780',
    role: 'staff',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'staff-2',
    name: 'Priya Verma',
    email: 'priya.staff@lakshmi.com',
    mobile: '9123456781',
    role: 'staff',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

/**
 * Fetch all staff members from Supabase `profiles` table (role = 'staff'),
 * with local fallback if table is empty or offline.
 */
export async function getStoredStaff(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as StaffMember[];
    }
  } catch (err) {
    console.warn('Could not fetch staff profiles from Supabase, checking local fallback:', err);
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Failed parsing local staff:', e);
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialStaff));
  }

  return initialStaff;
}

/**
 * Add a new staff member to Supabase `profiles` and Auth.
 */
export async function addStaffMember(newStaff: {
  name: string;
  mobile: string;
  email: string;
  password?: string;
}): Promise<StaffMember> {
  let createdId = `staff-${Date.now()}`;

  if (newStaff.password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: newStaff.password,
        options: {
          data: {
            name: newStaff.name,
            mobile: newStaff.mobile,
            role: 'staff',
          },
        },
      });

      if (!authError && authData.user) {
        createdId = authData.user.id;
      }
    } catch (e) {
      console.warn('Supabase auth signup attempt warning for staff:', e);
    }
  }

  const record: StaffMember = {
    id: createdId,
    name: newStaff.name,
    email: newStaff.email,
    mobile: newStaff.mobile,
    role: 'staff',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([
        {
          id: record.id,
          name: record.name,
          email: record.email,
          mobile: record.mobile,
          role: 'staff',
          status: 'active',
          updated_at: record.updated_at,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      saveToLocalStorage(data as StaffMember);
      return data as StaffMember;
    }
  } catch (err) {
    console.warn('Failed inserting staff profile to Supabase, saving locally:', err);
  }

  saveToLocalStorage(record);
  return record;
}

/**
 * Get staff member by ID from Supabase profiles or local storage fallback.
 */
export async function getStaffById(id: string): Promise<StaffMember | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as StaffMember;
    }
  } catch (err) {
    console.warn('Error fetching staff member by ID from Supabase:', err);
  }

  const all = await getStoredStaff();
  return all.find((s) => s.id === id || s.email === id) || null;
}

/**
 * Update staff member profile in Supabase and local storage.
 */
export async function updateStaffMember(
  id: string,
  updates: {
    name: string;
    mobile: string;
    email?: string;
    status?: 'active' | 'inactive';
  }
): Promise<StaffMember | null> {
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
      updateInLocalStorage(data as StaffMember);
      return data as StaffMember;
    }
  } catch (err) {
    console.warn('Failed updating staff in Supabase, using local fallback:', err);
  }

  // Local fallback
  const existing = await getStaffById(id);
  if (existing) {
    const updated: StaffMember = {
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

function updateInLocalStorage(staffItem: StaffMember) {
  if (typeof window === 'undefined') return;
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: StaffMember[] = localStr ? JSON.parse(localStr) : [...initialStaff];
    const index = list.findIndex((s) => s.id === staffItem.id);
    if (index !== -1) {
      list[index] = staffItem;
    } else {
      list.unshift(staffItem);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save staff to local storage:', err);
  }
}

function saveToLocalStorage(staffItem: StaffMember) {
  if (typeof window === 'undefined') return;
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: StaffMember[] = localStr ? JSON.parse(localStr) : [...initialStaff];
    list = list.filter((s) => s.id !== staffItem.id && s.email !== staffItem.email);
    list.unshift(staffItem);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save staff to local storage:', err);
  }
}
