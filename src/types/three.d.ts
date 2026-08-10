/** Minimal ambient module when @types/three is not installed. */
declare module "three" {
  export class Color {
    constructor(color?: string | number)
    getHex(): number
    set(color: string | number): this
  }
  export class Vector2 {
    x: number
    y: number
    constructor(x?: number, y?: number)
    set(x: number, y: number): this
  }
  export class Vector3 {
    x: number
    y: number
    z: number
    constructor(x?: number, y?: number, z?: number)
    set(x: number, y: number, z: number): this
    copy(v: Vector3): this
    clone(): Vector3
    project(camera: Camera): this
    lerp(v: Vector3, alpha: number): this
    setScalar(s: number): this
    multiplyScalar(s: number): this
  }
  export class Euler {
    x: number
    y: number
    z: number
    set(x: number, y: number, z: number): this
  }
  export class Object3D {
    position: Vector3
    rotation: Euler
    scale: Vector3
    parent: Object3D | null
    userData: Record<string, unknown>
    name: string
    add(...objects: Object3D[]): this
    getObjectByName(name: string): Object3D | undefined
    traverse(cb: (obj: Object3D) => void): void
    lookAt(v: Vector3): void
  }
  export class Group extends Object3D {}
  export class Scene extends Object3D {
    background: Color | null
    fog: FogExp2 | null
  }
  export class Camera extends Object3D {
    aspect: number
    updateProjectionMatrix(): void
    setViewOffset(
      fullWidth: number,
      fullHeight: number,
      x: number,
      y: number,
      width: number,
      height: number,
    ): void
    clearViewOffset(): void
    lookAt(v: Vector3): void
  }
  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
  }
  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    constructor(params?: { antialias?: boolean; alpha?: boolean })
    setPixelRatio(n: number): void
    setSize(w: number, h: number, updateStyle?: boolean): void
    render(scene: Scene, camera: Camera): void
    dispose(): void
  }
  export class Clock {
    getDelta(): number
    elapsedTime: number
  }
  export class Raycaster {
    setFromCamera(coords: Vector2, camera: Camera): void
    intersectObjects(objects: Object3D[], recursive?: boolean): { object: Object3D }[]
  }
  export interface BufferAttributeLike {
    array: Float32Array | ArrayLike<number>
    count: number
    needsUpdate?: boolean
    setY(index: number, y: number): void
  }
  export class BufferGeometry {
    attributes: Record<string, BufferAttributeLike>
    setAttribute(name: string, attr: BufferAttribute): void
    dispose(): void
  }
  export class BufferAttribute {
    array: Float32Array | ArrayLike<number>
    constructor(array: ArrayLike<number>, itemSize: number)
  }
  export class Material {
    dispose(): void
  }
  export class MeshBasicMaterial extends Material {
    opacity: number
    color: Color
    map: Texture | null
    constructor(params?: Record<string, unknown>)
  }
  export class Texture {
    offset: Vector2
    repeat: Vector2
    wrapS: number
    wrapT: number
    needsUpdate: boolean
    dispose(): void
  }
  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement)
  }
  export class MeshStandardMaterial extends Material {
    opacity: number
    emissiveIntensity: number
    color: Color
    emissive: Color
    constructor(params?: Record<string, unknown>)
  }
  export class LineBasicMaterial extends Material {
    opacity: number
    color: Color
    constructor(params?: Record<string, unknown>)
  }
  export class PointsMaterial extends Material {
    opacity: number
    size: number
    color: Color
    constructor(params?: Record<string, unknown>)
  }
  export class Mesh extends Object3D {
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material)
    lookAt(v: Vector3): void
  }
  export class Shape {
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    closePath(): this
  }
  export class ExtrudeGeometry extends BufferGeometry {
    constructor(
      shapes?: Shape | Shape[],
      options?: {
        depth?: number
        bevelEnabled?: boolean
        bevelSize?: number
        bevelThickness?: number
        bevelSegments?: number
        steps?: number
      },
    )
    rotateX(angle: number): this
  }
  export class IcosahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number)
  }
  export class LineSegments extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material)
  }
  export class Points extends Object3D {
    geometry: BufferGeometry
    constructor(geometry?: BufferGeometry, material?: Material)
  }
  export class Light extends Object3D {
    intensity: number
    color: Color
  }
  export class AmbientLight extends Light {
    constructor(color?: number, intensity?: number)
  }
  export class DirectionalLight extends Light {
    constructor(color?: number, intensity?: number)
  }
  export class PointLight extends Light {
    constructor(color?: number | Color, intensity?: number, distance?: number)
  }
  export class HemisphereLight extends Light {
    groundColor: Color
    constructor(skyColor?: number | Color, groundColor?: number | Color, intensity?: number)
  }
  export class FogExp2 {
    density: number
    color: Color
    constructor(color: number, density?: number)
  }
  export class BoxGeometry extends BufferGeometry {
    constructor(w?: number, h?: number, d?: number)
  }
  export class PlaneGeometry extends BufferGeometry {
    constructor(w?: number, h?: number, ws?: number, hs?: number)
    rotateX(angle: number): this
  }
  export class ConeGeometry extends BufferGeometry {
    constructor(
      radius?: number,
      height?: number,
      radialSegments?: number,
      heightSegments?: number,
      openEnded?: boolean,
    )
    rotateX(angle: number): this
    rotateY(angle: number): this
    rotateZ(angle: number): this
  }
  export class SphereGeometry extends BufferGeometry {
    constructor(
      radius?: number,
      widthSegments?: number,
      heightSegments?: number,
      phiStart?: number,
      phiLength?: number,
      thetaStart?: number,
      thetaLength?: number,
    )
    scale(x: number, y: number, z: number): this
  }
  export class CylinderGeometry extends BufferGeometry {
    constructor(
      radiusTop?: number,
      radiusBottom?: number,
      height?: number,
      radialSegments?: number,
    )
  }
  export class DodecahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number)
  }
  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry?: BufferGeometry)
  }
  export const DoubleSide: number
  export const FrontSide: number
  export const BackSide: number
  export const NormalBlending: number
  export const AdditiveBlending: number
  export const RepeatWrapping: number
  export const ClampToEdgeWrapping: number
}
