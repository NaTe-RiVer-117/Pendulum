import { SpotLight } from '@react-three/drei';
import React from 'react';

export default function Lights() {
    return (
        <>
        {/* <SpotLight
  position={[5, 1, 5]}
  color={'red'}
  intensity={5}
  castShadow
  shadow-mapSize-width={1024}
  shadow-mapSize-height={1024}
/> */}

            <directionalLight
                castShadow
                position={[0, 5, 0]}
                intensity={2}
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={1}
                shadow-camera-far={20}
                shadow-camera-top={10}
                shadow-camera-right={10}
                shadow-camera-bottom={-10}
                shadow-camera-left={-10}
            />
            <ambientLight intensity={1} /> 
        </>
    );
}
