/** Ambient module when @types/three is not installed. */
declare module "three" {
  export class Color {
    r: number
    g: number
    b: number
    constructor(color?: string | number)
    getHex(): number
    getHexString(): string
    set(color: string | number | Color): this
    copy(color: Color): this
    clone(): Color
  }
  export class Vector2 {
    x: number
    y: number
    constructor(x?: number, y?: number)
    set(x: number, y: number): this
    clone(): Vector2
    copy(v: Vector2): this
    length(): number
    multiplyScalar(s: number): this
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
    unproject(camera: Camera): this
    lerp(v: Vector3, alpha: number): this
    sub(v: Vector3): this
    subVectors(a: Vector3, b: Vector3): this
    add(v: Vector3): this
    addVectors(a: Vector3, b: Vector3): this
    multiplyVectors(a: Vector3, b: Vector3): this
    distanceTo(v: Vector3): number
    setScalar(s: number): this
    multiplyScalar(s: number): this
    normalize(): this
  }
  export class Quaternion {
    x: number
    y: number
    z: number
    w: number
    constructor(x?: number, y?: number, z?: number, w?: number)
    setFromEuler(euler: Euler): this
  }
  export class Euler {
    x: number
    y: number
    z: number
    order?: string
    constructor(x?: number, y?: number, z?: number, order?: string)
    set(x: number, y: number, z: number, order?: string): this
    copy(euler: Euler): this
    clone(): Euler
  }
  export class Plane {
    normal: Vector3
    constant: number
    constructor(normal?: Vector3, constant?: number)
    set(normal: Vector3, constant: number): this
  }
  export class Ray {
    origin: Vector3
    direction: Vector3
    intersectPlane(plane: Plane, target: Vector3): Vector3 | null
  }
  export class Object3D {
    position: Vector3
    rotation: Euler
    scale: Vector3
    parent: Object3D | null
    children: Object3D[]
    userData: Record<string, unknown>
    name: string
    visible: boolean
    add(...objects: Object3D[]): this
    remove(...objects: Object3D[]): this
    getObjectByName(name: string): Object3D | undefined
    traverse(cb: (obj: Object3D) => void): void
    lookAt(v: Vector3): void
    clone(recursive?: boolean): this
  }
  export class Group extends Object3D {}
  export class Scene extends Object3D {
    background: Color | null
    fog: FogExp2 | null
  }
  export class Camera extends Object3D {
    isCamera?: boolean
    aspect: number
    near: number
    far: number
    fov: number
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
  export class OrthographicCamera extends Camera {
    constructor(
      left?: number,
      right?: number,
      top?: number,
      bottom?: number,
      near?: number,
      far?: number,
    )
  }
  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    outputColorSpace: string
    toneMapping: number
    toneMappingExposure: number
    constructor(params?: Record<string, unknown>)
    setPixelRatio(n: number): void
    getPixelRatio(): number
    setSize(w: number, h: number, updateStyle?: boolean): void
    render(scene: Scene, camera: Camera): void
    setRenderTarget(target: WebGLRenderTarget | null): void
    clear(color?: boolean, depth?: boolean, stencil?: boolean): void
    dispose(): void
  }
  export class WebGLRenderTarget {
    texture: Texture
    depthTexture: DepthTexture | null
    width: number
    height: number
    constructor(width: number, height: number, options?: Record<string, unknown>)
    setSize(width: number, height: number): void
    dispose(): void
  }
  export interface IUniform<T = unknown> {
    value: T
  }
  export const UniformsLib: Record<string, Record<string, IUniform>>
  export const UniformsUtils: {
    merge(uniforms: Record<string, IUniform>[]): Record<string, IUniform>
    clone(uniforms: Record<string, IUniform>): Record<string, IUniform>
  }
  export const HalfFloatType: number
  export const RGBAFormat: number

