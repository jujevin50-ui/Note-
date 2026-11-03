export default function ToolbarIcon({ name }) {
  const paths = {
    style: <><path d="M4 6h16M12 6v14M8 20h8M4 6v3M20 6v3" /></>,
    bullet: <><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></>,
    ordered: <><path d="M10 6h11M10 12h11M10 18h11M3 3h1v6M2 9h4M2 15c0-3 4-3 4-1 0 2-4 3-4 6h4"/></>,
    task: <><rect x="3" y="4" width="7" height="7" rx="1.5"/><path d="m5 7 1 1 2-2M14 7h7M14 17h7"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    bold: <path d="M6 4h7a4 4 0 0 1 0 8H6m0-8v16h8a4 4 0 0 0 0-8H6"/>,
    italic: <path d="M10 4h10M4 20h10M15 4 9 20"/>,
    underline: <><path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/></>,
    code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/>,
    quote: <><path d="M4 12h5v7H2v-7c0-4 2-6 6-7M16 12h5v7h-7v-7c0-4 2-6 6-7"/></>,
    rule: <path d="M3 12h18"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
    pdf: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6v6h6M12 12v7m-3-3 3 3 3-3"/></>,
    chart: <><path d="M3 3v18h18M7 16v-5M12 16V7M17 16V4"/></>,
    table: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
    highlight: <><path d="m14 3 7 7-9 9H5v-7l9-9ZM5 12l7 7M3 22h18"/></>,
  }
  return <svg className="toolbar-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.style}</svg>
}
