import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useShifts = (userId) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchShifts();
    } else {
      setShifts([]);
      setLoading(false);
    }
  }, [userId]);

  const fetchShifts = async () => {
    if (!userId) {
      console.log('No userId provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching shifts for user:', userId);

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching shifts:', error);
        setShifts([]);
      } else {
        console.log('Shifts fetched:', data);
        const formattedShifts = (data || []).map(s => ({
          ...s,
          start_time: new Date(s.start_time),
          end_time: new Date(s.end_time)
        }));
        setShifts(formattedShifts);
      }
    } catch (err) {
      console.error('Exception fetching shifts:', err);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const addShift = async (shiftData) => {
    if (!userId) {
      console.error('No userId for adding shift');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('Adding shift:', shiftData);

      const { data, error } = await supabase
        .from('shifts')
        .insert([{ 
          ...shiftData, 
          user_id: userId 
        }])
        .select();

      if (error) {
        console.error('Error adding shift:', error);
        return { success: false, error: error.message };
      }

      console.log('Shift added successfully:', data);
      await fetchShifts();
      return { success: true, data };
    } catch (err) {
      console.error('Exception adding shift:', err);
      return { success: false, error: err.message };
    }
  };

  const updateShift = async (shiftId, updates) => {
    try {
      console.log('Updating shift:', shiftId, updates);

      const { error } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', shiftId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating shift:', error);
        return { success: false, error: error.message };
      }

      console.log('Shift updated successfully');
      await fetchShifts();
      return { success: true };
    } catch (err) {
      console.error('Exception updating shift:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteShift = async (shiftId) => {
    try {
      console.log('Deleting shift:', shiftId);

      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting shift:', error);
        return { success: false, error: error.message };
      }

      console.log('Shift deleted successfully');
      await fetchShifts();
      return { success: true };
    } catch (err) {
      console.error('Exception deleting shift:', err);
      return { success: false, error: err.message };
    }
  };

  return { 
    shifts, 
    loading, 
    addShift, 
    updateShift, 
    deleteShift, 
    refreshShifts: fetchShifts 
  };
};
