export const SLOT_LABELS = [
  '08:00–08:50',
  '08:50–09:40',
  '09:45–10:35',
  '10:40–11:30',
  '11:35–12:25',
  '12:30–01:20',
  '01:25–02:15',
  '02:20–03:10',
  '03:10–04:00',
  '04:00–04:50'
];

export const DAY_LABELS = [
  'Day 1',
  'Day 2', 
  'Day 3',
  'Day 4',
  'Day 5'
];

export const validateEmail = (email) => {
  return /^[A-Za-z0-9._%+-]+@srmist\.edu\.in$/.test(email);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString();
};
