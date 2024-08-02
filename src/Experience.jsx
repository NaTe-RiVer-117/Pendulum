import { OrbitControls, Environment } from '@react-three/drei';
import Lights from './Lights.jsx';
import Level from './Level.jsx';
import { Physics } from '@react-three/rapier';
import Postp from './Postp.jsx';
import { Perf } from 'r3f-perf';

export default function Experience() {
    return (
        <>
            <OrbitControls makeDefault />
            
        
            <color args={['#0f001f']} attach="background" />

            <Perf position="top-left" />

            <Environment preset="night" />

            <Physics >

                <Lights />

                <Level />

                {/* <Postp/> */}
              
                </Physics>
        </>
    );
}