  export class Clock {
    getDelta(): number
    elapsedTime: number
  }
  export class Raycaster {
    ray: Ray
    setFromCamera(coords: Vector2, camera: Camera): void
    intersectObjects(objects: Object3D[], recursive?: boolean): { object: Object3D }[]
  }
  export interface BufferAttributeLike {
    array: Float32Array | ArrayLike<number>
    count: number
    needsUpdate?: boolean
    setY(index: number, y: number): void
    getX(index: number): number
    getY(index: number): number
    getZ(index: number): number
  }
  export class BufferGeometry {
    attributes: Record<string, BufferAttributeLike>
    index: BufferAttributeLike | null
    boundingSphere: Sphere | null
    setAttribute(name: string, attr: BufferAttribute): void
    getAttribute(name: string): BufferAttributeLike
    computeVertexNormals(): void
    setFromPoints(points: Vector3[]): this
    setDrawRange(start: number, count: number): void
    toNonIndexed(): BufferGeometry
    scale(x: number, y: number, z: number): this
    translate(x: number, y: number, z: number): this
    rotateX(angle: number): this
    rotateY(angle: number): this
    rotateZ(angle: number): this
    dispose(): void
  }
  export class BufferAttribute {
    array: Float32Array | ArrayLike<number>
    constructor(array: ArrayLike<number>, itemSize: number)
  }
  export interface WebGLShaderPatch {
    uniforms: Record<string, { value: unknown }>
    vertexShader: string
    fragmentShader: string
    defines?: Record<string, unknown>
  }
  export class Material {
    needsUpdate: boolean
    transparent: boolean
    onBeforeCompile?: (shader: WebGLShaderPatch, renderer: WebGLRenderer) => void
    customProgramCacheKey?: () => string
    clone(): this
    dispose(): void
  }
  export class ShaderMaterial extends Material {
    uniforms: Record<string, { value: unknown }>
    vertexShader: string
    fragmentShader: string
    constructor(params?: Record<string, unknown>)
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
    colorSpace: string
    magFilter: number
    minFilter: number
    flipY: boolean
    dispose(): void
  }
  export class TextureLoader {
    load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void,
    ): Texture
  }
  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement)
  }
  export class DataTexture extends Texture {
    constructor(
      data: ArrayBufferView | null,
      width: number,
      height: number,
      format?: number,
      type?: number,
      mapping?: number,
      wrapS?: number,
      wrapT?: number,
      magFilter?: number,
      minFilter?: number,
      anisotropy?: number,
      colorSpace?: string,
    )
  }
  export class MeshStandardMaterial extends Material {
    opacity: number
    emissiveIntensity: number
    color: Color
    emissive: Color
    roughness: number
    metalness: number
    flatShading: boolean
    map: Texture | null
    side: number
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
    isMesh?: boolean
    castShadow: boolean
    receiveShadow: boolean
    morphTargetInfluences?: number[]
    morphTargetDictionary?: Record<string, number>
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material)
    lookAt(v: Vector3): void
  }
  export class Bone extends Object3D {
    isBone?: boolean
  }
  export class Skeleton {
    bones: Bone[]
    constructor(bones?: Bone[])
  }
  export class SkinnedMesh extends Mesh {
    isSkinnedMesh?: boolean
    skeleton: Skeleton
    bindMatrix: Matrix4
    bindMatrixInverse: Matrix4
    constructor(geometry?: BufferGeometry, material?: Material)
  }
  export class AnimationAction {
    setLoop(mode: number, repetitions: number): this
    play(): this
    stop(): this
    reset(): this
  }
  export class AnimationClip {
    name: string
    duration: number
    tracks: unknown[]
    constructor(name?: string, duration?: number, tracks?: unknown[])
  }
  export class AnimationMixer {
    time: number
    timeScale: number
    constructor(root: Object3D)
    clipAction(clip: AnimationClip, optionalRoot?: Object3D): AnimationAction
    update(deltaTime: number): this
    stopAllAction(): this
  }
  export class Box3 {
    min: Vector3
    max: Vector3
    constructor(min?: Vector3, max?: Vector3)
    setFromObject(object: Object3D): this
    getSize(target: Vector3): Vector3
    getCenter(target: Vector3): Vector3
  }
  export class Line extends Object3D {
    geometry: BufferGeometry
    material: Material
    constructor(geometry?: BufferGeometry, material?: Material)
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
    geometry: BufferGeometry
    material: Material
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
  export class RingGeometry extends BufferGeometry {
    constructor(
      innerRadius?: number,
      outerRadius?: number,
      thetaSegments?: number,
      phiSegments?: number,
      thetaStart?: number,
      thetaLength?: number,
    )
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
  export class OctahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number)
    scale(x: number, y: number, z: number): this
  }
  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry?: BufferGeometry)
  }
  export class TorusGeometry extends BufferGeometry {
    constructor(
      radius?: number,
      tube?: number,
      radialSegments?: number,
      tubularSegments?: number,
      arc?: number
    )
    rotateX(angle: number): this
    rotateY(angle: number): this
    rotateZ(angle: number): this
  }
  export class CapsuleGeometry extends BufferGeometry {
    constructor(
      radius?: number,
      length?: number,
      capSubdivisions?: number,
      radialSegments?: number
    )
    scale(x: number, y: number, z: number): this
  }
  export class Matrix4 {
    constructor()
    identity(): this
    makeScale(x: number, y: number, z: number): this
    makeTranslation(x: number, y: number, z: number): this
    decompose(translation: Vector3, rotation: Quaternion, scale: Vector3): this
    compose(translation: Vector3, rotation: Quaternion, scale: Vector3): this
    multiplyMatrices(a: Matrix4, b: Matrix4): this
    multiply(m: Matrix4): this
    copy(m: Matrix4): this
    clone(): Matrix4
    set(
      n11: number, n12: number, n13: number, n14: number,
      n21: number, n22: number, n23: number, n24: number,
      n31: number, n32: number, n33: number, n34: number,
      n41: number, n42: number, n43: number, n44: number
    ): this
  }
  export class Sphere {
    constructor(center?: Vector3, radius?: number)
  }
  export class Float32BufferAttribute extends BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number)
  }
  export class InstancedBufferAttribute extends BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean)
  }
  export class InstancedMesh extends Mesh {
    count: number
    frustumCulled: boolean
    instanceMatrix: { needsUpdate: boolean }
    instanceColor: { needsUpdate: boolean } | null
    constructor(geometry: BufferGeometry, material: Material, count: number)
    setMatrixAt(index: number, matrix: Matrix4): void
    setColorAt(index: number, color: Color): void
    dispose(): void
  }
  export class DepthTexture extends Texture {
    constructor(width: number, height: number, type?: number)
  }
  export const SRGBColorSpace: string
  export const UnsignedShortType: number
  export const UnsignedIntType: number
  export const FloatType: number
  export const DepthFormat: number
  export const DepthStencilFormat: number
  export const ShaderChunk: Record<string, string>
  export const LinearFilter: number
  export const NearestFilter: number
  export const DoubleSide: number
  export const FrontSide: number
  export const BackSide: number
  export const NormalBlending: number
  export const AdditiveBlending: number
  export const RepeatWrapping: number
  export const ClampToEdgeWrapping: number
  export const LoopRepeat: number
  export const LoopOnce: number
}

