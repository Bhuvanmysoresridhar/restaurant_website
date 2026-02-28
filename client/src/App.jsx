import React, { useEffect, useState } from 'react'

export default function App(){
  const [source, setSource] = useState('')
  useEffect(()=>{
    fetch('/stones-landing-v2.jsx').then(r=>r.text()).then(t=>setSource(t)).catch(()=>setSource('// failed to load'))
  },[])

  return (
    <div style={{padding:20,fontFamily:'system-ui,Segoe UI,Roboto,Arial'}}>
      <h1>Stones Landing — React Preview</h1>
      <p>This dev server shows the JSX source served from <strong>/stones-landing-v2.jsx</strong>.</p>
      <a href="/stones-landing-v2.jsx" target="_blank" rel="noreferrer">Open raw JSX file</a>
      <h2>Preview (first 4000 chars)</h2>
      <pre style={{whiteSpace:'pre-wrap',background:'#f6f8fa',padding:12,borderRadius:6,overflow:'auto'}}>{(source || '').slice(0,4000) + '\n\n... (truncated)'}</pre>
    </div>
  )
}
