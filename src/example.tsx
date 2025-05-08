import { Component, createSignal } from 'solid-js'
import Avvvatars from './index'

const generateRandomEmail = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const length = Math.floor(Math.random() * 10) + 5 // Random length between 5-15
  const name = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    ''
  )
  return `${name}@example.com`
}

const Example: Component = () => {
  const [values, setValues] = createSignal({
    char1: generateRandomEmail(),
    char2: generateRandomEmail(),
    char3: generateRandomEmail(),
    shape1: generateRandomEmail(),
    shape2: generateRandomEmail(),
    shape3: generateRandomEmail(),
    border1: generateRandomEmail(),
    border2: generateRandomEmail(),
    border3: generateRandomEmail(),
    shadow1: generateRandomEmail(),
    shadow2: generateRandomEmail(),
    shadow3: generateRandomEmail(),
    display1: generateRandomEmail(),
    display2: generateRandomEmail(),
    display3: generateRandomEmail(),
  })

  const randomize = () => {
    // Refresh the page
    window.location.reload()
  }

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '20px',
        padding: '20px',
        'font-family': 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h1>Avvvatars Examples</h1>
        <button
          onClick={randomize}
          style={{
            padding: '8px 16px',
            'background-color': '#007AFF',
            color: 'white',
            border: 'none',
            'border-radius': '6px',
            cursor: 'pointer',
            'font-size': '14px',
          }}
        >
          Randomize Values
        </button>
      </div>

      <h2>Character Style Examples</h2>
      <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
        <Avvvatars value={values().char1} size={40} />
        <Avvvatars value={values().char2} size={40} />
        <Avvvatars value={values().char3} size={40} />
      </div>

      <h2>Shape Style Examples</h2>
      <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
        <Avvvatars value={values().shape1} style='shape' size={100} />
        <Avvvatars value={values().shape2} style='shape' size={100} />
        <Avvvatars value={values().shape3} style='shape' size={100} />
      </div>

      <h2>With Border Examples</h2>
      <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
        <Avvvatars
          value={values().border1}
          border={true}
          borderColor='#000'
          borderSize={2}
          size={40}
        />
        <Avvvatars
          value={values().border2}
          border={true}
          borderColor='#000'
          borderSize={2}
          size={40}
        />
        <Avvvatars
          value={values().border3}
          border={true}
          borderColor='#000'
          borderSize={2}
          size={40}
        />
      </div>

      <h2>With Shadow Examples</h2>
      <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
        <Avvvatars value={values().shadow1} shadow={true} size={40} />
        <Avvvatars value={values().shadow2} shadow={true} size={40} />
        <Avvvatars value={values().shadow3} shadow={true} size={40} />
      </div>

      <h2>Custom Display Value Examples</h2>
      <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
        <Avvvatars value={values().display1} displayValue='JD' size={40} />
        <Avvvatars value={values().display2} displayValue='JS' size={40} />
        <Avvvatars value={values().display3} displayValue='BW' size={40} />
      </div>
    </div>
  )
}

export default Example
