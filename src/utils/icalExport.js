import { createEvents } from 'ics';

// ✅ Escape per caratteri speciali iCal
const escapeICalText = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

export const exportToICS = (shifts, companies) => {
  const events = shifts.map(shift => {
    // ✅ Trova il nome della società
    const company = companies?.find(c => c.id === shift.company_id);
    const companyName = company?.name || 'Società non specificata';
    
    return {
      title: escapeICalText(`${shift.role} - ${shift.facility}`),
      description: escapeICalText(`Società: ${companyName}\nRuolo: ${shift.role}\nPausa: ${shift.break_duration || 0} min`),
      start: [
        shift.start_time.getFullYear(),
        shift.start_time.getMonth() + 1,
        shift.start_time.getDate(),
        shift.start_time.getHours(),
        shift.start_time.getMinutes()
      ],
      end: [
        shift.end_time.getFullYear(),
        shift.end_time.getMonth() + 1,
        shift.end_time.getDate(),
        shift.end_time.getHours(),
        shift.end_time.getMinutes()
      ],
      location: escapeICalText(shift.facility || ''),
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      alarms: [
        { action: 'display', trigger: { hours: 1, before: true } }
      ]
    };
  });

  const { error, value } = createEvents(events);
  
  if (error) {
    console.error('Errore creazione iCal:', error);
    return null;
  }

  return value;
};

export const downloadICS = (shifts, companies, filename = 'turni-piscina.ics') => {
  const icsContent = exportToICS(shifts, companies);
  
  if (!icsContent) {
    console.error('Impossibile generare file iCal');
    return;
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
};