declare module "three/examples/jsm/utils/SkeletonUtils.js" {
  import { Object3D } from "three"
  export function clone<T extends Object3D>(source: T): T
}

declare module "three/addons/utils/SkeletonUtils.js" {
  export * from "three/examples/jsm/utils/SkeletonUtils.js"
}

declare module "three/addons/postprocessing/EffectComposer.js" {
  import { WebGLRenderer, WebGLRenderTarget } from "three"
  export class EffectComposer {
    renderTarget1: WebGLRenderTarget
    renderTarget2: WebGLRenderTarget
    constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget)
    setPixelRatio(pixelRatio: number): void
    setSize(width: number, height: number): void
    addPass(pass: unknown): void
    render(deltaTime?: number): void
    dispose(): void
  }
}

declare module "three/addons/postprocessing/ShaderPass.js" {
  export class ShaderPass {
    enabled: boolean
    uniforms: Record<string, { value: unknown }>
    needsSwap: boolean
    constructor(shader: unknown, textureID?: string)
    dispose(): void
  }
}

declare module "three/addons/postprocessing/BokehPass.js" {
  import { Scene, Camera } from "three"
  export class BokehPass {
    enabled: boolean
    uniforms: Record<string, { value: unknown }>
    constructor(
      scene: Scene,
      camera: Camera,
      params?: { focus?: number; aperture?: number; maxblur?: number },
    )
    setSize(width: number, height: number): void
    dispose(): void
  }
}

declare module "three/addons/postprocessing/RenderPass.js" {
  import { Scene, Camera } from "three"
  export class RenderPass {
    enabled: boolean
    constructor(scene: Scene, camera: Camera)
  }
}

declare module "three/addons/postprocessing/UnrealBloomPass.js" {
  import { Vector2 } from "three"
  export class UnrealBloomPass {
    enabled: boolean
    resolution: Vector2
    strength: number
    radius: number
    threshold: number
    constructor(resolution?: Vector2, strength?: number, radius?: number, threshold?: number)
  }
}

declare module "three/addons/postprocessing/OutputPass.js" {
  export class OutputPass {
    enabled: boolean
    constructor()
  }
}

declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  import { Group } from "three"
  export interface GLTF {
    scene: Group
    scenes: Group[]
    animations: unknown[]
    cameras: unknown[]
    asset: Record<string, unknown>
  }
  export class GLTFLoader {
    constructor()
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void,
    ): void
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError?: (event: unknown) => void,
    ): void
  }
}

declare module "three/addons/loaders/GLTFLoader.js" {
  export * from "three/examples/jsm/loaders/GLTFLoader.js"
}
