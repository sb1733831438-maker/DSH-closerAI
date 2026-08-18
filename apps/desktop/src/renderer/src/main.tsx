import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Manage } from './Manage'
import './styles.css'

const container = document.getElementById('root')
if (container === null) throw new Error('missing #root element')

// The same bundle hosts the onboarding page and the CloserAI management page;
// the main process picks the view by loading index.html?view=manage.
const params = new URLSearchParams(window.location.search)
const view = params.get('view')
createRoot(container).render(view === 'manage' ? <Manage /> : <App />)
