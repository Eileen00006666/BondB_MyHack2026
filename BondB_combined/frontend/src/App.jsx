import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { AlertCircle, RotateCcw, Send, Sparkles } from "lucide-react"
import { analyzeRelationship } from "./api"


// ─── COLOUR TOKENS (blue/white replacing original dark navy) ─────────────────
// Original var(--navy)  → #F0F6FD  (page bg)
// Original var(--navy2) → #fff     (nav / drawers)
// Original var(--navy3) → #fff     (cards)
// Original var(--navy4) → #E6F1FB  (inner boxes)
// Original var(--border)  → #B5D4F4
// Original var(--border2) → #85B7EB
// Original var(--border3) → #378ADD
// Original var(--blue2/3/4) → kept as accent blues
// Original var(--t1) → #042C53   (primary text)
// Original var(--t2) → #185FA5   (secondary text)
// Original var(--t3) → #85B7EB   (muted text)
// Greens, purples, reds, ambers stay the same (semantic)

const G_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}

:root{
  --navy:#F0F6FD; --navy2:#ffffff; --navy3:#ffffff; --navy4:#E6F1FB;
  --border:#B5D4F4; --border2:#85B7EB; --border3:#378ADD;
  --blue:#1a56db; --blue2:#2563eb; --blue3:#3b82f6; --blue4:#378ADD; --blue5:#B5D4F4;
  --green:#047857; --green2:#059669; --green3:#10b981; --green4:#34d399;
  --purple:#6d28d9; --purple2:#7c3aed; --purple3:#8b5cf6; --purple4:#a78bfa;
  --orange:#d97706; --orange2:#f59e0b; --orange3:#fbbf24;
  --red:#dc2626; --red2:#ef4444; --red3:#fca5a5;
  --cyan:#0891b2; --cyan2:#06b6d4; --cyan3:#67e8f9;
  --t1:#042C53; --t2:#185FA5; --t3:#85B7EB;
}

body{background:var(--navy);color:var(--t1);font-family:'DM Sans',sans-serif;font-size:13px;min-height:100vh;-webkit-font-smoothing:antialiased}
.font-display{font-family:'Syne',sans-serif}
.font-mono{font-family:'IBM Plex Mono',monospace}

::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:var(--navy2)}
::-webkit-scrollbar-thumb{background:var(--border3);border-radius:2px}

@keyframes borderGlow{0%,100%{opacity:.5}50%{opacity:1}}
.glow-border{animation:borderGlow 3s ease-in-out infinite}

@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.drawer-enter{animation:slideIn .22s cubic-bezier(.4,0,.2,1) forwards}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp .3s ease forwards}

.stagger-1{animation-delay:.05s;opacity:0}
.stagger-2{animation-delay:.1s;opacity:0}
.stagger-3{animation-delay:.15s;opacity:0}
.stagger-4{animation-delay:.2s;opacity:0}

.bar-fill{transition:width .8s cubic-bezier(.4,0,.2,1)}

@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .7s linear infinite}

@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.pulse-dot{animation:pulse 2s ease-in-out infinite}

.vertex-demo-grid{display:grid;grid-template-columns:minmax(320px,.95fr) minmax(360px,1.05fr);gap:18px;align-items:start}
.vertex-score-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
@media (max-width: 860px){
  .vertex-demo-grid{grid-template-columns:1fr}
  .vertex-score-grid{grid-template-columns:repeat(2,1fr)}
}
@media (max-width: 520px){
  .vertex-score-grid{grid-template-columns:1fr}
}
`

// ─── DATA (verbatim from data.jsx) ───────────────────────────────────────────
const PROGRAMMES = [
  { id:'p1', name:'Cradle CIP Tier 1 2024',  country:'Malaysia', status:'Active',    cohort:'Cohort 12', startDate:'Jan 2024', endDate:'Dec 2024', companies:8,  mentors:6,  partners:4, description:'Pre-seed commercialisation grant for early-stage tech startups.' },
  { id:'p2', name:'MDEC Global Accelerator', country:'Malaysia', status:'Active',    cohort:'Batch 3',   startDate:'Mar 2024', endDate:'Sep 2024', companies:12, mentors:9,  partners:6, description:'Export-readiness programme for Malaysian digital companies targeting ASEAN.' },
  { id:'p3', name:'MaGIC Accelerate MY',     country:'Malaysia', status:'Completed', cohort:'Cohort 5',  startDate:'Jan 2023', endDate:'Jun 2023', companies:10, mentors:8,  partners:5, description:'Social enterprise acceleration with impact measurement focus.' },
  { id:'p4', name:'Cradle CIP Tier 1 2025',  country:'Malaysia', status:'Draft',     cohort:'Cohort 13', startDate:'Jan 2025', endDate:'Dec 2025', companies:0,  mentors:0,  partners:0, description:'Next cycle of the CIP programme - setup in progress.' },
]
const ACTORS = [
  { id:'a1',  name:'NexaTech Solutions',  type:'Company',         sector:'AI/ML',      stage:'Seed',      location:'Kuala Lumpur', avatar:'NT', color:'#3b82f6', expertise:['Machine Learning','Computer Vision','API Development'], bio:'AI-powered predictive analytics for SME supply chains.', programmes:['p1','p3'] },
  { id:'a2',  name:'GreenLoop Systems',   type:'Company',         sector:'CleanTech',  stage:'Pre-Seed',  location:'Penang',       avatar:'GL', color:'#10b981', expertise:['IoT','Sustainability','Hardware'], bio:'Smart waste management using IoT sensor networks.', programmes:['p1'] },
  { id:'a3',  name:'HealthBridge MY',     type:'Company',         sector:'HealthTech', stage:'Series A',  location:'Kuala Lumpur', avatar:'HB', color:'#8b5cf6', expertise:['Telemedicine','Data Privacy','B2B SaaS'], bio:'Rural telehealth platform serving underserved communities.', programmes:['p2','p3'] },
  { id:'a4',  name:'EduForward',          type:'Company',         sector:'EdTech',     stage:'Seed',      location:'Johor Bahru',  avatar:'EF', color:'#f59e0b', expertise:['LLMs','Personalisation','Mobile'], bio:'Adaptive learning platform for B40 students.', programmes:['p2'] },
  { id:'a5',  name:'PayLinkAsia',         type:'Company',         sector:'FinTech',    stage:'Pre-Seed',  location:'Kuala Lumpur', avatar:'PL', color:'#06b6d4', expertise:['Payments','Blockchain','RegTech'], bio:'Cross-border micro-payment rails for gig workers.', programmes:['p1','p2'] },
  { id:'a6',  name:'Dr. Amirah Zulkifli', type:'Mentor',          sector:'AI/ML',      stage:null,        location:'Kuala Lumpur', avatar:'AZ', color:'#a78bfa', expertise:['Deep Learning','Research Commercialisation','Product Strategy'], bio:'Former CTO of a Series B AI startup, now VC-backed advisor.', programmes:['p1','p2'] },
  { id:'a7',  name:'Raj Krishnamurthy',   type:'Mentor',          sector:'FinTech',    stage:null,        location:'Remote',       avatar:'RK', color:'#34d399', expertise:['Fundraising','ASEAN Expansion','FinReg'], bio:'Ex-Grab Payments lead with 3 successful exits.', programmes:['p1','p3'] },
  { id:'a8',  name:'Priya Menon',         type:'Mentor',          sector:'HealthTech', stage:null,        location:'Kuala Lumpur', avatar:'PM', color:'#f87171', expertise:['Clinical Validation','GTM Strategy','Impact Measurement'], bio:'Public health specialist turned startup advisor.', programmes:['p2','p3'] },
  { id:'a9',  name:'Daniel Tan',          type:'Mentor',          sector:'EdTech',     stage:null,        location:'Penang',       avatar:'DT', color:'#fbbf24', expertise:['Curriculum Design','B2G Sales','Localisation'], bio:'Built and sold an edtech company to a listed firm.', programmes:['p1','p2'] },
  { id:'a10', name:'AWS Activate',        type:'Partner',         sector:'Cloud',      stage:null,        location:'Global',       avatar:'AW', color:'#f97316', expertise:['Cloud Credits','Technical Support','GTM'], bio:'Provides cloud infrastructure credits and technical mentorship.', programmes:['p1','p2','p3'] },
  { id:'a11', name:'Cradle Fund',         type:'Partner',         sector:'Finance',    stage:null,        location:'Kuala Lumpur', avatar:'CF', color:'#60a5fa', expertise:['Grant Funding','Policy Advisory','Network Access'], bio:'Malaysian government fund for early-stage technology commercialisation.', programmes:['p1','p3'] },
  { id:'a12', name:'Google for Startups', type:'Partner',         sector:'Technology', stage:null,        location:'Global',       avatar:'GS', color:'#4ade80', expertise:['Google Cloud','AI Tools','Gemini API'], bio:'Provides Google technology stack and mentorship for startups.', programmes:['p1','p2'] },
  { id:'a13', name:'LegalEase MY',        type:'ServiceProvider', sector:'Legal',      stage:null,        location:'Kuala Lumpur', avatar:'LE', color:'#c084fc', expertise:['IP Protection','Startup Incorporation','Contract Law'], bio:'Startup-specialist law firm with fixed-fee packages.', programmes:['p1','p2'] },
  { id:'a14', name:'DataVault Analytics', type:'ServiceProvider', sector:'Analytics',  stage:null,        location:'Remote',       avatar:'DV', color:'#38bdf8', expertise:['Data Engineering','Dashboard Build','BI'], bio:'Fractional data team for early-stage startups.', programmes:['p2'] },
]
const RELATIONSHIPS = [
  { id:'r1',  fromId:'a6',  toId:'a1',  type:'Mentor↔Company',          programmeId:'p1', status:'Active',   fitScore:91, trustScore:87, outcomeScore:89, reusedFrom:null, sessions:6,    lastEngagement:'2d ago',  outcomes:['Product roadmap refined','Investor intro made'],        aiReasoning:['Deep ML/AI commercialisation expertise overlap','Communication style highly compatible based on 6 session logs','Successfully helped NexaTech close pre-seed round'] },
  { id:'r2',  fromId:'a7',  toId:'a5',  type:'Mentor↔Company',          programmeId:'p1', status:'Active',   fitScore:88, trustScore:82, outcomeScore:85, reusedFrom:'p3', sessions:4,    lastEngagement:'5d ago',  outcomes:['ASEAN expansion strategy drafted'],                     aiReasoning:['FinTech domain alignment is near-perfect','Raj navigated exact ASEAN cross-border payment regulation','Relationship template reused from MaGIC Cohort 5 - 94% confidence'] },
  { id:'r3',  fromId:'a1',  toId:'p1',  type:'Company↔Programme',       programmeId:'p1', status:'Active',   fitScore:85, trustScore:80, outcomeScore:83, reusedFrom:null, sessions:null, lastEngagement:'1d ago',  outcomes:['Milestone 2 completed on schedule'],                   aiReasoning:['NexaTech stage aligns with CIP Tier 1 funding requirements','AI sector programme completion rate historically 87%','Strong founder-programme culture fit score'] },
  { id:'r4',  fromId:'a10', toId:'p1',  type:'Partner↔Programme',       programmeId:'p1', status:'Active',   fitScore:92, trustScore:95, outcomeScore:93, reusedFrom:'p3', sessions:null, lastEngagement:'3d ago',  outcomes:['$25k cloud credits allocated','3 technical workshops delivered'], aiReasoning:['AWS Activate consistent high-value delivery across all previous programmes','Template reused from Cohort 5 - zero reconfiguration needed','Partner KPIs exceeded in 2 prior programmes'] },
  { id:'r5',  fromId:'a8',  toId:'a3',  type:'Mentor↔Company',          programmeId:'p2', status:'Active',   fitScore:94, trustScore:90, outcomeScore:92, reusedFrom:null, sessions:8,    lastEngagement:'1d ago',  outcomes:['Clinical pilot design completed','MOH engagement initiated'], aiReasoning:['Priya clinical validation expertise directly matches HealthBridge needs','Impact measurement alignment: both use WHO SDG framework','Highest engagement frequency in current cohort'] },
  { id:'r6',  fromId:'a9',  toId:'a4',  type:'Mentor↔Company',          programmeId:'p2', status:'At-Risk',  fitScore:58, trustScore:62, outcomeScore:55, reusedFrom:null, sessions:2,    lastEngagement:'3w ago',  outcomes:[],                                                       aiReasoning:['Low session frequency signals disengagement','EduForward pivoted sector mid-programme - mentor expertise gap emerged','Recommend: supplementary mentor pairing or relationship redesign'] },
  { id:'r7',  fromId:'a11', toId:'p1',  type:'Partner↔Programme',       programmeId:'p1', status:'Active',   fitScore:89, trustScore:91, outcomeScore:90, reusedFrom:'p3', sessions:null, lastEngagement:'1w ago',  outcomes:['Grant disbursement on track','Policy brief submitted'],  aiReasoning:['Cradle Fund is founding partner - institutional trust established','Template carried forward with updated disbursement schedule','Compliance score: 100%'] },
  { id:'r8',  fromId:'a13', toId:'a2',  type:'ServiceProvider↔Company', programmeId:'p1', status:'Active',   fitScore:76, trustScore:74, outcomeScore:72, reusedFrom:null, sessions:3,    lastEngagement:'1w ago',  outcomes:['IP filed for sensor array design'],                     aiReasoning:['LegalEase IP specialisation matches hardware startup profile','Fixed-fee model reduces friction for pre-seed budget','Response time SLA met 100%'] },
  { id:'r9',  fromId:'a6',  toId:'a5',  type:'Mentor↔Company',          programmeId:'p2', status:'Active',   fitScore:79, trustScore:76, outcomeScore:77, reusedFrom:'r1', sessions:3,    lastEngagement:'4d ago',  outcomes:['AI stack architecture reviewed'],                       aiReasoning:['Relationship cloned from p1 context - PayLinkAsia AI components','Dr. Amirah cross-domain tech advisory extends to FinTech AI naturally','Reuse confidence score: 82%'] },
  { id:'r10', fromId:'a12', toId:'p2',  type:'Partner↔Programme',       programmeId:'p2', status:'Active',   fitScore:95, trustScore:93, outcomeScore:94, reusedFrom:'p1', sessions:null, lastEngagement:'2d ago',  outcomes:['Gemini API access granted to all 12 companies','Google Cloud workshop completed'], aiReasoning:['Google for Startups primary tech partner for this cohort','All 12 companies onboarded to Google AI Studio','Highest partner satisfaction score across all programmes: 96%'] },
]
const REL_TEMPLATES = [
  { id:'t1', name:'Standard Mentor↔Startup',       type:'Mentor↔Company',          fields:['Domain Alignment','Stage Fit','Availability','Communication Style'], successRate:84, usedCount:24, avgFitScore:86 },
  { id:'t2', name:'Technology Partner↔Programme',  type:'Partner↔Programme',        fields:['Resource Commitment','KPI Agreement','Geographic Reach','Past Performance'], successRate:91, usedCount:12, avgFitScore:92 },
  { id:'t3', name:'Company↔Accelerator Programme', type:'Company↔Programme',        fields:['Stage Alignment','Sector Fit','Founder Commitment','Milestone Readiness'], successRate:79, usedCount:18, avgFitScore:83 },
  { id:'t4', name:'Legal/Finance Service↔Startup', type:'ServiceProvider↔Company',  fields:['Specialisation Match','Pricing Model','Response SLA','Startup Experience'], successRate:88, usedCount:9,  avgFitScore:81 },
]
const ACTOR_TYPES = {
  Company:         { color:'#3b82f6', label:'Company / Startup' },
  Mentor:          { color:'#a78bfa', label:'Mentor' },
  Partner:         { color:'#10b981', label:'Partner' },
  ServiceProvider: { color:'#f59e0b', label:'Service Provider' },
}
const REL_TYPES = ['Mentor↔Company','Company↔Programme','Partner↔Programme','ServiceProvider↔Company']

// ─── GEMINI ───────────────────────────────────────────────────────────────────
async function geminiCall(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.4,maxOutputTokens:500} })
  })
  if (!res.ok) {
    const e = await res.json().catch(()=>({}))
    throw new Error(e?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.'
}

// Legacy Claude helper retained for experiments.
async function anthropicCall(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      model:'claude-sonnet-4-20250514', max_tokens:1000,
      system:`You are RelateAI's ecosystem relationship intelligence engine. You analyse ecosystem actor profiles and return structured JSON relationship assessments. Always respond with ONLY valid JSON, no markdown, no explanation outside the JSON.`,
      messages:[{role:'user',content:prompt}]
    })
  })
  const data = await res.json()
  const text = data.content?.find(b=>b.type==='text')?.text || '{}'
  try { return JSON.parse(text) } catch { return JSON.parse(text.replace(/```json|```/g,'').trim()) }
}

