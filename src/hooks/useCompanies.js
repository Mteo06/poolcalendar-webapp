import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const getDefaultMilanosport = () => {
  const custom = localStorage.getItem('milanosport_custom');
  const isActive = localStorage.getItem('milanosport_active') !== 'false';
  
  const defaults = {
    roles: {
      AB: { hourly_rate: 10.67 },
      Accoglienza: { hourly_rate: 10.67 },
      Istruttore: { hourly_rate: 12.00 },
      Reception: { hourly_rate: 10.67 }
    },
    facilities: [
      'Piscina Argelati',
      'Piscina Bacone',
      'Piscina Cambini Fossati',
      'Piscina Cardellino',
      'Piscina Carella - Cantù',
      'Piscina Cozzi',
      'Piscina De Marchi',
      'Piscina Iseo',
      'Piscina Mincio',
      'Piscina Murat',
      'Piscina Parri Menegoni',
      'Piscina Procida',
      'Piscina Quarto Cagnino',
      'Piscina Romano',
      'Piscina Sant Abbondio',
      'Piscina Solari',
      'Piscina Suzzani'
    ]
  };

  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      return {
        id: 'milanosport',
        name: 'Milanosport',
        user_id: null,
        is_default: true,
        is_active: isActive,
        roles: parsed.roles || defaults.roles,
        facilities: parsed.facilities || defaults.facilities
      };
    } catch (e) {
      console.error('Error parsing custom Milanosport:', e);
    }
  }

  return {
    id: 'milanosport',
    name: 'Milanosport',
    user_id: null,
    is_default: true,
    is_active: isActive,
    ...defaults
  };
};

export const useCompanies = (userId) => {
  const [companies, setCompanies] = useState([getDefaultMilanosport()]);
  const [activeCompanies, setActiveCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCompanies();
    }
  }, [userId]);

  useEffect(() => {
    // Aggiorna società attive
    const active = companies.filter(c => c.is_active);
    setActiveCompanies(active);
  }, [companies]);

  const fetchCompanies = async () => {
    setLoading(true);
    
    const { data: userCompanies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);

    if (!error && userCompanies) {
      const milanosport = getDefaultMilanosport();
      const allCompanies = [milanosport, ...userCompanies];
      setCompanies(allCompanies);
    } else {
      const milanosport = getDefaultMilanosport();
      setCompanies([milanosport]);
    }

    setLoading(false);
  };

  const addCompany = async (companyData) => {
    const { data, error } = await supabase
      .from('companies')
      .insert([{ 
        ...companyData, 
        user_id: userId,
        is_active: true 
      }])
      .select();

    if (!error) {
      await fetchCompanies();
      return { success: true, data };
    }
    return { success: false, error: error?.message };
  };

  const updateCompany = async (companyId, updates) => {
    // Se è Milanosport, salva in localStorage
    if (companyId === 'milanosport') {
      const current = localStorage.getItem('milanosport_custom');
      const parsed = current ? JSON.parse(current) : {};
      
      localStorage.setItem('milanosport_custom', JSON.stringify({
        ...parsed,
        ...updates
      }));
      
      await fetchCompanies();
      return { success: true };
    }

    // Società custom
    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId);

    if (!error) {
      await fetchCompanies();
    }
    return { success: !error, error: error?.message };
  };

  const deleteCompany = async (companyId) => {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (!error) {
      await fetchCompanies();
    }
    return { success: !error, error: error?.message };
  };

  const toggleCompanyActive = async (companyId) => {
    // Se è Milanosport
    if (companyId === 'milanosport') {
      const current = companies.find(c => c.id === 'milanosport');
      const newActive = !current.is_active;
      localStorage.setItem('milanosport_active', newActive.toString());
      await fetchCompanies();
      return { success: true };
    }

    // Società custom
    const company = companies.find(c => c.id === companyId);
    if (!company) return { success: false };

    const { error } = await supabase
      .from('companies')
      .update({ is_active: !company.is_active })
      .eq('id', companyId);

    if (!error) {
      await fetchCompanies();
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const getCompanyById = (companyId) => {
    return companies.find(c => c.id === companyId);
  };

  return {
    companies,
    activeCompanies,
    loading,
    addCompany,
    updateCompany,
    deleteCompany,
    toggleCompanyActive,
    getCompanyById,
    refreshCompanies: fetchCompanies
  };
};
