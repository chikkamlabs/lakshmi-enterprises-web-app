import { supabase } from './supabase';

export interface Group {
  id: string;
  group_id: string;
  group_name: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all groups directly from Supabase `groups` table.
 */
export async function getStoredGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching groups:', error.message);
      return [];
    }

    return (data as Group[]) || [];
  } catch (err) {
    console.error('Error fetching groups from Supabase:', err);
    return [];
  }
}

/**
 * Fetch a single group by ID or group_id.
 */
export async function getGroupById(id: string): Promise<Group | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .or(`id.eq.${id},group_id.eq.${id}`)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching group by ID:', error.message);
      return null;
    }
    return (data as Group) || null;
  } catch (err) {
    console.error('Failed to fetch group by ID from Supabase:', err);
    return null;
  }
}

/**
 * Generate next group_id auto-filled (e.g. group-101, group-102, ... based on group-101+count).
 */
export function getNextGroupId(groups: Group[]): string {
  if (!groups || groups.length === 0) {
    return 'group-101';
  }

  let maxNum = 100;
  for (const g of groups) {
    if (g.group_id) {
      const match = g.group_id.match(/group-(\d+)/i);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
  }

  if (maxNum >= 101) {
    return `group-${maxNum + 1}`;
  }

  return `group-${101 + groups.length}`;
}

/**
 * Add a new group to Supabase `groups` table.
 */
export async function createGroup(groupData: {
  group_id: string;
  group_name: string;
}): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert([
        {
          group_id: groupData.group_id.trim(),
          group_name: groupData.group_name.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting group:', error.message);
      throw new Error(error.message);
    }

    return data as Group;
  } catch (err) {
    console.error('Failed to insert group into Supabase:', err);
    throw err;
  }
}

/**
 * Update group name only in Supabase `groups` table.
 */
export async function updateGroupName(
  id: string,
  group_name: string
): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update({
        group_name: group_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating group name:', error.message);
      throw new Error(error.message);
    }

    return data as Group;
  } catch (err) {
    console.error('Failed to update group name in Supabase:', err);
    throw err;
  }
}

/**
 * Delete a group from Supabase `groups` table.
 */
export async function deleteGroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) {
      console.error('Supabase error deleting group:', error.message);
      throw new Error(error.message);
    }
    return true;
  } catch (err) {
    console.error('Failed to delete group from Supabase:', err);
    throw err;
  }
}