// ─── UI COMPONENTS (recoloured) ───────────────────────────────────────────────
function ScorePill({ score, size='md' }) {
  const color = score>=80?'#059669':score>=65?'#d97706':'#dc2626'
  const bg    = score>=80?'rgba(5,150,105,.12)':score>=65?'rgba(217,119,6,.12)':'rgba(220,38,38,.1)'
  const bdr   = score>=80?'rgba(5,150,105,.3)':score>=65?'rgba(217,119,6,.3)':'rgba(220,38,38,.25)'
  const fs    = size==='sm'?'11px':size==='lg'?'15px':'12px'
  return <span className="font-mono" style={{display:'inline-flex',alignItems:'center',padding:size==='sm'?'2px 7px':'4px 9px',borderRadius:20,background:bg,border:`1px solid ${bdr}`,color,fontSize:fs,fontWeight:700,whiteSpace:'nowrap'}}>{score}%</span>
}
function Avatar({ initials, color, size=32 }) {
  return <div className="font-display" style={{width:size,height:size,borderRadius:'50%',background:color+'28',border:`1px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size<32?'9px':'11px',fontWeight:700,color,flexShrink:0}}>{initials}</div>
}
function Tag({ children, variant='blue' }) {
  const variants = {blue:{bg:'rgba(37,99,235,.12)',color:'#1d4ed8'},green:{bg:'rgba(5,150,105,.1)',color:'#065f46'},purple:{bg:'rgba(124,58,237,.12)',color:'#6d28d9'},orange:{bg:'rgba(217,119,6,.12)',color:'#92400e'},cyan:{bg:'rgba(8,145,178,.1)',color:'#155e75'},gray:{bg:'rgba(100,116,139,.12)',color:'#334155'}}
  const v=variants[variant]||variants.gray
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:'11px',fontWeight:600,background:v.bg,color:v.color,lineHeight:'1.5',marginRight:4}}>{children}</span>
}
function ScoreBar({ value }) {
  const c1=value>=80?'#10b981':value>=65?'#f59e0b':'#ef4444'
  const c2=value>=80?'#06b6d4':value>=65?'#f59e0b':'#dc2626'
  return <div style={{height:4,borderRadius:2,background:'var(--border)',overflow:'hidden',flex:1}}><div className="bar-fill" style={{height:'100%',borderRadius:2,width:`${value}%`,background:`linear-gradient(90deg,${c1},${c2})`}}/></div>
}
function StatCard({ label, value, sub, accentColor='var(--blue2)', delay=0 }) {
  return (
    <div className="fade-up" style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',position:'relative',overflow:'hidden',animationDelay:`${delay}s`,animationFillMode:'forwards'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${accentColor},transparent)`}}/>
      <div style={{fontSize:'11px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6,fontWeight:600}}>{label}</div>
      <div className="font-mono" style={{fontSize:'26px',fontWeight:700,color:'var(--t1)'}}>{value}</div>
      {sub && <div style={{fontSize:'11px',color:'var(--t2)',marginTop:3}}>{sub}</div>}
    </div>
  )
}
function Btn({ children, onClick, variant='primary', size='md', disabled=false, style={} }) {
  const sizes={sm:{padding:'4px 10px',fontSize:'11px'},md:{padding:'7px 14px',fontSize:'12px'},lg:{padding:'10px 20px',fontSize:'13px'}}
  const variants={
    primary:{background:'var(--blue2)',color:'#fff',border:'none'},
    success:{background:'var(--green2)',color:'#fff',border:'none'},
    outline:{background:'transparent',border:'1px solid var(--border3)',color:'var(--t2)'},
    ghost:{background:'transparent',border:'none',color:'var(--t2)'},
    purple:{background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.35)',color:'#7c3aed'},
  }
  return <button disabled={disabled} onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:7,fontFamily:'inherit',fontWeight:600,cursor:disabled?'not-allowed':'pointer',transition:'all .15s',opacity:disabled?.4:1,...sizes[size],...variants[variant],...style}}>{children}</button>
}
function Drawer({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:200,backdropFilter:'blur(2px)'}}/>
      <div className="drawer-enter" style={{position:'fixed',top:0,right:0,width:480,height:'100vh',background:'var(--navy2)',borderLeft:'1px solid var(--border)',zIndex:201,display:'flex',flexDirection:'column',overflowY:'auto'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'var(--navy2)',zIndex:1}}>
          <div className="font-display" style={{fontSize:'14px',fontWeight:700,color:'var(--t1)'}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--t2)',cursor:'pointer',fontSize:'18px',padding:'2px 6px',borderRadius:4,fontFamily:'inherit'}}>x</button>
        </div>
        <div style={{padding:'20px',flex:1}}>{children}</div>
      </div>
    </>
  )
}
function SearchInput({ value, onChange, placeholder, style={} }) {
  return (
    <div style={{position:'relative',...style}}>
      <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:'var(--t3)',pointerEvents:'none'}} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'7px 12px 7px 30px',color:'var(--t1)',fontSize:'12.5px',fontFamily:'inherit',outline:'none',width:'100%'}} onFocus={e=>e.target.style.borderColor='var(--blue3)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
    </div>
  )
}
function FieldInput({ label, children }) {
  return <div><div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>{label}</div>{children}</div>
}
const inputStyle = {width:'100%',background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 12px',color:'var(--t1)',fontSize:'12.5px',fontFamily:'inherit',outline:'none'}
function GeminiBadge() {
  return <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:5,background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.3)',fontSize:'10.5px',fontWeight:700,color:'var(--blue2)'}}>Vertex AI</div>
}
function ReusedBadge() {
  return <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:5,background:'rgba(124,58,237,.1)',border:'1px solid rgba(124,58,237,.3)',fontSize:'10.5px',fontWeight:700,color:'#7c3aed'}}>Reused Template</div>
}

