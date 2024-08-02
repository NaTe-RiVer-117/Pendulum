import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience from './Experience.jsx'

const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <Canvas
        shadows
        camera={ {
            fov: 50,
            near: 0.1,
            far: 200,
            position: [ 0, 4, 15 ]
        } }
    >
        <Experience />
    </Canvas>
)