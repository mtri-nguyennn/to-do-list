// A list refresh must never keep the submission dialog or its button busy.
export async function saveForm({form,button,message,save,refresh,slowAfter=10000}) {
 const label=button.textContent;
 button.disabled=true;button.textContent='Saving…';message.textContent='';
 const timer=setTimeout(()=>{message.textContent='Still waiting for confirmation. Keep this tab open; do not submit again.';},slowAfter);
 try{
  await save();
  form.reset();
  form.closest('dialog')?.close();
 }finally{
  clearTimeout(timer);message.textContent='';button.disabled=false;button.textContent=label;
 }
 // refresh handles its own errors. The confirmed write is already complete.
 void refresh();
}
