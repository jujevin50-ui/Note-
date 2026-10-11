import './globals.css'
export const metadata={title:'Notes'}
export default function L({children}){return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'light'}catch(e){}"}}/></head><body>{children}</body></html>}