// ─── RELATIONSHIP DRAWER (with Gemini Log Outcome) ────────────────────────────
function RelationshipDrawer({ rel, onClose, learnedData, onLearnedUpdate, geminiKey, onCloneTemplate, templates=[], actors=ACTORS }) {
  const [logOpen, setLogOpen] = useState(false)
  const [logForm, setLogForm] = useState({outcome:'',trust:85,fit:85,notes:'',flag:'none'})
  const [gLoading, setGLoading] = useState(false)
  const [gResult, setGResult] = useState(null)
  const [gError, setGError] = useState(null)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneDone, setCloneDone] = useState(false)
  const [cloneForm, setCloneForm] = useState({name:'',notes:'',targetProg:''})

  if (!rel) return null
  const fromActor = actors.find(a=>a.id===rel.fromId)
  const toActor   = actors.find(a=>a.id===rel.toId)||PROGRAMMES.find(p=>p.id===rel.toId)
  const programme = PROGRAMMES.find(p=>p.id===rel.programmeId)
  const isReused  = !!rel.reusedFrom || templates.some(t=>t.sourceRelId===rel.id)
  const learned   = learnedData[rel.id]

  const scoreColor = v => v>=80?'#059669':v>=65?'#d97706':'#dc2626'
  const sc = rel.status==='At-Risk'
    ?{bg:'rgba(220,38,38,.1)',border:'rgba(220,38,38,.25)',color:'#dc2626'}
    :{bg:'rgba(5,150,105,.1)',border:'rgba(5,150,105,.25)',color:'#059669'}

  const currentFit   = learned?.avgFit   ?? rel.fitScore
  const currentTrust = learned?.avgTrust ?? rel.trustScore

  const handleSubmitAndTrainAI = async () => {
    if (!logForm.outcome) return
    setGLoading(true); setGResult(null); setGError(null)

    const prev = learnedData[rel.id] || {}
    const prevSessions = prev.sessions || 0
    const sessions = prevSessions + 1
    const avgTrust = Math.round(((prev.avgTrust??rel.trustScore??70)*prevSessions + logForm.trust)/sessions)
    const avgFit   = Math.round(((prev.avgFit  ??rel.fitScore  ??70)*prevSessions + logForm.fit  )/sessions)
    const savedUpdate = {
      sessions, avgTrust, avgFit,
      outcomes:[...(prev.outcomes||[]), logForm.outcome],
      lastFlag:logForm.flag, lastNotes:logForm.notes,
    }
    onLearnedUpdate(rel.id, savedUpdate)

    const key = geminiKey.trim()
    if (!key) {
      setGResult(`Outcome saved locally.\nTrust score updated to ${avgTrust}%.\nFit score updated to ${avgFit}%.\nUse the Vertex AI backend demo to generate AI training insights.`)
      setGLoading(false)
      return
    }

    const prompt = `You are RelateAI's ecosystem relationship intelligence engine for a Malaysian accelerator platform.

A programme manager has logged a new outcome for an actor relationship. Analyse the data and generate 3 insights to improve future matching.

RELATIONSHIP: ${fromActor?.name} (${fromActor?.type}) ↔ ${toActor?.name} (${toActor?.type||'Programme'})
TYPE: ${rel.type} | PROGRAMME: ${programme?.name} (${programme?.cohort})
HISTORICAL OUTCOMES: ${rel.outcomes?.join('; ')||'None'}
PREVIOUS AI FLAGS: ${prev.lastFlag||'none'}

NEW OUTCOME LOGGED:
- Description: ${logForm.outcome}
- Trust Score this session: ${logForm.trust}%
- Fit Score this session: ${logForm.fit}%
- Flag: ${logForm.flag}
- Notes: ${logForm.notes||'none'}

UPDATED LEARNED AVERAGES (${sessions} total sessions):
- Avg Trust: ${avgTrust}% | Avg Fit: ${avgFit}%

Return exactly 3 bullet insights starting with "- " covering: (1) relationship health assessment, (2) one specific action for the programme manager, (3) whether this pairing pattern should be reused in future cohorts. Be concise and data-driven.`

    try {
      const text = await geminiCall(key, prompt)
      setGResult(text)
      onLearnedUpdate(rel.id, {
        ...savedUpdate,
        lastGeminiInsight:text,
      })
    } catch(e) {
      setGError(`${e.message}. Your outcome and scores were still saved locally.`)
    } finally {
      setGLoading(false)
    }
  }

  const closeLog = () => {
    setLogOpen(false)
    setLogForm({outcome:'',trust:85,fit:85,notes:'',flag:'none'})
    setGResult(null); setGError(null)
  }

  return (
    <>
      <Drawer open={!!rel} onClose={onClose} title="Relationship Detail">
        {/* badges */}
        <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
          <div style={{padding:'3px 9px',borderRadius:5,fontSize:'10.5px',fontWeight:700,background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.25)',color:'var(--blue2)'}}>{rel.type}</div>
          <div style={{padding:'3px 9px',borderRadius:5,fontSize:'10.5px',fontWeight:700,background:sc.bg,border:`1px solid ${sc.border}`,color:sc.color}}>{rel.status}</div>
          {isReused && <ReusedBadge/>}
          <GeminiBadge/>
          {learned && <div style={{padding:'3px 9px',borderRadius:5,fontSize:'10.5px',fontWeight:700,background:'rgba(5,150,105,.1)',border:'1px solid rgba(5,150,105,.25)',color:'#059669'}}>{learned.sessions} session{learned.sessions>1?'s':''} trained</div>}
        </div>

        {/* actors */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:14,background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:10,marginBottom:14}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
            <Avatar initials={fromActor?.avatar} color={fromActor?.color} size={36}/>
            <div><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{fromActor?.name}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{fromActor?.type}</div></div>
          </div>
          <div style={{fontSize:'18px',color:'var(--t3)'}}>&#8596;</div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',flexDirection:'row-reverse'}}>
            <Avatar initials={toActor?.avatar||toActor?.cohort?.slice(0,2)} color={toActor?.color||'#3b82f6'} size={36}/>
            <div style={{textAlign:'right'}}><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{toActor?.name}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{toActor?.type||'Programme'}</div></div>
          </div>
        </div>

        {/* programme */}
        <div style={{padding:'9px 12px',background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.15)',borderRadius:8,marginBottom:14,fontSize:'12px',color:'var(--t1)'}}>
          <span style={{color:'var(--t2)'}}>Programme: </span><span style={{fontWeight:600}}>{programme?.name}</span><span style={{color:'var(--t2)',marginLeft:8}}>{programme?.cohort}</span>
        </div>

        {/* scores */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
          {[['Fit Score',currentFit],['Trust Score',currentTrust],['Outcome',rel.outcomeScore]].map(([l,v])=>(
            <div key={l} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <div className="font-mono" style={{fontSize:'22px',fontWeight:700,color:scoreColor(v)}}>{v}%</div>
              <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {/* engagement */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[['Last Engagement',rel.lastEngagement],['Sessions',learned?.sessions??rel.sessions??'N/A']].map(([k,v])=>(
            <div key={k} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'9px 12px'}}>
              <div style={{fontSize:'10.5px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{k}</div>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* outcomes */}
        {(rel.outcomes?.length>0 || learned?.outcomes?.length>0) && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:7}}>Recorded Outcomes</div>
            {rel.outcomes?.map((o,i)=>(
              <div key={i} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'#059669',flexShrink:0}}>&#10003;</span>{o}</div>
            ))}
            {learned?.outcomes?.map((o,i)=>(
              <div key={`l${i}`} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'var(--blue2)',flexShrink:0}}>&#10003;</span>{o}</div>
            ))}
          </div>
        )}

        <div style={{height:1,background:'var(--border)',margin:'14px 0'}}/>

        {/* AI reasoning */}
        <div style={{background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.18)',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Vertex AI Reasoning</div>
            <GeminiBadge/>
          </div>
          {rel.aiReasoning?.map((r,i)=>(
            <div key={i} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'var(--blue3)',flexShrink:0}}>&#8594;</span>{r}</div>
          ))}
          {learned?.lastGeminiInsight && (
            <div style={{marginTop:9,borderTop:'1px solid var(--border)',paddingTop:9}}>
              <div style={{fontSize:'10px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Latest Trained Insight</div>
              {learned.lastGeminiInsight.split('\n').filter(l=>l.trim()).map((line,i)=>(
                <div key={i} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'var(--blue3)',flexShrink:0}}>&#8594;</span>{line.replace(/^[-\s*]+/,'')}</div>
              ))}
            </div>
          )}
        </div>

        {/* reuse context */}
        {isReused && (
          <div style={{background:'rgba(124,58,237,.06)',border:'1px solid rgba(124,58,237,.2)',borderRadius:8,padding:12,marginBottom:14}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'#7c3aed',marginBottom:5}}>Reused from Previous Programme</div>
            <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.6}}>This relationship was templated from an earlier programme engagement. Gemini adapted the linkage parameters to the current programme context, carrying forward engagement history and outcome signals.</div>
          </div>
        )}

        <div style={{display:'flex',gap:8}}>
          <Btn variant="primary" style={{flex:1}} onClick={()=>setLogOpen(true)}>Log Outcome</Btn>
          <Btn variant="outline" onClick={()=>setCloneOpen(true)}>Clone as Template</Btn>
        </div>
      </Drawer>

      {/* CLONE AS TEMPLATE MODAL */}
      {cloneOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:480,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
            {!cloneDone ? (
              <>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:5}}>Clone as Template</div>
                <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>
                  Save this relationship as a reusable template. Future cohorts will inherit the linkage parameters, scoring history, and AI reasoning — Gemini will adapt them to the new context.
                </p>
                <div style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:9,padding:12,marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[['Fit Score',`${currentFit}%`],['Trust Score',`${currentTrust}%`],['Outcome',`${rel.outcomeScore}%`]].map(([l,v])=>(
                    <div key={l} style={{textAlign:'center'}}>
                      <div className="font-mono" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>{v}</div>
                      <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Template Name</div>
                  <input value={cloneForm.name} onChange={e=>setCloneForm(f=>({...f,name:e.target.value}))} placeholder={`${rel.type} — ${fromActor?.name} template`} style={inputStyle}/>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Target Programme (optional)</div>
                  <select value={cloneForm.targetProg} onChange={e=>setCloneForm(f=>({...f,targetProg:e.target.value}))} style={inputStyle}>
                    <option value="">Any future programme</option>
                    {PROGRAMMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Notes for future cohort managers</div>
                  <textarea value={cloneForm.notes} onChange={e=>setCloneForm(f=>({...f,notes:e.target.value}))} placeholder="Key context, caveats, or adaptation guidance..." style={{...inputStyle,minHeight:64,resize:'vertical'}}/>
                </div>
                <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
                  <Btn variant="outline" onClick={()=>setCloneOpen(false)}>Cancel</Btn>
                  <Btn variant="purple" onClick={()=>{onCloneTemplate({id:`tmpl_${Date.now()}`,name:cloneForm.name||`${rel.type} — ${fromActor?.name}`,type:rel.type,sourceRelId:rel.id,fromName:fromActor?.name,toName:toActor?.name,fitScore:currentFit,trustScore:currentTrust,outcomeScore:rel.outcomeScore,notes:cloneForm.notes,targetProg:cloneForm.targetProg,createdAt:new Date().toLocaleString()});setCloneDone(true)}}>Save Template</Btn>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(124,58,237,.12)',border:'1px solid rgba(124,58,237,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'22px',color:'#7c3aed'}}>&#10003;</div>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:6}}>Template Saved</div>
                <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:18,lineHeight:1.6}}>
                  <strong style={{color:'var(--t1)'}}>{cloneForm.name||`${rel.type} — ${fromActor?.name}`}</strong> is now available as a reusable template for future cohorts.
                </div>
                <Btn variant="primary" onClick={()=>{setCloneOpen(false);setCloneDone(false);setCloneForm({name:'',notes:'',targetProg:''})}} style={{width:'100%',justifyContent:'center'}}>Done</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOG OUTCOME + GEMINI TRAIN MODAL */}
      {logOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:480,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:5}}>Log Outcome</div>
            <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:16,lineHeight:1.5}}>
              Record this session's outcome. Clicking <strong style={{color:'var(--t1)'}}>Submit & Train AI</strong> sends data to <strong style={{color:'var(--t1)'}}>Vertex AI</strong>, which analyses signals and updates matching recommendations for similar pairings.
            </p>

            {!gResult && !gLoading && (
              <>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Outcome Description</div>
                  <textarea value={logForm.outcome} onChange={e=>setLogForm(f=>({...f,outcome:e.target.value}))} placeholder="What was achieved in this session or period?" style={{...inputStyle,minHeight:72,resize:'vertical'}}/>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Trust Score: {logForm.trust}%</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <input type="range" min="0" max="100" step="1" value={logForm.trust} onChange={e=>setLogForm(f=>({...f,trust:Number(e.target.value)}))} style={{flex:1,accentColor:'var(--blue3)'}}/>
                    <input type="number" min="0" max="100" value={logForm.trust} onChange={e=>setLogForm(f=>({...f,trust:Math.max(0,Math.min(100,Number(e.target.value)||0))}))} style={{...inputStyle,width:70,padding:'6px 8px',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Fit Score: {logForm.fit}%</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <input type="range" min="0" max="100" step="1" value={logForm.fit} onChange={e=>setLogForm(f=>({...f,fit:Number(e.target.value)}))} style={{flex:1,accentColor:'var(--blue3)'}}/>
                    <input type="number" min="0" max="100" value={logForm.fit} onChange={e=>setLogForm(f=>({...f,fit:Math.max(0,Math.min(100,Number(e.target.value)||0))}))} style={{...inputStyle,width:70,padding:'6px 8px',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Flag</div>
                  <select value={logForm.flag} onChange={e=>setLogForm(f=>({...f,flag:e.target.value}))} style={inputStyle}>
                    <option value="none">No flag</option>
                    <option value="high-performing">High performing</option>
                    <option value="at-risk">At risk</option>
                    <option value="needs-review">Needs review</option>
                  </select>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Additional Notes</div>
                  <textarea value={logForm.notes} onChange={e=>setLogForm(f=>({...f,notes:e.target.value}))} placeholder="Context for AI model training..." style={{...inputStyle,minHeight:60,resize:'vertical'}}/>
                </div>
                <div style={{background:'rgba(37,99,235,.07)',border:'1px solid rgba(37,99,235,.2)',borderRadius:8,padding:'10px 12px',fontSize:'12px',color:'var(--t2)',marginBottom:4}}>
                  Your outcome and scores are saved to this relationship. If a Gemini API key is set, AI insights are generated too.
                </div>
              </>
            )}

            {gLoading && (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:10}}>
                  <div className="spin" style={{width:22,height:22,border:'3px solid var(--border)',borderTopColor:'var(--blue3)',borderRadius:'50%'}}/>
                  <span style={{fontSize:'14px',color:'var(--t2)',fontWeight:500}}>Sending to Vertex AI...</span>
                </div>
                <div style={{fontSize:'12px',color:'var(--t3)'}}>Analysing relationship signals and generating insights</div>
              </div>
            )}

            {gResult && (
              <div>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Vertex AI Response</div>
                <div style={{background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.2)',borderRadius:9,padding:13,fontSize:'12.5px',color:'var(--t1)',lineHeight:1.6,marginBottom:10}}>
                  {gResult.split('\n').filter(l=>l.trim()).map((line,i)=>(
                    <div key={i} style={{marginBottom:7,display:'flex',gap:6}}><span style={{color:'var(--blue3)',flexShrink:0}}>&#8594;</span><span>{line.replace(/^[-\s*]+/,'')}</span></div>
                  ))}
                </div>
                <div style={{background:'rgba(5,150,105,.08)',border:'1px solid rgba(5,150,105,.2)',borderRadius:8,padding:'9px 12px',fontSize:'12px',color:'#065f46'}}>
                  Scores and outcome saved to this relationship record.
                </div>
              </div>
            )}

            {gError && (
              <div style={{background:'rgba(220,38,38,.08)',border:'1px solid rgba(220,38,38,.25)',borderRadius:8,padding:'11px 13px',fontSize:'12.5px',color:'#991b1b',marginBottom:8}}>
                <strong>Gemini API Error:</strong> {gError}
                <div style={{marginTop:5,fontSize:'11px',color:'#7f1d1d'}}>Check the Vertex AI backend configuration when you want AI-generated insights.</div>
              </div>
            )}

            <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
              <Btn variant="outline" onClick={closeLog}>{gResult?'Done':'Cancel'}</Btn>
              {!gResult && <Btn variant="primary" disabled={!logForm.outcome||gLoading} onClick={handleSubmitAndTrainAI} style={{display:'flex',alignItems:'center',gap:7}}>
                {gLoading && <div className="spin" style={{width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%'}}/>}
                Submit &amp; Train AI
              </Btn>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── PAGES ────────────────────────────────────────────────────────────────────
function ProgrammeDetailPage({ programme, onBack, allRelationships, allActors, learnedData, onSelectRelationship }) {
  const rels=allRelationships.filter(r=>r.programmeId===programme.id)
  const actorsForType=(type)=>{
    const ids=new Set(allActors.filter(a=>a.type===type&&a.programmes?.includes(programme.id)).map(a=>a.id))
    rels.forEach(r=>{
      const from=allActors.find(a=>a.id===r.fromId),to=allActors.find(a=>a.id===r.toId)
      if(from?.type===type)ids.add(from.id)
      if(to?.type===type)ids.add(to.id)
    })
    return [...ids].map(id=>allActors.find(a=>a.id===id)).filter(Boolean)
  }
  const companies=actorsForType('Company')
  const mentors=actorsForType('Mentor')
  const partners=[...actorsForType('Partner'),...actorsForType('ServiceProvider')]
  const avg=rels.length?Math.round(rels.reduce((s,r)=>s+(learnedData[r.id]?.avgFit??r.fitScore??0),0)/rels.length):0
  const actorCard=(a)=>(
    <div key={a.id} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:8,padding:12}}>
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}>
        <Avatar initials={a.avatar} color={a.color} size={34}/>
        <div><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{a.name}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{a.type} · {a.sector}</div></div>
      </div>
      <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.5,marginBottom:8}}>{a.bio}</div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{a.expertise?.slice(0,3).map(e=><Tag key={e} variant="blue">{e}</Tag>)}</div>
    </div>
  )
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <Btn variant="ghost" size="sm" onClick={onBack} style={{marginBottom:8}}>&larr; Back</Btn>
          <h1 className="font-display" style={{fontSize:'22px',fontWeight:800,color:'var(--t1)'}}>{programme.name}</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:4}}>{programme.cohort} · {programme.country} · {programme.startDate} &rarr; {programme.endDate}</div>
        </div>
        {avg>0&&<ScorePill score={avg} size="lg"/>}
      </div>
      <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:14,marginBottom:14,fontSize:'13px',color:'var(--t2)',lineHeight:1.7}}>{programme.description}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[['Companies',companies.length],['Mentors',mentors.length],['Partners',partners.length],['Relationships',rels.length]].map(([l,v])=><StatCard key={l} label={l} value={v} accentColor={l==='Relationships'?'var(--blue3)':l==='Companies'?'#10b981':l==='Mentors'?'#a78bfa':'#f59e0b'}/>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <section><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:8}}>Companies</div><div style={{display:'grid',gap:8}}>{companies.length?companies.map(actorCard):<div style={{fontSize:'12px',color:'var(--t3)'}}>No companies linked yet.</div>}</div></section>
        <section><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:8}}>Mentors</div><div style={{display:'grid',gap:8}}>{mentors.length?mentors.map(actorCard):<div style={{fontSize:'12px',color:'var(--t3)'}}>No mentors linked yet.</div>}</div></section>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <section><div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:8}}>Partners & Service Providers</div><div style={{display:'grid',gap:8}}>{partners.length?partners.map(actorCard):<div style={{fontSize:'12px',color:'var(--t3)'}}>No partners linked yet.</div>}</div></section>
        <section>
          <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:8}}>Relationships</div>
          <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
            {rels.length?rels.map(r=>{
              const aA=allActors.find(a=>a.id===r.fromId),aB=allActors.find(a=>a.id===r.toId)||PROGRAMMES.find(p=>p.id===r.toId)
              const fit=learnedData[r.id]?.avgFit??r.fitScore??70
              return <div key={r.id} onClick={()=>onSelectRelationship?.(r)} style={{padding:12,borderBottom:'1px solid var(--border)',cursor:'pointer'}}><div style={{display:'flex',alignItems:'center',gap:8}}><strong style={{fontSize:'12.5px',color:'var(--t1)',flex:1}}>{aA?.name} &#8596; {aB?.name}</strong><ScorePill score={fit} size="sm"/></div><div style={{fontSize:'11px',color:'var(--t2)',marginTop:5}}>{r.type} · {r.status} · {r.sessions??0} sessions</div></div>
            }):<div style={{padding:14,fontSize:'12px',color:'var(--t3)'}}>No relationships linked yet.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

function DashboardPage({ onNavigate, learnedData, customRelationships=[], extraActors=[], allActors: actorList }) {
  const [selected, setSelected] = useState(null)
  const [selectedProgramme,setSelectedProgramme]=useState(null)
  const allRelationships=useMemo(()=>[...customRelationships,...RELATIONSHIPS],[customRelationships])
  const allActors=useMemo(()=>actorList||[...ACTORS,...(extraActors||[])],[actorList,extraActors])
  const avgFit  = Math.round(allRelationships.reduce((s,r)=>s+(learnedData[r.id]?.avgFit??r.fitScore??0),0)/allRelationships.length)
  const reused  = allRelationships.filter(r=>r.reusedFrom).length
  const atRisk  = allRelationships.filter(r=>r.status==='At-Risk').length
  const aiSessions = Object.values(learnedData).reduce((s,d)=>s+(d.sessions||0),0)
  if(selectedProgramme)return(
    <>
      <ProgrammeDetailPage programme={selectedProgramme} onBack={()=>setSelectedProgramme(null)} allRelationships={allRelationships} allActors={allActors} learnedData={learnedData} onSelectRelationship={setSelected}/>
      {selected && <_RelDrawerPass rel={selected} onClose={()=>setSelected(null)} learnedData={learnedData} actors={allActors}/>}
    </>
  )
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Ecosystem Intelligence Dashboard</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Relationships as first-class, programmable entities — powered by Vertex AI</div>
        </div>
        <GeminiBadge/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard label="Active Relationships"  value={allRelationships.length} sub="across programmes"    accentColor="var(--blue3)"   delay={0}/>
        <StatCard label="Avg Fit Score"          value={`${avgFit}%`}         sub={`+${aiSessions} AI sessions`} accentColor="var(--green3)"  delay={.05}/>
        <StatCard label="Reused from Past"       value={reused}                sub="templates reapplied"   accentColor="#a78bfa"        delay={.1}/>
        <StatCard label="At-Risk"                value={atRisk}                sub="need intervention"     accentColor="var(--red2)"    delay={.15}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16,marginBottom:16}}>
        <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>Active Programmes</div>
            <Btn variant="ghost" size="sm" onClick={()=>onNavigate('programmes')}>View all</Btn>
          </div>
          <div style={{padding:'0 16px 8px'}}>
            {PROGRAMMES.filter(p=>p.status!=='Draft').map(p=>{
              const rels=allRelationships.filter(r=>r.programmeId===p.id)
              const companies=new Set(allActors.filter(a=>a.type==='Company'&&a.programmes?.includes(p.id)).map(a=>a.id))
              const mentors=new Set(allActors.filter(a=>a.type==='Mentor'&&a.programmes?.includes(p.id)).map(a=>a.id))
              rels.forEach(r=>{
                const aA=allActors.find(a=>a.id===r.fromId),aB=allActors.find(a=>a.id===r.toId)
                if(aA?.type==='Company')companies.add(aA.id)
                if(aB?.type==='Company')companies.add(aB.id)
                if(aA?.type==='Mentor')mentors.add(aA.id)
                if(aB?.type==='Mentor')mentors.add(aB.id)
              })
              const avg=rels.length?Math.round(rels.reduce((s,r)=>s+(learnedData[r.id]?.avgFit??r.fitScore??0),0)/rels.length):0
              const sc=p.status==='Active'?'#059669':p.status==='Completed'?'var(--blue3)':'#d97706'
              return (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'padding .15s'}}
                  onClick={()=>setSelectedProgramme(p)}
                  onMouseEnter={e=>e.currentTarget.style.paddingLeft='6px'}
                  onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{p.name}</div>
                      <span style={{fontSize:'10px',fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${sc}18`,color:sc}}>{p.status}</span>
                    </div>
                    <div style={{fontSize:'11px',color:'var(--t2)'}}>{p.cohort} · {p.companies} companies · {p.mentors} mentors</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'11px',color:'var(--t3)',marginBottom:3}}>{rels.length} relationships</div>
                    {avg>0 && <ScorePill score={avg} size="sm"/>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>AI Insights</div>
            <div className="pulse-dot" style={{width:6,height:6,borderRadius:'50%',background:'var(--green3)'}}/>
          </div>
          <div style={{padding:'4px 14px 12px'}}>
            {[...allRelationships].sort((a,b)=>(learnedData[b.id]?.avgFit??b.fitScore)-(learnedData[a.id]?.avgFit??a.fitScore)).slice(0,6).map(r=>{
              const aA=allActors.find(a=>a.id===r.fromId)
              const aB=allActors.find(a=>a.id===r.toId)||PROGRAMMES.find(p=>p.id===r.toId)
              const fit=learnedData[r.id]?.avgFit??r.fitScore??70
              const dot=fit>=80?'#059669':fit>=65?'#d97706':'#dc2626'
              return (
                <div key={r.id} onClick={()=>setSelected(r)} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'padding .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.paddingLeft='4px'}
                  onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:dot,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:600,color:'var(--t1)'}}>{aA?.name?.split(' ')[0]} &#8596; {aB?.name}</div>
                    <div style={{fontSize:'10.5px',color:'var(--t2)'}}>{r.type} · {r.status}</div>
                  </div>
                  <ScorePill score={fit} size="sm"/>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>Ecosystem Learning</div>
          <GeminiBadge/>
        </div>
        <div style={{padding:18,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12}}>
          {[['18%','Match accuracy','#a78bfa'],['4','Templates reused','#059669'],['94%','AI prediction accuracy','var(--blue3)'],[`${aiSessions}x`,'Trained sessions','#d97706']].map(([v,l,c])=>(
            <div key={l} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:8,padding:12,textAlign:'center'}}>
              <div className="font-mono" style={{fontSize:'22px',fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:'10.5px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'0 18px 18px',fontSize:'12px',color:'var(--t2)',lineHeight:1.8}}>
          After 3 completed programmes, Vertex AI improved mentor-company fit accuracy by <span style={{color:'var(--blue3)',fontWeight:700}}>18%</span>. {reused} relationships were automatically reused from past programmes, saving an estimated <span style={{color:'#059669',fontWeight:700}}>~40 hours</span> of manual coordinator effort.
        </div>
      </div>
      {selected && <_RelDrawerPass rel={selected} onClose={()=>setSelected(null)} learnedData={learnedData} actors={allActors}/>}
    </div>
  )
}

function _RelDrawerPass({ rel, onClose, learnedData, actors=ACTORS }) {
  // pass-through for pages that don't have gemini key context — uses parent state
  return <RelationshipDrawer rel={rel} onClose={onClose} learnedData={learnedData} onLearnedUpdate={()=>{}} geminiKey="" actors={actors}/>
}

function RelationshipsPage({ learnedData, onLearnedUpdate, geminiKey, onCloneTemplate, templates, customRelationships=[], onAddRelationship, programmeFilter='all', onProgrammeFilterChange, allActors=ACTORS, allProgrammes=PROGRAMMES }) {
  const [search,setSearch]=useState('')
  const [typeF,setTypeF]=useState('all')
  const [progF,setProgF]=useState(programmeFilter)
  const [sortBy,setSortBy]=useState('fitScore')
  const [selected,setSelected]=useState(null)
  const [newRelOpen,setNewRelOpen]=useState(false)
  const [newRel,setNewRel]=useState({fromId:'',toId:'',type:'',programmeId:'',notes:''})
  const [newRelDone,setNewRelDone]=useState(false)
  const allRelationships = useMemo(()=>[...customRelationships,...RELATIONSHIPS],[customRelationships])
  const templatedRelIds = useMemo(()=>new Set(templates.map(t=>t.sourceRelId).filter(Boolean)),[templates])
  const isTemplateLinked = useCallback((rel)=>!!rel.reusedFrom || templatedRelIds.has(rel.id),[templatedRelIds])

  useEffect(()=>setProgF(programmeFilter),[programmeFilter])

  const handleProgrammeFilter = (value) => {
    setProgF(value)
    onProgrammeFilterChange?.(value)
  }

  const filtered = useMemo(()=>allRelationships.filter(r=>{
    if(typeF!=='all'&&r.type!==typeF)return false
    if(progF!=='all'&&r.programmeId!==progF)return false
    const q=search.toLowerCase()
    if(q){
      const aA=allActors.find(a=>a.id===r.fromId)
      const aB=allActors.find(a=>a.id===r.toId)||allProgrammes.find(p=>p.id===r.toId)
      if(!aA?.name.toLowerCase().includes(q)&&!aB?.name.toLowerCase().includes(q)&&!r.type.toLowerCase().includes(q))return false
    }
    return true
  }).sort((a,b)=>sortBy==='type'?a.type.localeCompare(b.type):(b[sortBy]??0)-(a[sortBy]??0)),[allRelationships,search,typeF,progF,sortBy])

  const avg=allRelationships.length?Math.round(allRelationships.reduce((s,r)=>s+(r.fitScore??0),0)/allRelationships.length):0

  const handleCreateRelationship = () => {
    const relationship = {
      id:`manual-${Date.now()}`,
      fromId:newRel.fromId,
      toId:newRel.toId,
      type:newRel.type,
      programmeId:newRel.programmeId,
      status:'Active',
      fitScore:70,
      trustScore:70,
      outcomeScore:70,
      reusedFrom:null,
      sessions:0,
      lastEngagement:'Just now',
      outcomes:newRel.notes?[newRel.notes]:[],
      aiReasoning:[
        'Manually created relationship',
        'Use Vertex AI or log an outcome to refine this score',
      ],
      createdAt:new Date().toISOString(),
    }
    onAddRelationship?.(relationship)
    setSelected(relationship)
    setNewRelDone(true)
  }

  const handleExport = () => {
    const rows = [
      ['From Actor','From Type','To Actor','To Type','Rel Type','Programme','Fit Score','Trust Score','Outcome Score','Status','Reused','Last Engagement','Sessions','Outcomes'],
      ...allRelationships.map(r=>{
        const aA=allActors.find(a=>a.id===r.fromId)
        const aB=allActors.find(a=>a.id===r.toId)||allProgrammes.find(p=>p.id===r.toId)
        const prog=allProgrammes.find(p=>p.id===r.programmeId)
        return [
          aA?.name||r.fromId, aA?.type||'',
          aB?.name||r.toId, aB?.type||'Programme',
          r.type, prog?.cohort||'',
          r.fitScore, r.trustScore, r.outcomeScore,
          r.status, isTemplateLinked(r)?'Yes':'No',
          r.lastEngagement, r.sessions??'',
          (r.outcomes||[]).join(' | ')
        ]
      })
    ]
    const csv = rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='BondB_relationships.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Relationship Registry</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>{filtered.length} programmable relationship entities · avg fit {avg}%</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="outline" size="sm" onClick={handleExport}>&#8595; Export CSV</Btn>
          <Btn variant="purple" size="sm" onClick={()=>setNewRelOpen(true)}>+ New Relationship</Btn>
        </div>
      </div>

      {/* NEW RELATIONSHIP MODAL */}
      {newRelOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:500,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
            {!newRelDone ? (
              <>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:5}}>New Relationship</div>
                <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>Manually create a new actor linkage. For AI-scored relationships, use the Vertex AI backend demo.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>From Actor</div>
                    <select value={newRel.fromId} onChange={e=>setNewRel(f=>({...f,fromId:e.target.value}))} style={inputStyle}>
                      <option value="">Select actor…</option>
                      {allActors.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>To Actor / Programme</div>
                    <select value={newRel.toId} onChange={e=>setNewRel(f=>({...f,toId:e.target.value}))} style={inputStyle}>
                      <option value="">Select target…</option>
                      <optgroup label="Actors">{allActors.filter(a=>a.id!==newRel.fromId).map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</optgroup>
                      <optgroup label="Programmes">{allProgrammes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                    </select>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Relationship Type</div>
                    <select value={newRel.type} onChange={e=>setNewRel(f=>({...f,type:e.target.value}))} style={inputStyle}>
                      <option value="">Select type…</option>
                      {REL_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Programme Context</div>
                    <select value={newRel.programmeId} onChange={e=>setNewRel(f=>({...f,programmeId:e.target.value}))} style={inputStyle}>
                      <option value="">Select programme…</option>
                      {allProgrammes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Initial Notes</div>
                  <textarea value={newRel.notes} onChange={e=>setNewRel(f=>({...f,notes:e.target.value}))} placeholder="Context for this relationship linkage…" style={{...inputStyle,minHeight:60,resize:'vertical'}}/>
                </div>
                {/* preview */}
                {newRel.fromId && newRel.toId && (
                  <div style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:9,padding:12,marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                    {(()=>{const aA=allActors.find(a=>a.id===newRel.fromId);const aB=allActors.find(a=>a.id===newRel.toId)||allProgrammes.find(p=>p.id===newRel.toId);return(<><Avatar initials={aA?.avatar} color={aA?.color} size={28}/><div style={{fontSize:'12px',fontWeight:600,color:'var(--t1)'}}>{aA?.name}</div><div style={{color:'var(--t3)'}}>&#8596;</div><Avatar initials={aB?.avatar||aB?.cohort?.slice(0,2)} color={aB?.color||'#3b82f6'} size={28}/><div style={{fontSize:'12px',fontWeight:600,color:'var(--t1)'}}>{aB?.name}</div></>)})()}
                  </div>
                )}
                <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:4}}>
                  <Btn variant="outline" onClick={()=>{setNewRelOpen(false);setNewRel({fromId:'',toId:'',type:'',programmeId:'',notes:''})}}>Cancel</Btn>
                  <Btn variant="primary" disabled={!newRel.fromId||!newRel.toId||!newRel.type||!newRel.programmeId} onClick={handleCreateRelationship}>Create Relationship</Btn>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'22px',color:'var(--blue2)'}}>&#10003;</div>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:6}}>Relationship Created</div>
                <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:6,lineHeight:1.6}}>
                  {(()=>{const aA=allActors.find(a=>a.id===newRel.fromId);const aB=allActors.find(a=>a.id===newRel.toId)||allProgrammes.find(p=>p.id===newRel.toId);return<><strong style={{color:'var(--t1)'}}>{aA?.name}</strong> &#8596; <strong style={{color:'var(--t1)'}}>{aB?.name}</strong></>})()}
                </div>
                <div style={{fontSize:'12px',color:'var(--t3)',marginBottom:18}}>Use Vertex AI to score this relationship through the backend.</div>
                <Btn variant="primary" onClick={()=>{setNewRelOpen(false);setNewRelDone(false);setNewRel({fromId:'',toId:'',type:'',programmeId:'',notes:''})}} style={{width:'100%',justifyContent:'center'}}>Done</Btn>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard label="Total Relationships" value={allRelationships.length}                              sub="across all programmes"  accentColor="var(--blue3)"  delay={0}/>
        <StatCard label="Avg Fit Score"        value={`${avg}%`}                                        sub="Vertex-scored"          accentColor="var(--green3)" delay={.05}/>
        <StatCard label="Reused Templates"     value={allRelationships.filter(isTemplateLinked).length}     sub="from past programmes"   accentColor="#a78bfa"       delay={.1}/>
        <StatCard label="At-Risk"              value={allRelationships.filter(r=>r.status==='At-Risk').length} sub="need attention"      accentColor="var(--red2)"   delay={.15}/>
      </div>
      <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search actors, relationship type…" style={{width:230}}/>
          {[['typeF',setTypeF,typeF,[['all','All Types'],...REL_TYPES.map(t=>[t,t])]],['progF',handleProgrammeFilter,progF,[['all','All Programmes'],...allProgrammes.map(p=>[p.id,p.cohort])]]].map(([,setter,val,opts])=>(
            <select key={val} value={val} onChange={e=>setter(e.target.value)} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'7px 10px',color:'var(--t1)',fontSize:'12px',fontFamily:'inherit',outline:'none'}}>
              {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'7px 10px',color:'var(--t1)',fontSize:'12px',fontFamily:'inherit',outline:'none'}}>
            <option value="fitScore">Sort: Fit Score</option>
            <option value="trustScore">Sort: Trust</option>
            <option value="outcomeScore">Sort: Outcome</option>
            <option value="type">Sort: Type</option>
          </select>
          <div className="font-mono" style={{marginLeft:'auto',fontSize:'11px',color:'var(--t3)'}}>{filtered.length} results</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>{['From Actor','To Actor / Target','Rel. Type','Programme','Fit Score','Trust','Status','Reused','Actions'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:'11px',fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length===0
                ?<tr><td colSpan={9}><div style={{padding:'50px 20px',textAlign:'center',color:'var(--t3)'}}>No relationships match your filters</div></td></tr>
                :filtered.map(r=>{
                  const aA=allActors.find(a=>a.id===r.fromId)
                  const aB=allActors.find(a=>a.id===r.toId)||allProgrammes.find(p=>p.id===r.toId)
                  const prog=allProgrammes.find(p=>p.id===r.programmeId)
                  const sc=r.status==='At-Risk'?{bg:'rgba(220,38,38,.1)',color:'#dc2626'}:{bg:'rgba(5,150,105,.1)',color:'#059669'}
                  const learned=learnedData[r.id]
                  return (
                    <tr key={r.id} onClick={()=>setSelected(r)} style={{cursor:'pointer',transition:'background .1s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar initials={aA?.avatar} color={aA?.color} size={26}/><div><div style={{fontSize:'12.5px',fontWeight:600,color:'var(--t1)'}}>{aA?.name}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{aA?.type}</div></div></div></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar initials={aB?.avatar||aB?.cohort?.slice(0,2)} color={aB?.color||'#3b82f6'} size={26}/><div><div style={{fontSize:'12.5px',fontWeight:600,color:'var(--t1)'}}>{aB?.name}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{aB?.type||'Programme'}</div></div></div></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><Tag variant="blue">{r.type}</Tag></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)',fontSize:'12px',color:'var(--t2)'}}>{prog?.cohort}</td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:7,minWidth:110}}><ScoreBar value={learned?.avgFit??r.fitScore}/><ScorePill score={learned?.avgFit??r.fitScore} size="sm"/></div></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><ScorePill score={learned?.avgTrust??r.trustScore} size="sm"/></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><span style={{padding:'3px 8px',borderRadius:5,fontSize:'11px',fontWeight:600,background:sc.bg,color:sc.color}}>{r.status}</span></td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}>{isTemplateLinked(r)?<ReusedBadge/>:<span style={{fontSize:'11px',color:'var(--t3)'}}>New</span>}</td>
                      <td style={{padding:'11px 14px',borderBottom:'1px solid var(--border)'}}><button onClick={e=>{e.stopPropagation();setSelected(r)}} style={{padding:'4px 10px',borderRadius:5,fontSize:'11px',fontWeight:600,cursor:'pointer',background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.25)',color:'var(--blue2)',fontFamily:'inherit'}}>View</button></td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
      <RelationshipDrawer rel={selected} onClose={()=>setSelected(null)} learnedData={learnedData} onLearnedUpdate={onLearnedUpdate} geminiKey={geminiKey} onCloneTemplate={onCloneTemplate} templates={templates} actors={allActors}/>
    </div>
  )
}

function ReuseInCohortModal({ programme, onClose, allRelationships=RELATIONSHIPS, allActors=ACTORS, allProgrammes=PROGRAMMES, onCreateCohort }) {
  const rels = allRelationships.filter(r=>r.programmeId===programme.id || r.reusedFrom===programme.id)
  const [targetCohort,setTargetCohort]=useState('')
  const [targetStart,setTargetStart]=useState('')
  const [adaptNotes,setAdaptNotes]=useState('')
  const [selectedRels,setSelectedRels]=useState(rels.map(r=>r.id))
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [aiResults,setAiResults]=useState({})
  const [done,setDone]=useState(false)

  const toggleRel=id=>setSelectedRels(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])

  const handleReuse=async()=>{
    if(!targetCohort.trim())return
    setLoading(true)
    setError('')
    try {
      const entries = await Promise.all(selectedRels.map(async id=>{
        const r=rels.find(x=>x.id===id)
        const fromActor=allActors.find(a=>a.id===r?.fromId)
        const toActor=allActors.find(a=>a.id===r?.toId)||allProgrammes.find(p=>p.id===r?.toId)
        const message=[
          'Reuse this existing relationship in a new cohort.',
          `Source programme: ${programme.name} (${programme.cohort}, ${programme.country}).`,
          `Target cohort: ${targetCohort}.`,
          targetStart ? `Planned start: ${targetStart}.` : '',
          adaptNotes ? `Adaptation notes: ${adaptNotes}.` : '',
          `Historical scores: fit ${r?.fitScore ?? 'unknown'}%, trust ${r?.trustScore ?? 'unknown'}%, outcome ${r?.outcomeScore ?? 'unknown'}%.`,
          `Sessions: ${r?.sessions ?? 0}. Outcomes: ${(r?.outcomes||[]).join('; ') || 'none recorded'}.`,
          `Existing AI reasoning: ${(r?.aiReasoning||[]).join('; ') || 'none recorded'}.`,
          'Assess whether to reuse, what to adapt, and one action the programme manager should take before launching the new cohort.',
        ].filter(Boolean).join('\n')
        let result
        try {
          result=await analyzeRelationship({
            message,
            fromActor,
            toActor,
            relType:r?.type,
            programme:`${programme.name} -> ${targetCohort}`,
          })
          if(result?.error) throw new Error(result.error)
        } catch(e) {
          result={
            fitScore:r?.fitScore ?? 78,
            trustScore:r?.trustScore ?? 75,
            successProbability:r?.outcomeScore ?? 76,
            relationshipHealth:(r?.fitScore ?? 0)>=80?'Strong':'Moderate',
            insight:'Reused from historical cohort data while Vertex AI is unavailable.',
            recommendedAction:'Review actor availability and confirm updated cohort objectives before launch.',
          }
        }
        return [id,result]
      }))
      setAiResults(Object.fromEntries(entries))
      onCreateCohort?.({
        sourceProgramme:programme,
        targetCohort,
        targetStart,
        adaptNotes,
        selectedRelationships:selectedRels.map(id=>rels.find(x=>x.id===id)).filter(Boolean),
        aiResults:Object.fromEntries(entries),
      })
      setDone(true)
    } catch(e) {
      setError(`Vertex AI reuse analysis failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:540,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
        {!done ? (
          <>
            <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:4}}>Reuse in New Cohort</div>
            <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>
              Carry forward relationships from <strong style={{color:'var(--t1)'}}>{programme.name}</strong> into a new cohort. Vertex AI will adapt linkage parameters and preserve institutional knowledge from all selected relationships.
            </p>

            <div style={{marginBottom:13}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>New Cohort Name</div>
              <input value={targetCohort} onChange={e=>setTargetCohort(e.target.value)} placeholder={`e.g. ${programme.cohort.replace(/\d+/, n=>+n+1)} · 2025`} style={{...{width:'100%',background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 12px',color:'var(--t1)',fontSize:'12.5px',fontFamily:'inherit',outline:'none'}}}/>
            </div>

            <div style={{marginBottom:13}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Planned Start Date</div>
              <input value={targetStart} onChange={e=>setTargetStart(e.target.value)} placeholder="e.g. Jan 2026" style={{width:'100%',background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 12px',color:'var(--t1)',fontSize:'12.5px',fontFamily:'inherit',outline:'none'}}/>
            </div>

            <div style={{marginBottom:13}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Select Relationships to Reuse ({selectedRels.length}/{rels.length})</div>
              <div style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:9,overflow:'hidden'}}>
                {rels.map((r,i)=>{
                  const aA=allActors.find(a=>a.id===r.fromId)
                  const aB=allActors.find(a=>a.id===r.toId)||PROGRAMMES.find(p=>p.id===r.toId)
                  const checked=selectedRels.includes(r.id)
                  return (
                    <div key={r.id} onClick={()=>toggleRel(r.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderBottom:i<rels.length-1?'1px solid var(--border)':'none',cursor:'pointer',background:checked?'rgba(37,99,235,.05)':'transparent',transition:'background .1s'}}>
                      <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${checked?'var(--blue3)':'var(--border2)'}`,background:checked?'var(--blue3)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                        {checked&&<span style={{color:'#fff',fontSize:'10px',fontWeight:700,lineHeight:1}}>&#10003;</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'12.5px',fontWeight:600,color:'var(--t1)'}}>{aA?.name} &#8596; {aB?.name}</div>
                        <div style={{fontSize:'11px',color:'var(--t2)'}}>{r.type}</div>
                      </div>
                      <ScorePill score={r.fitScore} size="sm"/>
                      {r.reusedFrom&&<ReusedBadge/>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{marginBottom:13}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Adaptation Notes (optional)</div>
              <textarea value={adaptNotes} onChange={e=>setAdaptNotes(e.target.value)} placeholder="Changes to scope, partner terms, actor eligibility, or programme focus..." style={{width:'100%',background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 12px',color:'var(--t1)',fontSize:'12.5px',fontFamily:'inherit',outline:'none',resize:'vertical',minHeight:64}}/>
            </div>

            <div style={{background:'rgba(124,58,237,.07)',border:'1px solid rgba(124,58,237,.2)',borderRadius:8,padding:'10px 13px',fontSize:'12px',color:'var(--t2)',marginBottom:4,lineHeight:1.5}}>
              Vertex AI will carry forward engagement history, outcome signals, and AI reasoning from all {selectedRels.length} selected relationships, adapting each linkage to the new cohort context.
            </div>
            {error&&<div style={{marginTop:10,padding:10,background:'rgba(220,38,38,.1)',border:'1px solid rgba(220,38,38,.25)',borderRadius:7,fontSize:'12px',color:'#dc2626'}}>{error}</div>}

            <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
              <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
              <Btn variant="purple" disabled={!targetCohort.trim()||selectedRels.length===0||loading} onClick={handleReuse}>{loading?'Calling Vertex AI...':`Reuse ${selectedRels.length} Relationship${selectedRels.length!==1?'s':''}`}</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(124,58,237,.12)',border:'1px solid rgba(124,58,237,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'22px',color:'#7c3aed'}}>&#10003;</div>
              <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:6}}>Cohort Created Successfully</div>
              <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:18,lineHeight:1.6}}>
                <strong style={{color:'var(--t1)'}}>{targetCohort}</strong> has been set up with {selectedRels.length} reused relationship{selectedRels.length!==1?'s':''} from {programme.name}.{targetStart&&` Starting ${targetStart}.`}
              </div>
              <div style={{background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.18)',borderRadius:10,padding:14,textAlign:'left',marginBottom:18}}>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>What Vertex AI Adapted</div>
                {selectedRels.map(id=>{
                  const r=rels.find(x=>x.id===id)
                  const ai=aiResults[id]||{}
                  const aA=allActors.find(a=>a.id===r?.fromId)
                  const aB=allActors.find(a=>a.id===r?.toId)||allProgrammes.find(p=>p.id===r?.toId)
                  return r?(
                    <div key={id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,fontSize:'12px',color:'var(--t2)'}}>
                      <span style={{color:'var(--blue3)',flexShrink:0}}>&#8594;</span>
                      <span><strong style={{color:'var(--t1)'}}>{aA?.name}</strong> &#8596; <strong style={{color:'var(--t1)'}}>{aB?.name}</strong> · Fit {r.fitScore}% · {r.sessions||0} session history</span>
                    </div>
                  ):null
                })}
                {Object.values(aiResults).some(ai=>ai?.recommendedAction)&&(
                  <div style={{marginTop:10,borderTop:'1px solid var(--border)',paddingTop:8}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Vertex AI Recommended Actions</div>
                    {selectedRels.map(id=>aiResults[id]?.recommendedAction?(
                      <div key={`action-${id}`} style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.55,marginBottom:5}}>{aiResults[id].recommendedAction}</div>
                    ):null)}
                  </div>
                )}
                {adaptNotes&&<div style={{marginTop:8,fontSize:'12px',color:'var(--t2)',fontStyle:'italic',borderTop:'1px solid var(--border)',paddingTop:8}}>Notes: {adaptNotes}</div>}
              </div>
              <Btn variant="primary" onClick={onClose} style={{width:'100%',justifyContent:'center'}}>Done</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function NewProgrammeModal({ onClose, onCreate }) {
  const [form,setForm]=useState({name:'',cohort:'',country:'Malaysia',startDate:'',endDate:'',description:'',status:'Draft'})
  const canCreate=form.name.trim()&&form.cohort.trim()
  const update=(key,value)=>setForm(prev=>({...prev,[key]:value}))
  const create=()=>{
    if(!canCreate)return
    onCreate?.({
      id:`prog_${Date.now()}`,
      name:form.name.trim(),
      cohort:form.cohort.trim(),
      country:form.country.trim()||'Malaysia',
      status:form.status,
      startDate:form.startDate.trim()||'TBD',
      endDate:form.endDate.trim()||'TBD',
      companies:0,
      mentors:0,
      partners:0,
      description:form.description.trim()||'New programme setup in progress.',
      createdFrom:'manual',
    })
    onClose()
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'var(--navy2)',borderRadius:14,padding:24,width:520,maxWidth:'100%',border:'1px solid var(--border)'}}>
        <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:4}}>New Programme</div>
        <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>Create a cohort shell. It will appear in the Programmes tab immediately.</p>
        <div style={{display:'grid',gap:12}}>
          <FieldInput label="Programme Name"><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Cradle CIP Tier 1 2026" style={inputStyle}/></FieldInput>
          <FieldInput label="Cohort"><input value={form.cohort} onChange={e=>update('cohort',e.target.value)} placeholder="e.g. Cohort 14" style={inputStyle}/></FieldInput>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FieldInput label="Country"><input value={form.country} onChange={e=>update('country',e.target.value)} style={inputStyle}/></FieldInput>
            <FieldInput label="Status"><select value={form.status} onChange={e=>update('status',e.target.value)} style={inputStyle}><option>Draft</option><option>Active</option><option>Completed</option></select></FieldInput>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <FieldInput label="Start"><input value={form.startDate} onChange={e=>update('startDate',e.target.value)} placeholder="e.g. Jan 2026" style={inputStyle}/></FieldInput>
            <FieldInput label="End"><input value={form.endDate} onChange={e=>update('endDate',e.target.value)} placeholder="e.g. Dec 2026" style={inputStyle}/></FieldInput>
          </div>
          <FieldInput label="Description"><textarea value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Programme scope, target actors, and cohort goals..." style={{...inputStyle,minHeight:76,resize:'vertical'}}/></FieldInput>
        </div>
        <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!canCreate} onClick={create}>Create Programme</Btn>
        </div>
      </div>
    </div>
  )
}

function ProgrammesPage({ onNavigate, learnedData, onLearnedUpdate, geminiKey, onCloneTemplate, templates, customRelationships=[], extraActors=[], allActors: actorList, allProgrammes=PROGRAMMES, onAddProgramme, onAddRelationships, onViewRelationshipsForProgramme }) {
  const [selected,setSelected]=useState(null)
  const [selectedProgramme,setSelectedProgramme]=useState(null)
  const [reuseModal,setReuseModal]=useState(null)
  const [newProgrammeOpen,setNewProgrammeOpen]=useState(false)
  const allRelationships=useMemo(()=>[...customRelationships,...RELATIONSHIPS],[customRelationships])
  const allActors=useMemo(()=>actorList||[...ACTORS,...(extraActors||[])],[actorList,extraActors])
  const handleCreateCohort=({sourceProgramme,targetCohort,targetStart,adaptNotes,selectedRelationships,aiResults})=>{
    const id=`prog_${Date.now()}`
    const companyIds=new Set()
    const mentorIds=new Set()
    const partnerIds=new Set()
    selectedRelationships.forEach(r=>{
      ;[r.fromId,r.toId].forEach(actorId=>{
        const actor=allActors.find(a=>a.id===actorId)
        if(actor?.type==='Company')companyIds.add(actor.id)
        if(actor?.type==='Mentor')mentorIds.add(actor.id)
        if(actor?.type==='Partner')partnerIds.add(actor.id)
      })
    })
    const newProgramme={
      id,
      name:`${sourceProgramme.name} Reuse`,
      country:sourceProgramme.country,
      status:'Draft',
      cohort:targetCohort,
      startDate:targetStart||'TBD',
      endDate:'TBD',
      companies:companyIds.size,
      mentors:mentorIds.size,
      partners:partnerIds.size,
      description:adaptNotes||`Reused cohort created from ${sourceProgramme.name}.`,
      createdFrom:sourceProgramme.id,
    }
    const clonedRelationships=selectedRelationships.map((r,idx)=>({
      ...r,
      id:`reuse_${Date.now()}_${idx}`,
      programmeId:id,
      reusedFrom:sourceProgramme.id,
      status:'Draft',
      fitScore:aiResults?.[r.id]?.fitScore ?? r.fitScore,
      trustScore:aiResults?.[r.id]?.trustScore ?? r.trustScore,
      outcomeScore:aiResults?.[r.id]?.successProbability ?? r.outcomeScore,
      lastEngagement:'new cohort',
      aiReasoning:[
        aiResults?.[r.id]?.insight||'Reused from historical programme relationship.',
        aiResults?.[r.id]?.recommendedAction||'Confirm actor availability before launch.',
      ],
    }))
    onAddProgramme?.(newProgramme)
    onAddRelationships?.(clonedRelationships)
  }
  if(selectedProgramme)return(
    <>
      <ProgrammeDetailPage programme={selectedProgramme} onBack={()=>setSelectedProgramme(null)} allRelationships={allRelationships} allActors={allActors} learnedData={learnedData} onSelectRelationship={setSelected}/>
      <RelationshipDrawer rel={selected} onClose={()=>setSelected(null)} learnedData={learnedData} onLearnedUpdate={onLearnedUpdate} geminiKey={geminiKey} onCloneTemplate={onCloneTemplate} templates={templates} actors={allActors}/>
    </>
  )
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Programmes & Cohorts</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Manage programme contexts — relationship linkages are scoped and reused across these</div>
        </div>
        <Btn variant="primary" onClick={()=>setNewProgrammeOpen(true)}>+ New Programme</Btn>
      </div>
      {newProgrammeOpen&&<NewProgrammeModal onClose={()=>setNewProgrammeOpen(false)} onCreate={onAddProgramme}/>}
      {reuseModal&&<ReuseInCohortModal programme={reuseModal} allRelationships={allRelationships} allActors={allActors} allProgrammes={allProgrammes} onCreateCohort={handleCreateCohort} onClose={()=>setReuseModal(null)}/>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {allProgrammes.map(p=>{
          const rels=allRelationships.filter(r=>r.programmeId===p.id)
          const reusableRels=allRelationships.filter(r=>r.programmeId===p.id || r.reusedFrom===p.id)
          const companyIds=new Set(allActors.filter(a=>a.type==='Company'&&a.programmes?.includes(p.id)).map(a=>a.id))
          rels.forEach(r=>{
            const from=allActors.find(a=>a.id===r.fromId)
            const to=allActors.find(a=>a.id===r.toId)
            if(from?.type==='Company')companyIds.add(from.id)
            if(to?.type==='Company')companyIds.add(to.id)
          })
          const companies=[...companyIds].map(id=>allActors.find(a=>a.id===id)).filter(Boolean)
          const reused=reusableRels.filter(r=>r.reusedFrom).length
          const avg=reusableRels.length?Math.round(reusableRels.reduce((s,r)=>s+r.fitScore,0)/reusableRels.length):0
          const atRisk=reusableRels.filter(r=>r.status==='At-Risk').length
          const sc=p.status==='Active'?'#059669':p.status==='Completed'?'var(--blue3)':p.status==='Draft'?'#d97706':'#8899b4'
          return (
            <div key={p.id} onClick={()=>setSelectedProgramme(p)} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',cursor:'pointer',transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border3)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div className="font-display" style={{fontSize:'14px',fontWeight:700,color:'var(--t1)'}}>{p.name}</div>
                    <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:4,background:`${sc}18`,color:sc}}>{p.status}</span>
                  </div>
                  <div style={{fontSize:'12px',color:'var(--t2)'}}>{p.cohort} · {p.country} · {p.startDate} &rarr; {p.endDate}</div>
                </div>
                {avg>0 && <ScorePill score={avg} size="sm"/>}
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:'12px',color:'var(--t2)',marginBottom:12,lineHeight:1.6}}>{p.description}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                  {[['Companies',companies.length],['Mentors',p.mentors],['Partners',p.partners],['Relationships',reusableRels.length]].map(([l,v])=>(
                    <div key={l} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 10px',textAlign:'center'}}>
                      <div className="font-mono" style={{fontSize:'18px',fontWeight:700,color:'var(--t1)'}}>{v}</div>
                      <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.4px',marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:700,marginBottom:6}}>Companies in this programme</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {companies.length?companies.slice(0,5).map(c=><Tag key={c.id} variant="blue">{c.name}</Tag>):<span style={{fontSize:'12px',color:'var(--t3)'}}>No companies linked yet</span>}
                    {companies.length>5&&<span style={{fontSize:'11px',color:'var(--t3)',alignSelf:'center'}}>+{companies.length-5} more</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {reused>0&&<ReusedBadge/>}
                  {atRisk>0&&<span style={{fontSize:'11px',fontWeight:600,color:'#dc2626'}}>&#9888; {atRisk} at-risk</span>}
                  <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                    {p.status==='Draft'&&<Btn variant="success" size="sm" onClick={e=>{e.stopPropagation();onNavigate('vertex-demo')}}>Auto-Match Actors</Btn>}
                    {p.status==='Completed'&&<Btn variant="purple" size="sm" onClick={e=>{e.stopPropagation();setReuseModal(p)}}>Reuse in New Cohort</Btn>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:16,background:'var(--navy3)',border:'1px solid rgba(124,58,237,.2)',borderRadius:12,padding:18}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>Cross-Programme Relationship Reuse</div>
          <GeminiBadge/>
        </div>
        <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.8,marginBottom:12}}>Vertex AI identifies relationship patterns from completed programmes and proposes reusable templates for new cohorts. Relationship entities are not discarded — they become institutional knowledge that improves future matching accuracy.</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[{from:'MaGIC Cohort 5',to:'Cradle Cohort 12',type:'Partner&#8596;Programme',confidence:94,rel:'AWS Activate → CIP Tier 1'},{from:'MaGIC Cohort 5',to:'Cradle Cohort 12',type:'Mentor&#8596;Company',confidence:82,rel:'Raj K. → PayLinkAsia'},{from:'Cradle Cohort 12',to:'MDEC Batch 3',type:'Partner&#8596;Programme',confidence:91,rel:'Google for Startups → MDEC'}].map((item,i)=>(
            <div key={i} style={{background:'var(--navy4)',border:'1px solid rgba(124,58,237,.2)',borderRadius:8,padding:12}}>
              <div style={{fontSize:'11px',color:'#7c3aed',fontWeight:700,marginBottom:5}} dangerouslySetInnerHTML={{__html:item.type}}/>
              <div style={{fontSize:'12px',fontWeight:600,marginBottom:3,color:'var(--t1)'}}>{item.rel}</div>
              <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:6}}>{item.from} &rarr; {item.to}</div>
              <div className="font-mono" style={{fontSize:'12px',color:'#059669'}}>Reuse confidence: {item.confidence}%</div>
            </div>
          ))}
        </div>
      </div>
      <RelationshipDrawer rel={selected} onClose={()=>setSelected(null)} learnedData={learnedData} onLearnedUpdate={onLearnedUpdate} geminiKey={geminiKey} onCloneTemplate={onCloneTemplate} templates={templates} actors={allActors}/>
    </div>
  )
}

function EcosystemGraphPage({ learnedData, customRelationships=[], extraActors=[], allActors: actorList }) {
  const canvasRef=useRef(null)
  const [selected,setSelected]=useState(null)
  const [hoveredId,setHoveredId]=useState(null)
  const animRef=useRef(null)
  const nodesRef=useRef([])
  const timeRef=useRef(0)
  const allRelationships=useMemo(()=>[...customRelationships,...RELATIONSHIPS],[customRelationships])
  const allActors=useMemo(()=>actorList||[...ACTORS,...(extraActors||[])],[actorList,extraActors])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return
    const ctx=canvas.getContext('2d')
    const actorNodes=allActors.map(a=>({
      id:a.id,
      label:a.name.split(' ')[0],
      initials:a.avatar||a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      color:a.color,
      type:a.type,
      kind:'actor',
      x:0,
      y:0,
      radius:a.type==='Partner'||a.type==='ServiceProvider'?24:21,
    }))
    const programmeNodes=PROGRAMMES.map(p=>({
      id:p.id,
      label:p.name.split(' ')[0],
      initials:p.name.split(' ').filter(w=>!['the','and','for','of'].includes(w.toLowerCase())).map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      color:p.status==='Active'?'#2563eb':p.status==='Completed'?'#7c3aed':'#d97706',
      type:'Programme',
      kind:'programme',
      x:0,
      y:0,
      radius:23,
    }))
    const nodes=[...actorNodes,...programmeNodes]
    nodesRef.current=nodes
    const draw=()=>{
      const W=canvas.offsetWidth,H=canvas.offsetHeight
      canvas.width=W;canvas.height=H
      const cx=W/2,cy=H/2,t=timeRef.current
      const typeGroups={Programme:[],Mentor:[],Company:[],Partner:[],ServiceProvider:[]}
      nodes.forEach(n=>typeGroups[n.type]?.push(n))
      const ringConfig={
        Programme:{r:Math.min(W,H)*.13,startAngle:-Math.PI/2},
        Company:{r:Math.min(W,H)*.32,startAngle:-Math.PI/2},
        Mentor:{r:Math.min(W,H)*.24,startAngle:Math.PI/4},
        Partner:{r:Math.min(W,H)*.39,startAngle:Math.PI},
        ServiceProvider:{r:Math.min(W,H)*.3,startAngle:-Math.PI/4},
      }
      Object.entries(typeGroups).forEach(([type,nodes])=>{
        const cfg=ringConfig[type]; if(!cfg)return
        nodes.forEach((n,i)=>{
            const a=cfg.startAngle+(i/Math.max(nodes.length,1))*Math.PI*2+Math.sin(t*.3+i*.7)*.015
            n.x=cx+cfg.r*Math.cos(a); n.y=cy+cfg.r*Math.sin(a)
          })
      })
      const pad=38
      for(let iter=0;iter<18;iter++){
        for(let i=0;i<nodes.length;i++){
          for(let j=i+1;j<nodes.length;j++){
            const a=nodes[i],b=nodes[j]
            let dx=b.x-a.x,dy=b.y-a.y
            let dist=Math.hypot(dx,dy)||0.01
            const minDist=a.radius+b.radius+28
            if(dist<minDist){
              const push=(minDist-dist)/2
              dx/=dist;dy/=dist
              a.x-=dx*push;a.y-=dy*push
              b.x+=dx*push;b.y+=dy*push
            }
          }
        }
        nodes.forEach(n=>{
          n.x=Math.max(pad+n.radius,Math.min(W-pad-n.radius,n.x))
          n.y=Math.max(pad+n.radius,Math.min(H-pad-n.radius-18,n.y))
        })
      }
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='rgba(37,99,235,.025)'
      ctx.beginPath();ctx.arc(cx,cy,Math.min(W,H)*.43,0,Math.PI*2);ctx.fill()
      const edgeLabels=[]
      allRelationships.forEach(rel=>{
        const nA=nodes.find(n=>n.id===rel.fromId)
        const nB=nodes.find(n=>n.id===rel.toId)
        if(!nA||!nB)return
        const fit=learnedData[rel.id]?.avgFit??rel.fitScore??70
        const isRisk=rel.status==='At-Risk',isReuse=!!rel.reusedFrom,alpha=fit/100
        const color=isRisk?`rgba(220,38,38,${alpha*.7})`:isReuse?`rgba(124,58,237,${alpha*.8})`:`rgba(5,150,105,${alpha*.7})`
        const dx=nB.x-nA.x,dy=nB.y-nA.y,dist=Math.hypot(dx,dy)||1
        const ux=dx/dist,uy=dy/dist
        const boundaryRadius=(node,dirX,dirY)=>{
          if(node.kind!=='programme')return node.radius
          const ax=Math.abs(dirX),ay=Math.abs(dirY)
          return node.radius/Math.max(ax+ay,0.01)
        }
        const startR=boundaryRadius(nA,ux,uy)
        const endR=boundaryRadius(nB,-ux,-uy)
        const sx=nA.x+ux*startR,sy=nA.y+uy*startR
        const ex=nB.x-ux*endR,ey=nB.y-uy*endR
        const mx=(sx+ex)/2,my=(sy+ey)/2
        const curve=((nA.id.charCodeAt(0)+nB.id.charCodeAt(0))%2===0?1:-1)*Math.min(52,dist*.18)
        const cxEdge=mx-uy*curve,cyEdge=my+ux*curve
        ctx.beginPath();ctx.moveTo(sx,sy)
        ctx.setLineDash(isReuse?[5,4]:[])
        ctx.quadraticCurveTo(cxEdge,cyEdge,ex,ey)
        ctx.strokeStyle=color;ctx.lineWidth=fit>80?3.2:2;ctx.stroke();ctx.setLineDash([])
        let lx=cxEdge,ly=cyEdge
        for(let iter=0;iter<14;iter++){
          nodes.forEach(n=>{
            const dx=lx-n.x,dy=ly-n.y,near=n.radius+34,distLabel=Math.hypot(dx,dy)||0.01
            if(distLabel<near){lx+=(dx/distLabel)*(near-distLabel)*.55;ly+=(dy/distLabel)*(near-distLabel)*.55}
          })
          edgeLabels.forEach(label=>{
            const dx=lx-label.x,dy=ly-label.y,near=44,distLabel=Math.hypot(dx,dy)||0.01
            if(distLabel<near){lx+=(dx/distLabel)*(near-distLabel)*.5;ly+=(dy/distLabel)*(near-distLabel)*.5}
          })
          lx=Math.max(24,Math.min(W-24,lx));ly=Math.max(24,Math.min(H-24,ly))
        }
        edgeLabels.push({x:lx,y:ly,color,fit})
      })
      edgeLabels.forEach(({x,y,color,fit})=>{
        ctx.fillStyle='rgba(255,255,255,0.98)';ctx.beginPath();ctx.roundRect(x-19,y-10,38,20,7);ctx.fill()
        ctx.strokeStyle='rgba(181,212,244,.95)';ctx.lineWidth=1.2;ctx.stroke()
        ctx.fillStyle=color;ctx.font='bold 10px IBM Plex Mono,monospace'
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fit+'%',x,y)
      })
      const nodeLabelBoxes=[]
      nodes.forEach(n=>{
        const isHov=n.id===hoveredId,r=n.radius+(isHov?4:0)
        ctx.beginPath()
        if(n.kind==='programme'){
          ctx.save();ctx.translate(n.x,n.y);ctx.rotate(Math.PI/4);ctx.roundRect(-(r+7),-(r+7),(r+7)*2,(r+7)*2,10);ctx.restore()
        }else{
          ctx.arc(n.x,n.y,r+5,0,Math.PI*2)
        }
        ctx.fillStyle='rgba(255,255,255,.96)';ctx.fill()
        ctx.shadowColor=n.color+'55';ctx.shadowBlur=isHov?18:8
        ctx.beginPath()
        if(n.kind==='programme'){
          ctx.save();ctx.translate(n.x,n.y);ctx.rotate(Math.PI/4);ctx.roundRect(-r,-r,r*2,r*2,9);ctx.restore()
        }else{
          ctx.arc(n.x,n.y,r,0,Math.PI*2)
        }
        ctx.fillStyle=n.color+(isHov?'30':'18');ctx.fill()
        ctx.strokeStyle=n.color+(isHov?'ff':'aa');ctx.lineWidth=isHov?3:2;ctx.stroke()
        ctx.shadowBlur=0
        ctx.fillStyle='#042C53';ctx.font=`bold ${n.kind==='programme'?13:11}px Syne,sans-serif`
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.initials,n.x,n.y)
        ctx.font='600 10px DM Sans,sans-serif'
        const labelW=Math.min(88,Math.max(36,ctx.measureText(n.label).width+14))
        let labelX=n.x,labelY=n.y+r+10
        for(let iter=0;iter<12;iter++){
          nodeLabelBoxes.forEach(box=>{
            const overlapX=(labelW+box.w)/2+8-Math.abs(labelX-box.x)
            const overlapY=(20+box.h)/2+6-Math.abs(labelY-box.y)
            if(overlapX>0&&overlapY>0)labelY+=overlapY
          })
          edgeLabels.forEach(label=>{
            const dx=labelX-label.x,dy=labelY-label.y,near=34,distLabel=Math.hypot(dx,dy)||0.01
            if(distLabel<near){labelX+=(dx/distLabel)*(near-distLabel)*.45;labelY+=(dy/distLabel)*(near-distLabel)*.45}
          })
          labelX=Math.max(labelW/2+8,Math.min(W-labelW/2-8,labelX))
          labelY=Math.max(16,Math.min(H-14,labelY))
        }
        nodeLabelBoxes.push({x:labelX,y:labelY,w:labelW,h:18})
        ctx.fillStyle='rgba(255,255,255,.97)';ctx.beginPath();ctx.roundRect(labelX-labelW/2,labelY-8,labelW,18,6);ctx.fill()
        ctx.strokeStyle='rgba(181,212,244,.8)';ctx.lineWidth=1;ctx.stroke()
        ctx.fillStyle=isHov?'#042C53':'#185FA5';ctx.textBaseline='middle';ctx.fillText(n.label,labelX,labelY)
      })
      timeRef.current+=.015
      animRef.current=requestAnimationFrame(draw)
    }
    draw()
    return()=>{if(animRef.current)cancelAnimationFrame(animRef.current)}
  },[hoveredId,allActors,allRelationships,learnedData])

  const handleClick=e=>{
    const rect=canvasRef.current.getBoundingClientRect()
    const mx=e.clientX-rect.left,my=e.clientY-rect.top
    const hit=nodesRef.current.find(n=>Math.hypot(n.x-mx,n.y-my)<n.radius+6)
    if(hit){
      const actor=allActors.find(a=>a.id===hit.id)
      const programme=PROGRAMMES.find(p=>p.id===hit.id)
      if(actor)setSelected({...actor,kind:'actor'})
      if(programme)setSelected({...programme,kind:'programme',type:'Programme',sector:programme.status,bio:programme.description,expertise:[programme.country,programme.status,programme.cohort]})
    }
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Ecosystem Graph</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Live view of all relationship entities — nodes = actors, edges = linkages</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {[['Strong (80%+)','#059669'],['Reused template','#7c3aed'],['At-Risk','#dc2626']].map(([l,c])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:'11px',color:'var(--t2)'}}>
              <span style={{color:c,fontFamily:'monospace',fontSize:'14px'}}>&#8212;</span>{l}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:12}}>
        <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <canvas ref={canvasRef} onClick={handleClick}
            onMouseMove={e=>{const rect=canvasRef.current.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;const hit=nodesRef.current.find(n=>Math.hypot(n.x-mx,n.y-my)<n.radius+6);setHoveredId(hit?.id||null);canvasRef.current.style.cursor=hit?'pointer':'default'}}
            style={{width:'100%',height:620,display:'block'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Node Types</div>
            {[...Object.entries(ACTOR_TYPES),['Programme',{label:'Programme / Cohort',color:'#2563eb'}]].map(([type,cfg])=>(
              <div key={type} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:10,height:10,borderRadius:type==='Programme'?2:'50%',transform:type==='Programme'?'rotate(45deg)':'none',background:cfg.color,flexShrink:0}}/>
                <div style={{fontSize:'12px',color:'var(--t1)'}}>{cfg.label}</div>
              </div>
            ))}
          </div>
          {selected?(
            <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:14,flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <Avatar initials={selected.avatar||selected.cohort?.slice(0,2)||selected.name?.slice(0,2)} color={selected.color||'#2563eb'} size={38}/>
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{selected.name}</div>
                  <div style={{fontSize:'11px',color:'var(--t2)'}}>{selected.type} · {selected.sector}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:'14px'}}>x</button>
              </div>
              <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.6,marginBottom:10}}>{selected.bio}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>{(selected.expertise||[]).map(e=><Tag key={e} variant="blue">{e}</Tag>)}</div>
              <div style={{fontSize:'11px',color:'var(--t3)',marginBottom:6}}>Relationships:</div>
              {allRelationships.filter(r=>r.fromId===selected.id||r.toId===selected.id).length===0 ? (
                <div style={{fontSize:'12px',color:'var(--t3)'}}>No relationships yet.</div>
              ) : allRelationships.filter(r=>r.fromId===selected.id||r.toId===selected.id).map(r=>{
                const other=allActors.find(a=>a.id===(r.fromId===selected.id?r.toId:r.fromId))||PROGRAMMES.find(p=>p.id===(r.fromId===selected.id?r.toId:r.fromId))
                const fit=learnedData[r.id]?.avgFit??r.fitScore??70
                return <div key={r.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:'11.5px',marginBottom:6}}><ScorePill score={fit} size="sm"/><span style={{color:'var(--t2)'}}>&#8596; {other?.name}</span></div>
              })}
            </div>
          ):(
            <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:14,flex:1}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>At-Risk Linkages</div>
              {allRelationships.filter(r=>r.status==='At-Risk').map(r=>{
                const aA=allActors.find(a=>a.id===r.fromId)||PROGRAMMES.find(p=>p.id===r.fromId),aB=allActors.find(a=>a.id===r.toId)||PROGRAMMES.find(p=>p.id===r.toId)
                return (
                  <div key={r.id} style={{background:'rgba(220,38,38,.05)',border:'1px solid rgba(220,38,38,.2)',borderRadius:7,padding:10,marginBottom:8}}>
                    <div style={{fontSize:'12px',fontWeight:600,marginBottom:3,color:'var(--t1)'}}>{aA?.name?.split(' ')[0]} &#8596; {aB?.name}</div>
                    <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:5}}>{r.aiReasoning?.[0]}</div>
                    <ScorePill score={learnedData[r.id]?.avgFit??r.fitScore??70} size="sm"/>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActorsPage({ allActors=ACTORS, allRelationships=RELATIONSHIPS, onAddActor, onUpdateActor }) {
  const [search,setSearch]=useState('')
  const [typeF,setTypeF]=useState('all')
  const [addOpen,setAddOpen]=useState(false)
  const [addDone,setAddDone]=useState(false)
  const [form,setForm]=useState({name:'',type:'Company',sector:'',location:'Malaysia',expertise:'',bio:''})
  const [editOpen,setEditOpen]=useState(false)
  const [editForm,setEditForm]=useState(null)

  const filtered=allActors.filter(a=>{
    if(typeF!=='all'&&a.type!==typeF)return false
    const q=search.toLowerCase()
    if(q&&!a.name.toLowerCase().includes(q)&&!a.sector.toLowerCase().includes(q))return false
    return true
  })

  const ACTOR_COLORS={Company:'#3b82f6',Mentor:'#a78bfa',Partner:'#10b981',ServiceProvider:'#f59e0b'}

  const handleAdd=()=>{
    if(!form.name.trim())return
    const newActor={
      id:`custom_${Date.now()}`,
      name:form.name,type:form.type,sector:form.sector||'General',
      location:form.location,
      expertise:form.expertise.split(',').map(s=>s.trim()).filter(Boolean),
      bio:form.bio,programmes:[],
      avatar:form.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      color:ACTOR_COLORS[form.type]||'#3b82f6',
    }
    onAddActor(newActor)
    setAddDone(true)
  }
  const openEdit=(actor)=>{
    setEditForm({
      ...actor,
      expertiseText:(actor.expertise||[]).join(', '),
      programmesText:(actor.programmes||[]).join(', '),
    })
    setEditOpen(true)
  }
  const handleEditSave=()=>{
    if(!editForm?.name?.trim())return
    const { expertiseText, programmesText, ...actorFields } = editForm
    onUpdateActor?.({
      ...actorFields,
      name:editForm.name.trim(),
      sector:editForm.sector||'General',
      expertise:(expertiseText||'').split(',').map(s=>s.trim()).filter(Boolean),
      programmes:(programmesText||'').split(',').map(s=>s.trim()).filter(Boolean),
      avatar:editForm.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      color:ACTOR_COLORS[editForm.type]||editForm.color||'#3b82f6',
    })
    setEditOpen(false)
    setEditForm(null)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Ecosystem Actors</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Companies, mentors, partners and service providers — the nodes of your ecosystem</div>
        </div>
        <Btn variant="primary" onClick={()=>setAddOpen(true)}>+ Add Actor</Btn>
      </div>

      {/* ADD ACTOR MODAL */}
      {addOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:500,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
            {!addDone ? (
              <>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:5}}>Add Actor</div>
                <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>Add a new company, mentor, partner, or service provider to the ecosystem.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Full Name *</div>
                    <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Siti Rahimah" style={inputStyle}/>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Actor Type *</div>
                    <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inputStyle}>
                      <option>Company</option>
                      <option>Mentor</option>
                      <option>Partner</option>
                      <option>ServiceProvider</option>
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Sector</div>
                  <input value={form.sector} onChange={e=>setForm(f=>({...f,sector:e.target.value}))} placeholder="e.g. FinTech, HealthTech" style={inputStyle}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Location</div>
                    <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Kuala Lumpur" style={inputStyle}/>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Expertise (comma-separated)</div>
                    <input value={form.expertise} onChange={e=>setForm(f=>({...f,expertise:e.target.value}))} placeholder="e.g. AI, Fundraising, B2B" style={inputStyle}/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>Bio</div>
                  <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Brief description of this actor's background and value…" style={{...inputStyle,minHeight:72,resize:'vertical'}}/>
                </div>
                <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:4}}>
                  <Btn variant="outline" onClick={()=>{setAddOpen(false);setForm({name:'',type:'Company',sector:'',location:'Malaysia',expertise:'',bio:''})}}>Cancel</Btn>
                  <Btn variant="primary" disabled={!form.name.trim()} onClick={handleAdd}>Add to Ecosystem</Btn>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'22px',color:'var(--blue2)'}}>&#10003;</div>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:6}}>Actor Added</div>
                <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:18,lineHeight:1.6}}>
                  <strong style={{color:'var(--t1)'}}>{form.name}</strong> has been added to the ecosystem as a <strong style={{color:'var(--t1)'}}>{form.type}</strong>.
                </div>
                <Btn variant="primary" onClick={()=>{setAddOpen(false);setAddDone(false);setForm({name:'',type:'Company',sector:'',location:'Malaysia',expertise:'',bio:''})}} style={{width:'100%',justifyContent:'center'}}>Done</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {editOpen && editForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(4,44,83,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--navy2)',borderRadius:14,padding:26,width:520,maxWidth:'100%',border:'1px solid var(--border)',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:'16px',fontWeight:700,color:'var(--t1)',marginBottom:5}}>Edit Actor</div>
            <p style={{fontSize:'12.5px',color:'var(--t2)',marginBottom:18,lineHeight:1.5}}>Changes update this actor everywhere they appear.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <FieldInput label="Full Name"><input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={inputStyle}/></FieldInput>
              <FieldInput label="Actor Type"><select value={editForm.type} onChange={e=>setEditForm(f=>({...f,type:e.target.value}))} style={inputStyle}><option>Company</option><option>Mentor</option><option>Partner</option><option>ServiceProvider</option></select></FieldInput>
            </div>
            <div style={{marginBottom:12}}>
              <FieldInput label="Sector"><input value={editForm.sector||''} onChange={e=>setEditForm(f=>({...f,sector:e.target.value}))} style={inputStyle}/></FieldInput>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <FieldInput label="Location"><input value={editForm.location||''} onChange={e=>setEditForm(f=>({...f,location:e.target.value}))} style={inputStyle}/></FieldInput>
              <FieldInput label="Programmes"><input value={editForm.programmesText||''} onChange={e=>setEditForm(f=>({...f,programmesText:e.target.value}))} placeholder="p1, p2" style={inputStyle}/></FieldInput>
            </div>
            <div style={{marginBottom:12}}><FieldInput label="Expertise"><input value={editForm.expertiseText||''} onChange={e=>setEditForm(f=>({...f,expertiseText:e.target.value}))} placeholder="AI, Fundraising, B2B" style={inputStyle}/></FieldInput></div>
            <div style={{marginBottom:14}}><FieldInput label="Bio"><textarea value={editForm.bio||''} onChange={e=>setEditForm(f=>({...f,bio:e.target.value}))} style={{...inputStyle,minHeight:82,resize:'vertical'}}/></FieldInput></div>
            <div style={{display:'flex',gap:9,justifyContent:'flex-end'}}>
              <Btn variant="outline" onClick={()=>{setEditOpen(false);setEditForm(null)}}>Cancel</Btn>
              <Btn variant="primary" onClick={handleEditSave}>Save Changes</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search actors…" style={{width:220}}/>
        {['all','Company','Mentor','Partner','ServiceProvider'].map(t=>(
          <button key={t} onClick={()=>setTypeF(t)} style={{padding:'6px 14px',borderRadius:7,fontSize:'12px',fontWeight:500,cursor:'pointer',border:typeF===t?'1px solid var(--blue3)':'1px solid var(--border)',color:typeF===t?'var(--blue2)':'var(--t2)',background:typeF===t?'rgba(37,99,235,.08)':'var(--navy4)',fontFamily:'inherit',transition:'all .15s'}}>
            {t==='all'?'All':ACTOR_TYPES[t]?.label}
          </button>
        ))}
        <div className="font-mono" style={{marginLeft:'auto',fontSize:'11px',color:'var(--t3)',alignSelf:'center'}}>{filtered.length} actors</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {filtered.map(a=>{
          const rels=allRelationships.filter(r=>r.fromId===a.id||r.toId===a.id)
          const avg=rels.length?Math.round(rels.reduce((s,r)=>s+r.fitScore,0)/rels.length):null
          return (
            <div key={a.id} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,padding:16,cursor:'pointer',transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border3)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Avatar initials={a.avatar} color={a.color} size={36}/>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>{a.name}</div>
                    <div style={{fontSize:'11px',color:'var(--t2)'}}>{ACTOR_TYPES[a.type]?.label} · {a.sector}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {avg&&<ScorePill score={avg} size="sm"/>}
                  <Btn variant="outline" size="sm" onClick={()=>openEdit(a)}>Edit</Btn>
                </div>
              </div>
              <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.6,marginBottom:10}}>{a.bio}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>{(a.expertise||[]).slice(0,3).map(e=><Tag key={e} variant="blue">{e}</Tag>)}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px',color:'var(--t3)'}}>
                <span>{a.location}</span>
                <span>{rels.length} relationships · {(a.programmes||[]).length} programmes</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AIMatchingPage({ geminiKey, setGeminiKey, onCloneTemplate, allActors=ACTORS }) {
  const [step,setStep]=useState(1)
  const [actorA,setActorA]=useState('')
  const [actorB,setActorB]=useState('')
  const [relType,setRelType]=useState('')
  const [programme,setProgramme]=useState('')
  const [template,setTemplate]=useState('')
  const [results,setResults]=useState(null)
  const [error,setError]=useState('')
  const [keyInput,setKeyInput]=useState(geminiKey)

  const canSubmit=actorA&&actorB&&relType&&programme

  const handleMatch=async()=>{
    setStep(2);setError('')
    const aA=allActors.find(a=>a.id===actorA)
    const aB=allActors.find(a=>a.id===actorB)||PROGRAMMES.find(p=>p.id===actorB)
    const prog=PROGRAMMES.find(p=>p.id===programme)
    const tmpl=template?REL_TEMPLATES.find(t=>t.id===template):null
    const prompt=`Analyse this ecosystem relationship for a Malaysian innovation accelerator programme.

RELATIONSHIP TYPE: ${relType}
PROGRAMME: ${prog?.name} (${prog?.cohort}, ${prog?.country})

ACTOR A:
- Name: ${aA?.name}
- Type: ${aA?.type}
- Sector: ${aA?.sector}
- Expertise: ${aA?.expertise?.join(', ')}
- Bio: ${aA?.bio}
- Previous programmes: ${aA?.programmes?.length||0}

ACTOR B:
- Name: ${aB?.name}
- Type: ${aB?.type||'Programme'}
- Sector: ${aB?.sector||'Programme Admin'}
- ${aB?.expertise?'Expertise: '+aB.expertise.join(', '):'Description: '+aB?.description}

${tmpl?`REUSE TEMPLATE: ${tmpl.name} (historical success rate: ${tmpl.successRate}%, avg fit: ${tmpl.avgFitScore}%)`:'No template — creating fresh relationship.'}

Return ONLY this JSON (integer scores 0-100, arrays of strings):
{
  "fitScore": 0-100,
  "trustScore": 0-100,
  "successProbability": 0-100,
  "reuseConfidence": 0-100,
  "reasons": ["reason1","reason2","reason3"],
  "risks": ["risk1","risk2"],
  "recommendedAction": "one clear action sentence",
  "relationshipHealth": "Strong|Moderate|At-Risk",
  "keyInsight": "one sentence summary of why this relationship works or doesn't"
}`
    try {
      const text=await geminiCall(geminiKey,prompt)
      const clean=text.replace(/```json|```/g,'').trim()
      const r=JSON.parse(clean)
      setResults({...r,actorA:aA,actorB:aB,programme:prog,relType,template:tmpl})
      setStep(3)
    } catch(e) {
      setError('Gemini API error: '+e.message)
      setStep(1)
    }
  }

  const healthColor=h=>h==='Strong'?'#059669':h==='Moderate'?'#d97706':'#dc2626'

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Legacy Matching Engine</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Gemini analyses ecosystem actor profiles to create scored, reusable relationship entities</div>
        </div>
        <GeminiBadge/>
      </div>

      {/* API key config */}
      <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
        <div style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>Gemini API Key</div>
        <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="AIzaSy... (get free key at aistudio.google.com)" style={{...inputStyle,flex:1}}/>
        <Btn variant="primary" size="sm" onClick={()=>{setGeminiKey(keyInput);alert('API key saved for this session.')}}>Save</Btn>
      </div>

      {step===1&&(
        <div style={{maxWidth:680}}>
          <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--t1)'}}>Configure New Relationship</div>
              <div style={{fontSize:'11px',color:'var(--t3)'}}>— Gemini will score and reason this linkage</div>
            </div>
            <div style={{padding:18,display:'grid',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FieldInput label="Actor A"><select value={actorA} onChange={e=>setActorA(e.target.value)} style={inputStyle}><option value="">Select actor…</option>{ACTORS.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</select></FieldInput>
                <FieldInput label="Actor B / Target"><select value={actorB} onChange={e=>setActorB(e.target.value)} style={inputStyle}><option value="">Select actor or programme…</option><optgroup label="Actors">{ACTORS.filter(a=>a.id!==actorA).map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</optgroup><optgroup label="Programmes">{PROGRAMMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup></select></FieldInput>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FieldInput label="Relationship Type"><select value={relType} onChange={e=>setRelType(e.target.value)} style={inputStyle}><option value="">Select type…</option>{REL_TYPES.map(t=><option key={t}>{t}</option>)}</select></FieldInput>
                <FieldInput label="Programme Context"><select value={programme} onChange={e=>setProgramme(e.target.value)} style={inputStyle}><option value="">Select programme…</option>{PROGRAMMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FieldInput>
              </div>
              <FieldInput label="Reuse Template (optional)"><select value={template} onChange={e=>setTemplate(e.target.value)} style={inputStyle}><option value="">Create fresh relationship…</option>{REL_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name} (success rate: {t.successRate}%)</option>)}</select></FieldInput>
              {(actorA||actorB)&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[ACTORS.find(a=>a.id===actorA),ACTORS.find(a=>a.id===actorB)||PROGRAMMES.find(p=>p.id===actorB)].map((actor,i)=>actor?(
                    <div key={i} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:8,padding:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Avatar initials={actor.avatar} color={actor.color||'#3b82f6'} size={28}/><div><div style={{fontSize:'12px',fontWeight:700,color:'var(--t1)'}}>{actor.name}</div><div style={{fontSize:'10.5px',color:'var(--t2)'}}>{actor.type||'Programme'}</div></div></div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:3}}>{(actor.expertise||[]).slice(0,3).map(e=><Tag key={e} variant="blue">{e}</Tag>)}</div>
                    </div>
                  ):null)}
                </div>
              )}
              {error&&<div style={{padding:10,background:'rgba(220,38,38,.1)',border:'1px solid rgba(220,38,38,.25)',borderRadius:7,fontSize:'12px',color:'#dc2626'}}>{error}</div>}
              <Btn variant="primary" size="lg" disabled={!canSubmit||!geminiKey} onClick={handleMatch} style={{width:'100%',justifyContent:'center'}}>
                {!geminiKey?'Save API key above to continue':'Analyse with Vertex AI'}
              </Btn>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Available Relationship Templates</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {REL_TEMPLATES.map(t=>(
                <div key={t.id} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:8,padding:12,cursor:'pointer',transition:'border-color .15s'}} onClick={()=>setTemplate(t.id)}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border3)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{fontSize:'12px',fontWeight:700,marginBottom:4,color:'var(--t1)'}}>{t.name}</div>
                  <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:7}}>{t.type}</div>
                  <div style={{display:'flex',gap:8}}>
                    <span className="font-mono" style={{fontSize:'11px',color:'#059669'}}>&#10003; {t.successRate}% success</span>
                    <span className="font-mono" style={{fontSize:'11px',color:'var(--t3)'}}>&times;{t.usedCount} used</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step===2&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 20px',gap:16}}>
          <div style={{position:'relative',width:56,height:56}}>
            <div className="spin" style={{width:56,height:56,border:'2px solid var(--border)',borderTopColor:'var(--blue3)',borderRadius:'50%',position:'absolute'}}/>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'var(--blue3)'}}>&#10022;</div>
          </div>
          <div className="font-display" style={{fontSize:'16px',fontWeight:700,color:'var(--t1)'}}>Gemini is analysing the relationship…</div>
          <div style={{fontSize:'12px',color:'var(--t2)',textAlign:'center',maxWidth:380,lineHeight:1.7}}>Processing actor profiles, expertise vectors, programme context, and historical outcome signals to generate a scored, reusable relationship entity.</div>
          <GeminiBadge/>
        </div>
      )}

      {step===3&&results&&(
        <div style={{maxWidth:680}} className="fade-up">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div className="font-display" style={{fontSize:'16px',fontWeight:700,color:'var(--t1)'}}>Relationship Analysis Complete</div>
            <div style={{display:'flex',gap:6}}><GeminiBadge/>{results.template&&<ReusedBadge/>}</div>
          </div>
          <div style={{padding:14,background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.2)',borderRadius:10,marginBottom:14}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Gemini Key Insight</div>
            <div style={{fontSize:'13px',color:'var(--t1)',lineHeight:1.6,fontStyle:'italic'}}>"{results.keyInsight}"</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
            {[['Fit Score',results.fitScore],['Trust Score',results.trustScore],['Success Prob.',results.successProbability],['Reuse Confidence',results.reuseConfidence]].map(([l,v])=>(
              <div key={l} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
                <div className="font-mono" style={{fontSize:'22px',fontWeight:700,color:v>=80?'#059669':v>=65?'#d97706':'#dc2626'}}>{v}%</div>
                <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.5px',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <div style={{padding:'5px 12px',borderRadius:6,fontSize:'12px',fontWeight:700,background:`${healthColor(results.relationshipHealth)}18`,color:healthColor(results.relationshipHealth),border:`1px solid ${healthColor(results.relationshipHealth)}44`}}>{results.relationshipHealth} Relationship</div>
            <div style={{fontSize:'12px',color:'var(--t2)'}}>{results.relType} · {results.programme?.name}</div>
          </div>
          <div style={{background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.18)',borderRadius:8,padding:12,marginBottom:12}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'var(--blue2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Why This Works</div>
            {results.reasons?.map((r,i)=><div key={i} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'var(--blue3)',flexShrink:0}}>&#8594;</span>{r}</div>)}
          </div>
          {results.risks?.length>0&&(
            <div style={{background:'rgba(220,38,38,.05)',border:'1px solid rgba(220,38,38,.2)',borderRadius:8,padding:12,marginBottom:12}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Risks to Monitor</div>
              {results.risks.map((r,i)=><div key={i} style={{display:'flex',gap:7,fontSize:'12px',color:'var(--t2)',marginBottom:5,lineHeight:1.5}}><span style={{color:'#dc2626',flexShrink:0}}>&#9888;</span>{r}</div>)}
            </div>
          )}
          <div style={{background:'rgba(5,150,105,.06)',border:'1px solid rgba(5,150,105,.2)',borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'#059669',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Recommended Action</div>
            <div style={{fontSize:'13px',lineHeight:1.6,color:'var(--t1)'}}>{results.recommendedAction}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn variant="success" style={{flex:1}} onClick={()=>alert('Relationship created and added to the ecosystem graph.')}>Create This Relationship</Btn>
            <Btn variant="outline" onClick={()=>{onCloneTemplate&&onCloneTemplate({id:`tmpl_${Date.now()}`,name:`${results.relType} — ${results.actorA?.name}`,type:results.relType,fromName:results.actorA?.name,toName:results.actorB?.name,fitScore:results.fitScore,trustScore:results.trustScore,outcomeScore:results.successProbability,notes:results.keyInsight,targetProg:'',createdAt:new Date().toLocaleString()});alert('Saved as reusable template.')}}>Clone as Template</Btn>
            <Btn variant="ghost" onClick={()=>{setStep(1);setResults(null)}}>Redo</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// DatabaseIngestPage verbatim from source with recoloured inline styles
function DatabaseIngestPage({ onActorsImported }) {
  const [step,setStep]=useState('upload')
  const [inputMode,setInputMode]=useState('paste')
  const [fileType,setFileType]=useState(null)
  const [rawText,setRawText]=useState('')
  const [actorCSV,setActorCSV]=useState('')
  const [relCSV,setRelCSV]=useState('')
  const [programme,setProgramme]=useState('Cradle CIP 2024')
  const [actors,setActors]=useState([])
  const [relationships,setRelationships]=useState([])
  const [results,setResults]=useState(null)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const jsonFileRef=useRef(),actorFileRef=useRef(),relFileRef=useRef()
  const readFile=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(file)})
  const handleFileInput=async(e,slot)=>{const file=e.target.files[0];if(!file)return;const text=await readFile(file);const ext=file.name.split('.').pop().toLowerCase();if(ext==='json'){setFileType('json');setRawText(text)}else if(slot==='actors'){setFileType('csv');setActorCSV(text)}else{setRelCSV(text)}}
  const handleDrop=useCallback(async(e,slot)=>{e.preventDefault();const file=e.dataTransfer.files[0];if(!file)return;const text=await readFile(file);const ext=file.name.split('.').pop().toLowerCase();if(ext==='json'){setFileType('json');setRawText(text)}else if(slot==='actors'){setFileType('csv');setActorCSV(text)}else{setRelCSV(text)}},[])
  const tcol=type=>({Company:'#3b82f6',Mentor:'#a78bfa',Partner:'#10b981',ServiceProvider:'#f59e0b'}[type]||'#3b82f6')
  const normActors=(raw,fmt)=>fmt==='json'?(raw.actors||[]).map((a,i)=>({id:`actor_${i}_${Date.now()}`,name:a.name,type:a.type,sector:a.sector||'General',stage:a.stage||'',location:a.location||'Malaysia',expertise:Array.isArray(a.expertise)?a.expertise:(a.expertise||'').split(',').map(s=>s.trim()).filter(Boolean),bio:a.bio||'',avatar:(a.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),color:tcol(a.type)})):raw.map((row,i)=>({id:`actor_${i}_${Date.now()}`,name:row.name,type:row.type,sector:row.sector||'General',stage:row.stage||'',location:row.location||'Malaysia',expertise:(row.expertise||'').replace(/"/g,'').split(',').map(s=>s.trim()).filter(Boolean),bio:row.bio||'',avatar:(row.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),color:tcol(row.type)}))
  const parseCSV=text=>{const lines=text.trim().split('\n').filter(Boolean);if(lines.length<2)return[];const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,''));return lines.slice(1).map(line=>{const vals=[];let cur='',inQ=false;for(const ch of line){if(ch==='"')inQ=!inQ;else if(ch===','&&!inQ){vals.push(cur.trim());cur=''}else cur+=ch}vals.push(cur.trim());const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||''});return obj})}
  const normRels=(raw,fmt,actors)=>{const findA=name=>actors.find(a=>a.name.toLowerCase().trim()===(name||'').toLowerCase().trim());const rows=fmt==='json'?raw.relationships||[]:raw;return rows.map((r,i)=>{const from=fmt==='json'?r.from:r.from_name,to=fmt==='json'?r.to:r.to_name,fromA=findA(from),toA=findA(to);return{id:`rel_${i}_${Date.now()}`,sourceUserId:fromA?.id||from,targetUserId:toA?.id||to,fromName:from,toName:to,type:r.type||'Mentor↔Company',programme:r.programme||'Imported Programme',fitScore:Number(r.fit_score||r.fitScore||75),strengthScore:Number(r.fit_score||r.fitScore||75),trustScore:78,communicationScore:80,successProbability:76,status:r.status||'Active',health:Number(r.fit_score||r.fitScore||75)>=80?'Strong':'Moderate',insight:'Imported relationship from database ingest.',imported:true}})}
  const fakeAnalyze=rels=>rels.map(rel=>{const s=rel.fitScore||75;return{...rel,trustScore:s>=80?88:s>=65?74:52,communicationScore:s>=80?90:s>=65?72:50,successProbability:s>=80?86:s>=65?70:48,health:s>=80?'Strong':s>=65?'Moderate':'At-Risk',insight:s>=80?'Strong alignment and good collaboration potential.':s>=65?'Useful but may need active follow-up.':'Needs intervention or better matching.',action:s>=80?'Maintain regular engagement.':s>=65?'Schedule a check-in session.':'Review and provide support.'}})
  const handlePreview=()=>{setError('');try{let pA=[],pR=[];if(fileType==='json'||rawText.trim().startsWith('{')){const json=JSON.parse(rawText);pA=normActors(json,'json');pR=normRels(json,'json',pA)}else{const aRows=parseCSV(actorCSV),rRows=relCSV?parseCSV(relCSV):[];pA=normActors(aRows,'csv');pR=normRels(rRows,'csv',pA)}if(!pA.length)throw new Error('No actors found.');setActors(pA);setRelationships(pR);setStep('preview')}catch(err){setError('Parse error: '+err.message)}}
  const handleAnalyze=()=>{const enriched=fakeAnalyze(relationships);setResults({actors,enrichedRelationships:enriched,ecosystemSummary:'The imported ecosystem has usable relationship data. Strong relationships should be maintained, while moderate or at-risk relationships need follow-up.',strongCount:enriched.filter(r=>r.health==='Strong').length,atRiskCount:enriched.filter(r=>r.health==='At-Risk').length,avgFitScore:enriched.length?Math.round(enriched.reduce((s,r)=>s+r.fitScore,0)/enriched.length):0});setStep('results')}
  const saveToFirebase=async()=>{try{setSaving(true);if(onActorsImported)onActorsImported(actors,results?.enrichedRelationships||[]);alert('Saved to Firebase successfully!')}catch(err){alert('Failed to save. Check backend is running.')}finally{setSaving(false)}}
  const handleReset=()=>{setStep('upload');setFileType(null);setRawText('');setActorCSV('');setRelCSV('');setActors([]);setRelationships([]);setResults(null);setError('')}

  const taStyle={width:'100%',background:'var(--navy4)',color:'var(--t1)',border:'1px solid var(--border)',borderRadius:8,padding:12,fontFamily:'monospace',fontSize:12,outline:'none',resize:'vertical'}

  if(step==='upload')return(
    <div>
      <div style={{marginBottom:20}}>
        <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Database Ingest</h1>
        <p style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Paste or upload actors and relationships. Then save them into Firebase.</p>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <Btn variant={inputMode==='paste'?'primary':'outline'} onClick={()=>setInputMode('paste')}>Paste Data</Btn>
        <Btn variant={inputMode==='file'?'primary':'outline'} onClick={()=>setInputMode('file')}>Upload File</Btn>
      </div>
      {inputMode==='paste'?(
        <div>
          <textarea value={rawText||actorCSV} onChange={e=>{const v=e.target.value;if(v.trim().startsWith('{')){setFileType('json');setRawText(v);setActorCSV('')}else{setFileType('csv');setActorCSV(v);setRawText('')}}} placeholder='{ "actors": [...], "relationships": [...] }' style={{...taStyle,minHeight:260}}/>
          {fileType==='csv'&&<textarea value={relCSV} onChange={e=>setRelCSV(e.target.value)} placeholder="from_name,to_name,type,programme,fit_score,status" style={{...taStyle,minHeight:120,marginTop:12}}/>}
        </div>
      ):(
        <div style={{display:'grid',gap:12}}>
          {[['Upload JSON','json',jsonFileRef,'json'],['Upload Actors CSV','actors',actorFileRef,'csv'],['Upload Relationships CSV','rels',relFileRef,'csv']].map(([label,slot,ref,accept])=>(
            <div key={label}>
              <div onClick={()=>ref.current.click()} onDrop={e=>handleDrop(e,slot)} onDragOver={e=>e.preventDefault()} style={{border:`2px dashed var(--border2)`,borderRadius:10,padding:22,cursor:'pointer',textAlign:'center',background:'var(--navy4)'}}>
                <div style={{fontSize:'22px',color:'var(--blue3)'}}>&#8679;</div>
                <div style={{fontWeight:700,color:'var(--t1)'}}>{label}</div>
                <div style={{fontSize:'11px',color:'var(--t3)'}}>Click or drag file here</div>
              </div>
              <input ref={ref} type="file" accept={`.${accept}`} hidden onChange={e=>handleFileInput(e,slot)}/>
            </div>
          ))}
        </div>
      )}
      <div style={{marginTop:16}}>
        <label style={{fontSize:'12px',color:'var(--t2)'}}>Programme Name</label>
        <input value={programme} onChange={e=>setProgramme(e.target.value)} style={{...inputStyle,marginTop:6}}/>
      </div>
      {error&&<div style={{marginTop:12,padding:12,borderRadius:8,background:'rgba(220,38,38,.1)',color:'#dc2626'}}>{error}</div>}
      <Btn variant="primary" size="lg" style={{marginTop:16}} disabled={!rawText&&!actorCSV} onClick={handlePreview}>Preview Data</Btn>
    </div>
  )

  if(step==='preview')return(
    <div>
      <h1 style={{fontSize:'20px',fontWeight:700,color:'var(--t1)',marginBottom:16}}>Preview Data</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[['Actors',actors,a=><div key={a.id} style={{padding:10,borderBottom:'1px solid var(--border)'}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar initials={a.avatar} color={a.color} size={28}/><div><strong style={{color:'var(--t1)'}}>{a.name}</strong><div style={{fontSize:11,color:'var(--t2)'}}>{a.type} · {a.sector}</div></div></div></div>],
          ['Relationships',relationships,r=><div key={r.id} style={{padding:10,borderBottom:'1px solid var(--border)'}}><strong style={{color:'var(--t1)'}}>{r.fromName} &#8596; {r.toName}</strong><div style={{fontSize:11,color:'var(--t2)'}}>{r.type} · Fit: {r.fitScore}</div></div>]
        ].map(([title,data,render])=>(
          <div key={title} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:12,borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--t1)'}}>{title} ({data.length})</div>
            <div>{data.length===0?<p style={{color:'var(--t2)',padding:12}}>None found.</p>:data.map(render)}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,display:'flex',gap:10}}>
        <Btn variant="outline" onClick={handleReset}>Back</Btn>
        <Btn variant="primary" onClick={handleAnalyze}>Analyze Data</Btn>
      </div>
    </div>
  )

  if(step==='results'&&results){const rels=results.enrichedRelationships;return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}>
        <div><h1 style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Analysis Complete</h1><p style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Review relationship scores, then save to Firebase.</p></div>
        <GeminiBadge/>
      </div>
      <div style={{padding:14,background:'rgba(37,99,235,.07)',border:'1px solid rgba(37,99,235,.2)',borderRadius:10,marginBottom:16}}>
        <strong style={{color:'var(--t1)'}}>Ecosystem Summary</strong>
        <p style={{fontSize:13,color:'var(--t2)',marginTop:4}}>{results.ecosystemSummary}</p>
        <p style={{fontSize:12,color:'var(--t2)',marginTop:4}}>Average Fit: {results.avgFitScore}% · Strong: {results.strongCount} · At-Risk: {results.atRiskCount}</p>
      </div>
      <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        <div style={{padding:12,borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--t1)'}}>Scored Relationships ({rels.length})</div>
        {rels.map(rel=>(
          <div key={rel.id} style={{padding:12,borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><strong style={{flex:1,color:'var(--t1)'}}>{rel.fromName} &#8596; {rel.toName}</strong><ScorePill score={rel.fitScore} size="sm"/></div>
            <div style={{marginTop:6}}><Tag variant="blue">{rel.type}</Tag><Tag variant={rel.health==='Strong'?'green':rel.health==='At-Risk'?'orange':'cyan'}>{rel.health}</Tag></div>
            <p style={{fontSize:12,color:'var(--t2)',marginTop:4}}>{rel.insight}</p>
            <p style={{fontSize:12,color:'#059669',marginTop:3}}>{rel.action}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10}}>
        <Btn variant="outline" onClick={handleReset}>Upload New Data</Btn>
        <Btn variant="success" onClick={saveToFirebase} disabled={saving}>{saving?'Saving...':'Save to Firebase'}</Btn>
      </div>
    </div>
  )}
  return null
}

function TemplatesPage({ templates }) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Saved Templates</h1>
          <div style={{fontSize:'12px',color:'var(--t2)',marginTop:3}}>Reusable relationship templates cloned from past programmes</div>
        </div>
      </div>
      {templates.length===0 ? (
        <div style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
          <div style={{fontSize:'32px',marginBottom:12,color:'var(--t3)'}}>&#9645;</div>
          <div style={{fontSize:'15px',fontWeight:600,color:'var(--t1)',marginBottom:6}}>No templates saved yet</div>
          <div style={{fontSize:'13px',color:'var(--t2)',maxWidth:360,margin:'0 auto',lineHeight:1.6}}>Open any relationship from the Relationships page and click <strong>"Clone as Template"</strong> to save it here for future cohorts.</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
          {templates.map(t=>(
            <div key={t.id} style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,padding:18,transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border3)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{fontSize:'14px',fontWeight:700,color:'var(--t1)',marginBottom:3}}>{t.name}</div>
                  <div style={{fontSize:'11px',color:'var(--t2)'}}>{t.type}</div>
                </div>
                <ReusedBadge/>
              </div>
              <div style={{fontSize:'12px',color:'var(--t2)',marginBottom:10}}>
                <strong style={{color:'var(--t1)'}}>{t.fromName}</strong> &#8596; <strong style={{color:'var(--t1)'}}>{t.toName}</strong>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                {[['Fit',`${t.fitScore}%`],['Trust',`${t.trustScore}%`],['Outcome',`${t.outcomeScore}%`]].map(([l,v])=>(
                  <div key={l} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px',textAlign:'center'}}>
                    <div className="font-mono" style={{fontSize:'16px',fontWeight:700,color:'var(--t1)'}}>{v}</div>
                    <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.4px',marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              {t.notes && <div style={{fontSize:'12px',color:'var(--t2)',fontStyle:'italic',marginBottom:8,padding:'8px 10px',background:'var(--navy4)',borderRadius:6}}>{t.notes}</div>}
              {t.targetProg && (
                <div style={{fontSize:'11.5px',color:'var(--t2)',marginBottom:8}}>
                  Target: <strong style={{color:'var(--t1)'}}>{PROGRAMMES.find(p=>p.id===t.targetProg)?.name||t.targetProg}</strong>
                </div>
              )}
              <div style={{fontSize:'11px',color:'var(--t3)',borderTop:'1px solid var(--border)',paddingTop:8}}>Created {t.createdAt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VertexDemoPage() {
  const [fromId, setFromId] = useState('a6')
  const [toId, setToId] = useState('a1')
  const [relType, setRelType] = useState('Mentor<->Company')
  const [programmeId, setProgrammeId] = useState('p1')
  const [message, setMessage] = useState('Dr. Amirah helped NexaTech refine its AI product roadmap, but the next milestone needs clearer weekly accountability and investor follow-up.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const fromActor = ACTORS.find(a=>a.id===fromId)
  const toActor = ACTORS.find(a=>a.id===toId)
  const programme = PROGRAMMES.find(p=>p.id===programmeId)

  const runDemo = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await analyzeRelationship({
        message,
        fromActor,
        toActor,
        relType,
        programme: programme?.name,
      })

      if (data?.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Unable to analyze this relationship')
    } finally {
      setLoading(false)
    }
  }

  const resetSample = () => {
    setFromId('a6')
    setToId('a1')
    setRelType('Mentor<->Company')
    setProgrammeId('p1')
    setMessage('Dr. Amirah helped NexaTech refine its AI product roadmap, but the next milestone needs clearer weekly accountability and investor follow-up.')
    setResult(null)
    setError('')
  }

  const scoreRows = [
    ['Trust', result?.trustScore],
    ['Communication', result?.communicationScore],
    ['Fit', result?.fitScore],
    ['Success', result?.successProbability],
  ].filter(([,value])=>typeof value === 'number')

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <Sparkles size={18} color="var(--blue2)"/>
            <h1 className="font-display" style={{fontSize:'20px',fontWeight:700,color:'var(--t1)'}}>Vertex AI Demo</h1>
          </div>
          <p style={{fontSize:'12.5px',color:'var(--t2)',lineHeight:1.7,maxWidth:680}}>
            Send a sample ecosystem relationship to your Firebase backend. The server uses @google/genai with Vertex AI when GOOGLE_GENAI_USE_VERTEXAI is true.
          </p>
        </div>
        <GeminiBadge/>
      </div>

      <div className="vertex-demo-grid">
        <section style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,padding:18}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:14}}>Demo Input</div>
          <div style={{display:'grid',gap:12}}>
            <FieldInput label="From Actor">
              <select value={fromId} onChange={e=>setFromId(e.target.value)} style={inputStyle}>
                {ACTORS.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </FieldInput>
            <FieldInput label="To Actor">
              <select value={toId} onChange={e=>setToId(e.target.value)} style={inputStyle}>
                {ACTORS.filter(a=>a.id!==fromId).map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </FieldInput>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <FieldInput label="Relationship">
                <select value={relType} onChange={e=>setRelType(e.target.value)} style={inputStyle}>
                  <option>Mentor&lt;-&gt;Company</option>
                  <option>Company&lt;-&gt;Programme</option>
                  <option>Partner&lt;-&gt;Programme</option>
                  <option>ServiceProvider&lt;-&gt;Company</option>
                </select>
              </FieldInput>
              <FieldInput label="Programme">
                <select value={programmeId} onChange={e=>setProgrammeId(e.target.value)} style={inputStyle}>
                  {PROGRAMMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FieldInput>
            </div>
            <FieldInput label="Context">
              <textarea value={message} onChange={e=>setMessage(e.target.value)} style={{...inputStyle,minHeight:132,resize:'vertical',lineHeight:1.6}}/>
            </FieldInput>
          </div>

          {error && (
            <div style={{display:'flex',gap:8,alignItems:'flex-start',marginTop:14,padding:12,borderRadius:8,background:'rgba(220,38,38,.08)',border:'1px solid rgba(220,38,38,.2)',color:'#dc2626'}}>
              <AlertCircle size={16} style={{marginTop:1,flexShrink:0}}/>
              <div style={{fontSize:'12px',lineHeight:1.5}}>{error}</div>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>
            <Btn variant="primary" size="lg" onClick={runDemo} disabled={loading || !message.trim()}>
              <Send size={14}/>{loading ? 'Analyzing...' : 'Run Vertex Demo'}
            </Btn>
            <Btn variant="outline" size="lg" onClick={resetSample} disabled={loading}>
              <RotateCcw size={14}/>Reset
            </Btn>
          </div>
        </section>

        <section style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:12,padding:18,minHeight:430}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:12}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>AI Assessment</div>
              <div style={{fontSize:'11.5px',color:'var(--t2)',marginTop:3}}>{fromActor?.name} to {toActor?.name}</div>
            </div>
            {result?.relationshipHealth && <Tag variant={result.relationshipHealth==='Strong'?'green':result.relationshipHealth==='At-Risk'?'orange':'cyan'}>{result.relationshipHealth}</Tag>}
          </div>

          {!result && !loading && (
            <div style={{height:315,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',border:'1px dashed var(--border2)',borderRadius:10,background:'var(--navy4)',padding:28}}>
              <div>
                <Sparkles size={28} color="var(--blue3)" style={{marginBottom:10}}/>
                <div style={{fontWeight:700,color:'var(--t1)',marginBottom:6}}>Ready for a live backend call</div>
                <div style={{fontSize:'12px',color:'var(--t2)',lineHeight:1.7,maxWidth:360}}>Start the backend on port 5000, then run the demo to render the JSON returned by your Firebase/Express endpoint.</div>
              </div>
            </div>
          )}

          {loading && (
            <div style={{height:315,display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'var(--blue2)',fontWeight:700}}>
              <span className="spin" style={{width:18,height:18,border:'2px solid var(--border2)',borderTopColor:'var(--blue2)',borderRadius:'50%'}}/>
              Calling Vertex AI through backend
            </div>
          )}

          {result && (
            <div className="fade-up">
              {scoreRows.length > 0 && (
                <div className="vertex-score-grid">
                  {scoreRows.map(([label,value])=>(
                    <div key={label} style={{background:'var(--navy4)',border:'1px solid var(--border)',borderRadius:8,padding:10}}>
                      <div style={{fontSize:'10px',color:'var(--t3)',textTransform:'uppercase',fontWeight:700,marginBottom:5}}>{label}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <ScoreBar value={value}/>
                        <ScorePill score={value} size="sm"/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{padding:14,borderRadius:10,background:'rgba(37,99,235,.07)',border:'1px solid rgba(37,99,235,.18)',marginBottom:12}}>
                <div style={{fontSize:'11px',textTransform:'uppercase',fontWeight:700,color:'var(--blue2)',marginBottom:5}}>Insight</div>
                <p style={{fontSize:'13px',color:'var(--t1)',lineHeight:1.7}}>{result.insight || result.raw_response || 'No insight returned.'}</p>
              </div>

              {Array.isArray(result.reasons) && result.reasons.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'var(--t1)',marginBottom:7}}>Reasons</div>
                  <div style={{display:'grid',gap:7}}>
                    {result.reasons.map((reason,idx)=><div key={idx} style={{fontSize:'12.5px',color:'var(--t2)',lineHeight:1.55,padding:'8px 10px',background:'var(--navy4)',borderRadius:7}}>{reason}</div>)}
                  </div>
                </div>
              )}

              {Array.isArray(result.risks) && result.risks.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#92400e',marginBottom:7}}>Risks</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{result.risks.map((risk,idx)=><Tag key={idx} variant="orange">{risk}</Tag>)}</div>
                </div>
              )}

              {result.recommendedAction && (
                <div style={{padding:12,borderRadius:9,background:'rgba(5,150,105,.08)',border:'1px solid rgba(5,150,105,.2)',color:'#065f46',fontSize:'12.5px',lineHeight:1.6}}>
                  <strong>Recommended action:</strong> {result.recommendedAction}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


// ─── LANDING SCREEN ───────────────────────────────────────────────────────────
function LandingScreen({ onEnter }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'40px 20px',position:'relative',background:'var(--navy)'}}>
      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',backgroundSize:'44px 44px',opacity:0.4,pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
        <div className="font-mono" style={{fontSize:'11px',fontWeight:600,color:'var(--blue2)',letterSpacing:'3px',textTransform:'uppercase',marginBottom:8}}>BondB</div>
        <div className="font-mono" style={{fontSize:'10px',color:'var(--t3)',letterSpacing:'2px',marginBottom:10}}>ECOSYSTEM INTELLIGENCE PLATFORM</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:48,padding:'4px 10px',borderRadius:5,background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.25)',fontSize:'10.5px',color:'var(--blue2)',fontWeight:600}}>
          Powered by Vertex AI
        </div>
        <h1 className="font-display" style={{fontSize:'34px',fontWeight:800,marginBottom:12,lineHeight:1.2,color:'var(--t1)'}}>
          Automating Ecosystem Linkages<br/>
          <span style={{color:'var(--blue2)'}}>Instead of Manual Coordination</span>
        </h1>
        <p style={{fontSize:'13px',color:'var(--t2)',maxWidth:520,lineHeight:1.8,marginBottom:44}}>
          An AI-enabled platform that treats ecosystem relationships as reusable, programmable entities — so mentor-to-company, company-to-programme, and partner-to-initiative linkages can be created, governed, and reused automatically across cohorts and geographies.
        </p>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center',marginBottom:48}}>
          {[
            {role:'admin',   name:'Programme Admin',   desc:'Manage cohorts, match actors, track engagement',    badge:'ADMIN VIEW',   bc:'var(--blue2)', bb:'rgba(37,99,235,.1)',  bdr:'rgba(37,99,235,.3)'},
            {role:'mentor',  name:'Mentor',            desc:'View your company assignments and session outcomes', badge:'MENTOR VIEW',  bc:'#7c3aed',      bb:'rgba(124,58,237,.1)', bdr:'rgba(124,58,237,.3)'},
            {role:'company', name:'Company / Startup', desc:'See your programme linkages, mentors, and partners', badge:'COMPANY VIEW', bc:'#059669',      bb:'rgba(5,150,105,.1)',  bdr:'rgba(5,150,105,.3)'},
          ].map(c=>(
            <div key={c.role} onClick={()=>onEnter(c.role)}
              style={{background:'var(--navy3)',border:'1px solid var(--border)',borderRadius:16,padding:'28px 24px',width:200,cursor:'pointer',transition:'all .22s',textAlign:'center'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.borderColor=c.bdr;e.currentTarget.style.boxShadow=`0 18px 40px ${c.bb}`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none'}}>
              <div className="font-display" style={{fontSize:'15px',fontWeight:700,marginBottom:7,color:'var(--t1)'}}>{c.name}</div>
              <div style={{fontSize:'11.5px',color:'var(--t2)',lineHeight:1.65,marginBottom:14}}>{c.desc}</div>
              <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:'10px',fontWeight:700,letterSpacing:'0.5px',background:c.bb,border:`1px solid ${c.bdr}`,color:c.bc}}>{c.badge}</span>
            </div>
          ))}
        </div>
        <div style={{maxWidth:600,padding:'16px 20px',background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.15)',borderRadius:12,fontSize:'12px',color:'var(--t2)',lineHeight:1.8}}>
          <div style={{fontWeight:700,color:'var(--blue2)',marginBottom:6}}>BondB · MyHack 2026 · Cradle Fund · Build With AI KL</div>
          "How might we design an AI-enabled platform system that treats ecosystem relationships as first-class, programmable entities, so that linkages can be created, managed, reused, and improved automatically across programmes, countries, and ecosystem actors?"
        </div>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const TABS = [
  {id:'dashboard',     label:'Dashboard'},
  {id:'programmes',    label:'Programmes'},
  {id:'relationships', label:'Relationships'},
  {id:'actors',        label:'Actors'},
  {id:'graph',         label:'Ecosystem Graph'},
  {id:'vertex-demo',   label:'Vertex Demo'},
  {id:'ingest',        label:'Database Ingest'},
  {id:'templates',     label:'Templates'},
]

export default function App() {
  const [role,setRole]=useState(null)
  const [page,setPage]=useState('dashboard')
  const [relationshipProgrammeFilter,setRelationshipProgrammeFilter]=useState('all')
  const [geminiKey,setGeminiKey]=useState('')
  const [learnedData,setLearnedData]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_learned_data')||'{}')
    } catch {
      return {}
    }
  })
  const [templates,setTemplates]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_templates')||'[]')
    } catch {
      return []
    }
  })
  const [extraActors,setExtraActors]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_extra_actors')||'[]')
    } catch {
      return []
    }
  })
  const [actorOverrides,setActorOverrides]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_actor_overrides')||'{}')
    } catch {
      return {}
    }
  })
  const [customRelationships,setCustomRelationships]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_custom_relationships')||'[]')
    } catch {
      return []
    }
  })
  const [customProgrammes,setCustomProgrammes]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem('bondb_custom_programmes')||'[]')
    } catch {
      return []
    }
  })

  const onLearnedUpdate=(relId, data)=>setLearnedData(prev=>({...prev,[relId]:data}))
  const onCloneTemplate=(tmpl)=>setTemplates(prev=>[...prev,tmpl])
  const onAddActor=(actor)=>setExtraActors(prev=>[...prev,actor])
  const onUpdateActor=(actor)=>{
    setExtraActors(prev=>prev.map(a=>a.id===actor.id?actor:a))
    setActorOverrides(prev=>({...prev,[actor.id]:actor}))
  }
  const onAddRelationship=(relationship)=>setCustomRelationships(prev=>[relationship,...prev])
  const onAddRelationships=(relationships)=>setCustomRelationships(prev=>[...relationships,...prev])
  const onAddProgramme=(programme)=>setCustomProgrammes(prev=>[programme,...prev])
  const allActors=useMemo(()=>[
    ...ACTORS.map(a=>actorOverrides[a.id]||a),
    ...extraActors.map(a=>actorOverrides[a.id]||a),
  ],[actorOverrides,extraActors])
  const allRelationships=useMemo(()=>[...customRelationships,...RELATIONSHIPS],[customRelationships])
  const allProgrammes=useMemo(()=>[...customProgrammes,...PROGRAMMES],[customProgrammes])
  const onViewRelationshipsForProgramme=(programmeId)=>{
    setRelationshipProgrammeFilter(programmeId)
    setPage('relationships')
  }

  useEffect(()=>{
    localStorage.setItem('bondb_custom_relationships', JSON.stringify(customRelationships))
  },[customRelationships])

  useEffect(()=>{
    localStorage.setItem('bondb_custom_programmes', JSON.stringify(customProgrammes))
  },[customProgrammes])

  useEffect(()=>{
    localStorage.setItem('bondb_extra_actors', JSON.stringify(extraActors))
  },[extraActors])

  useEffect(()=>{
    localStorage.setItem('bondb_actor_overrides', JSON.stringify(actorOverrides))
  },[actorOverrides])

  useEffect(()=>{
    localStorage.setItem('bondb_templates', JSON.stringify(templates))
  },[templates])

  useEffect(()=>{
    localStorage.setItem('bondb_learned_data', JSON.stringify(learnedData))
  },[learnedData])

  if(!role)return(
    <>
      <style>{G_CSS}</style>
      <LandingScreen onEnter={setRole}/>
    </>
  )

  const roleCfg={
    admin:   {label:'Programme Admin', bg:'rgba(37,99,235,.1)',  color:'var(--blue2)'},
    mentor:  {label:'Mentor',          bg:'rgba(124,58,237,.1)', color:'#7c3aed'},
    company: {label:'Company',         bg:'rgba(5,150,105,.1)',  color:'#059669'},
  }[role]

  const renderPage=()=>{
    const props={learnedData,onLearnedUpdate,geminiKey,setGeminiKey,onCloneTemplate,templates,customRelationships,onAddRelationship,onAddRelationships,onAddProgramme,extraActors,allActors,allRelationships,allProgrammes}
    if(page==='dashboard')     return <DashboardPage onNavigate={setPage} learnedData={learnedData} customRelationships={customRelationships} extraActors={extraActors} allActors={allActors}/>
    if(page==='programmes')    return <ProgrammesPage onNavigate={setPage} onViewRelationshipsForProgramme={onViewRelationshipsForProgramme} {...props}/>
    if(page==='relationships')  return <RelationshipsPage {...props} programmeFilter={relationshipProgrammeFilter} onProgrammeFilterChange={setRelationshipProgrammeFilter}/>
    if(page==='actors')        return <ActorsPage allActors={allActors} allRelationships={allRelationships} onAddActor={onAddActor} onUpdateActor={onUpdateActor}/>
    if(page==='graph')         return <EcosystemGraphPage learnedData={learnedData} customRelationships={customRelationships} extraActors={extraActors} allActors={allActors}/>
    if(page==='vertex-demo')   return <VertexDemoPage/>
    if(page==='ingest')        return <DatabaseIngestPage onActorsImported={(a,r)=>{a.forEach(actor=>setExtraActors(prev=>[...prev,actor]));alert(`${a.length} actors and ${r.length} relationships imported!`)}}/>
    if(page==='templates')     return <TemplatesPage templates={templates}/>
    return null
  }

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      <style>{G_CSS}</style>
      <nav style={{display:'flex',alignItems:'center',height:52,padding:'0 24px',background:'var(--navy2)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div className="font-mono" style={{fontSize:'12px',fontWeight:600,color:'var(--blue2)',letterSpacing:'1px',marginRight:24,whiteSpace:'nowrap'}}>BondB</div>
        <div style={{display:'flex',flex:1,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setPage(t.id)}
              style={{padding:'0 15px',height:52,display:'flex',alignItems:'center',fontSize:'12px',fontWeight:500,color:page===t.id?'var(--blue2)':'var(--t2)',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',borderBottom:page===t.id?'2px solid var(--blue3)':'2px solid transparent',transition:'all .15s',gap:5,whiteSpace:'nowrap'}}
              onMouseEnter={e=>{if(page!==t.id)e.currentTarget.style.color='var(--t1)'}}
              onMouseLeave={e=>{if(page!==t.id)e.currentTarget.style.color='var(--t2)'}}>
              {t.label}
              {t.id==='vertex-demo'&&<span style={{padding:'1px 5px',borderRadius:3,fontSize:'9px',fontWeight:700,background:'rgba(16,185,129,.15)',color:'#059669'}}>AI</span>}
              {t.id==='ingest'&&<span style={{padding:'1px 5px',borderRadius:3,fontSize:'9px',fontWeight:700,background:'rgba(5,150,105,.15)',color:'#059669'}}>NEW</span>}
              {t.id==='templates'&&templates.length>0&&<span style={{padding:'1px 6px',borderRadius:10,fontSize:'9px',fontWeight:700,background:'rgba(124,58,237,.2)',color:'#7c3aed'}}>{templates.length}</span>}
            </button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <GeminiBadge/>
          <div style={{padding:'4px 11px',borderRadius:20,fontSize:'11px',fontWeight:700,background:roleCfg.bg,color:roleCfg.color,cursor:'pointer'}} onClick={()=>setRole(null)}>{roleCfg.label} · Switch</div>
        </div>
      </nav>
      <main style={{flex:1,padding:'24px',maxWidth:1400,width:'100%',margin:'0 auto'}}>
        {renderPage()}
      </main>
    </div>
  )
}

