declare module 'three/examples/jsm/libs/stats.module' {
  export default class Stats {
    dom: HTMLElement
    showPanel(id: number): void
    begin(): void
    end(): void
    update(): void
  }
}

declare module 'three/examples/jsm/controls/OrbitControls' {
  export class OrbitControls {
    constructor(object: any, domElement?: any)
    enabled: boolean
    target: any
    zoomSpeed: number
    enableDamping: boolean
    autoRotate: boolean
    enableRotate: boolean
    mouseButtons: any
    touches: any
    update(): void
    dispose(): void
    addEventListener(type: string, listener: (...args: any[]) => void): void
    removeEventListener(type: string, listener: (...args: any[]) => void): void
  }
}

