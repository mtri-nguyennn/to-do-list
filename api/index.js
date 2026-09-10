// Retired shared-workspace endpoint. Never expose the old database after migrating.
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 return res.status(410).json({error:'The shared workspace API has been retired. Sign in to your individual account.'});
}
