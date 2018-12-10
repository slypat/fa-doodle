import React from 'react'
import createTransition$ from './transition'
import sizeMe from 'react-sizeme'
import style from './Model.module.css'
import Annotation from './Annotation'
import { map } from 'ramda'
import toFloat from './to-float'
import {
  AmbientLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Vector3,
  Object3D,
  Box3,
  Math
} from 'three'
import { pick, pipe, equals, values, max, reduce } from 'ramda'

const targetSize = 20
const height = 500
const { DEG2RAD:d2g } = Math

const propsToRadians = pipe(
  pick(['rx', 'ry', 'rz']),
  toFloat,
  map(n => n * d2g),
  ({ rx, ry, rz }) => ({ x: rx, y: ry, z: rz })
)

class Model extends React.Component {
  constructor(props) {
    super(props)
    const rotation = propsToRadians(props)
    const {
      size: { width },
      model,
    } = this.props

    this.canvas = React.createRef()
    this.state = initializeState(width, height, rotation, model)
    this.tween$ = createTransition$(rotation)
  }

  componentDidMount() {
    const { width } = this.props.size
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: this.canvas.current,
    })
    this.renderer.setSize(width, height)
    this.subscription = this.tween$.subscribe(rotation =>
      this.setState({ rotation })
    )
  }

  componentDidUpdate(prevProps, prevState) {
    const { model } = this.props
    const { model: prevModel } = prevProps

    if (model && !model.equals(prevModel)) {
      const { scene } = this.state
      scene.remove(prevModel.get('scene'))
      scene.add(model.get('scene'))
    }

    const rotation = propsToRadians(this.props)
    const prevRotation = propsToRadians(prevProps)
    if (equals(rotation, prevRotation)) return
    this.tween$.next(rotation)
  }

  componentWillUnmount() {
    this.subscription.unsubscribe()
  }

  render() {
    const { scene, camera, rotation, cameraPivot } = this.state
    const { model, size } = this.props
    const modelScene = model && model.get('scene')

    if (cameraPivot) Object.assign(cameraPivot.rotation, rotation)

    if (this.renderer) this.renderer.render(scene, camera)
    return <div className={style.container}>
      <canvas className={style.canvas} ref={this.canvas} />
      <Annotation size={{...size, height}} camera={camera} />
    </div>
  }
}

export default sizeMe()(Model)

function initializeState(width, height, rotation, model) {
  const scene = new Scene()
  const cameraPivot = new Object3D()
  const camera = new PerspectiveCamera(75, width / height)

  camera.position.z = 20
  camera.position.y = 10
  cameraPivot.add(camera)
  scene.add(cameraPivot)


  const modelScene = prepModel(model.get('scene'))
  if (model) scene.add(modelScene)
  scene.add(new AmbientLight(0xFFFFFF, 0.5))
  return { scene, camera, rotation, cameraPivot }
}

function prepModel(model) {
  const bounds = new Box3().setFromObject(model)
  const size = bounds.getSize(new Vector3())
  const maxSide = reduce(max, [], values(size))
  const scale = targetSize / maxSide
  console.log('%cbounds', 'background: powderblue', bounds, size, maxSide, targetSize, bounds, scale)
  Object.assign(model.scale, { x: scale, y: scale, z: scale})
  return model
}
