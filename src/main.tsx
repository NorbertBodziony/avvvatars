import { render } from 'solid-js/web'
import Example from './example'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

render(() => <Example />, root)
