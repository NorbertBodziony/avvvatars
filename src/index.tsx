import { Component, JSX } from 'solid-js'
import randiman from './lib/random'
import { BACKGROUND_COLORS, TEXT_COLORS, SHAPE_COLORS } from './lib/colors'
import Shape, { ShapeNames } from './shape/Shape'

const DEFAULTS = {
  style: 'character',
  size: 32,
  shadow: false,

  border: false,
  borderSize: 2,
  borderColor: '#fff',
}

type Style = 'character' | 'shape'
interface Params {
  displayValue?: string
  // this should be unique to user, it can be email, user id, or full name
  value: string
  size?: number
  shadow?: boolean
  style?: Style

  // toggle border
  border?: boolean
  borderSize?: number
  borderColor?: string
  radius?: number
}

const Wrapper: Component<{
  size: number
  color: string
  shadow?: boolean
  border?: boolean
  borderSize?: number
  borderColor?: string
  radius?: number
  children: JSX.Element
}> = (props) => {
  const style = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    'border-radius': `${props.radius || props.size}px`,
    'background-color': `#${props.color}`,
    border: props.border ? `${props.borderSize}px solid ${props.borderColor}` : 'none',
    'box-sizing': 'border-box',
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    'user-select': 'none',
    'box-shadow': props.shadow
      ? '0px 3px 8px rgba(18, 18, 18, 0.04), 0px 1px 1px rgba(18, 18, 18, 0.02)'
      : 'none',
  } as const

  return <div style={style}>{props.children}</div>
}

const Text: Component<{
  color: string
  size: number
  children: string
}> = (props) => {
  const style = {
    margin: '0',
    padding: '0',
    'text-align': 'center',
    'box-sizing': 'border-box',
    'font-family': '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    'font-size': `${Math.round((props.size / 100) * 37)}px`,
    color: `#${props.color}`,
    'line-height': '0',
    'text-transform': 'uppercase',
    'font-weight': '500',
  } as const

  return <p style={style}>{props.children}</p>
}

const Avvvatars: Component<Params> = (props) => {
  const {
    style = DEFAULTS.style,
    displayValue,
    value,
    radius,
    size = DEFAULTS.size,
    shadow = DEFAULTS.shadow,
    border = DEFAULTS.border,
    borderSize = DEFAULTS.borderSize,
    borderColor = DEFAULTS.borderColor,
  } = props

  // get first two letters
  const name = String(displayValue || value).substring(0, 2)

  // generate unique random for given value
  // there is 20 colors in array so generate between 0 and 19
  const key = randiman({ value, min: 0, max: 19 })
  // there is 60 shapes so generate between 1 and 60
  const shapeKey = randiman({ value, min: 1, max: 60 })

  return (
    <Wrapper
      size={size}
      color={BACKGROUND_COLORS[key]}
      shadow={shadow}
      border={border}
      borderSize={borderSize}
      borderColor={borderColor}
      radius={radius}
    >
      {style === 'character' ? (
        <Text color={TEXT_COLORS[key]} size={size}>
          {name}
        </Text>
      ) : (
        <Shape name={`Shape${shapeKey}` as ShapeNames} color={SHAPE_COLORS[key]} size={size} />
      )}
    </Wrapper>
  )
}

export default Avvvatars
