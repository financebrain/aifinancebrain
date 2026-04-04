import supabase from './supabase.js'
 
export async function getUserContext(userId) {
  if (!userId) return ''
  try {
    const [profileRes, holdingsRes] = await Promise.all([
      supabase.from('profiles')
        .select('full_name,risk_tolerance,investment_goal,experience_level')
        .eq('id', userId).single(),
      supabase.from('holdings')
        .select('name,symbol,quantity,avg_buy_price,asset_type')
        .eq('user_id', userId)
    ])
 
    const p = profileRes.data
    const h = holdingsRes.data || []
 
    if (!p) return ''
 
    const holdingsSummary = h.length > 0
      ? h.map(x => `${x.name} (${x.symbol}): ${x.quantity} units`).join(', ')
      : 'No holdings added yet'
 
    return `
PERSONALISATION CONTEXT — IMPORTANT:
Investor: ${p.full_name}
Risk Tolerance: ${p.risk_tolerance}
Investment Goal: ${p.investment_goal}
Experience Level: ${p.experience_level}
Current Holdings: ${holdingsSummary}
 
Tailor your analysis specifically for this investor.
Conservative investor → emphasise capital protection, low-risk options.
Aggressive investor → highlight growth opportunities, sector momentum.
Beginner → explain clearly without jargon.
Experienced → can use technical terms and deeper analysis.
If they hold specific stocks → mention how today's signals affect those holdings.`
  } catch(e) {
    console.log('User context error:', e.message)
    return ''
  }
}
 
