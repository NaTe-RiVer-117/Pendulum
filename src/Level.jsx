import * as React from 'react';
import { useRef } from 'react';
import { RigidBody, useRevoluteJoint } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Plane, Box } from '@react-three/drei';
import { useDebugUI } from './DebugUI'; 

export default function Level() {
  const pivotRef = useRef(null);
  const ballRef = useRef(null);

  // debug controls
  const { length, mass, impulse, dampingCoefficient } = useDebugUI();

  // revolute joint 
  useRevoluteJoint(pivotRef, ballRef, [
    [0, 0, 0], 
    [0, length, 0], 
    [0, 0, 1],
  ]);

  const handleClick = () => {
    if (ballRef.current) {
      //  impulse 
      const impulseVector = { x: impulse / mass, y: 0, z: 0 };
      ballRef.current.applyImpulse(impulseVector, true);
    }
  };

  //  damping force 
  useFrame(() => {
    if (ballRef.current) {
      //  linear velocity
      const velocity = ballRef.current.linvel().z;
  
      //  damping force 
      const dampingForce = {
        x: 0, 
        y: 0, 
        z: -dampingCoefficient * velocity,
      };
      ballRef.current.applyImpulse(dampingForce, true);
    }
  });
  

  return (
    <group>
      {/* Stand for the pendulum */}
      <Box args={[0.2, 5, 0.2]} position={[0, -2, -2]} castShadow receiveShadow>
        <meshStandardMaterial color="brown" />
      </Box>
    
      <Box args={[2.4, 0.2, 0.2]} rotation={[0, -Math.PI / 2, 0]} position={[0, 0, -1]} castShadow receiveShadow>
        <meshStandardMaterial color="brown" />
      </Box>

      {/* Pivot point */}
      <RigidBody ref={pivotRef} type="fixed">
        <Cylinder args={[0.05, 0.05, 0.1, 32]} position={[0, 4, 0]} />
      </RigidBody>

      {/* Pendulum Bob connected via a string */}
      <RigidBody ref={ballRef} colliders="ball" mass={mass}>
        <Cylinder args={[0.02, 0.02, length, 32]} position={[0, 4 - length / 2 , 0]} />
        <Sphere
          args={[0.5, 32, 32]}
          position={[0, 4 - length, 0]}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.2} />
        </Sphere>
      </RigidBody>

      {/* Plane beneath the pendulum */}
      <Plane args={[10, 10]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]} receiveShadow>
        <meshStandardMaterial color="gray" />
      </Plane>
    </group>
  );
}
