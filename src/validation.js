export function text(value, max) {
 if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw Error(`Enter between 1 and ${max} characters.`);
 return value.trim();
}
export function deadline(value) {
 if (!value) return '';
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw Error('Choose a valid deadline.');
 return value;
}
export function today() {
 const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function deadlineLabel(date, done=false) {
 if(!date)return 'No deadline';
 const formatted=new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 return `${!done&&date<today()?'Overdue · ':date===today()?'Today · ':''}${formatted}`;
}
