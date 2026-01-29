import { createEvents } from 'ics';

export const exportToICS = (shifts) => {
  const events = shifts.map(shift => ({
    title: `${shift.role} - ${shift.facility}`,
    description: `Società: ${shift.company_id}\nPausa: ${shift.break_duration} min`,
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
    location: shift.facility,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    alarms: [
      { action: 'display', trigger: { hours: 1, before: true } }
    ]
  }));

  const { error, value } = createEvents(events);
  
  if (error) {
    console.error(error);
    return null;
  }

  return value;
};

export const downloadICS = (shifts, filename = 'turni-piscina.ics') => {
  const icsContent = exportToICS(shifts);
  if (!icsContent) return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
