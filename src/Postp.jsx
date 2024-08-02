import React from 'react'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
const Postp = () => {
  return (
   <EffectComposer>
    <Bloom intensity={1.0} luminanceThreshold={0} luminanceSmoothing/>
   </EffectComposer>
  )
}

export default Postp
