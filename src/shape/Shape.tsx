import { Component, JSX } from 'solid-js'
import * as shapes from './shapes'
import { ShapeProps } from './shapes'

export type ShapeNames = keyof typeof shapes

interface ShapeList {
  [key: string]: Component<ShapeProps>
}

export interface Props {
  name: ShapeNames
  size?: number
  color: string
  children?: JSX.Element
}

const ShapeWrapper: Component<Props> = (props) => {
  const style = {
    display: 'inline-flex',
    'align-items': 'center',
    'vertical-align': 'middle',
    color: `#${props.color || 'currentColor'}`,
  } as const

  return (
    <span style={style} role='img'>
      {props.children}
    </span>
  )
}

export const shapeList = Object.keys(shapes)

const Shape: Component<Props> = (props) => {
  const { name, size = 24 } = props
  const Tag = (shapes as ShapeList)[name]

  if (!Tag) {
    return null
  }

  return (
    <ShapeWrapper {...props}>
      <Tag width={size * 0.6} />
    </ShapeWrapper>
  )
}

export default Shape
