import { Component } from 'solid-js';

type Style = 'character' | 'shape';
interface Params {
    displayValue?: string;
    value: string;
    size?: number;
    shadow?: boolean;
    style?: Style;
    border?: boolean;
    borderSize?: number;
    borderColor?: string;
    radius?: number;
}
declare const Avvvatars: Component<Params>;

export { Avvvatars as default };
