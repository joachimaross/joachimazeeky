import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Text, Points, PointMaterial, Torus, Ring } from '@react-three/drei';
import * as THREE from 'three';

// 3D Hologram Head Component
const HologramHead = ({ emotion, isListening, isSpeaking, eyeX, eyeY }) => {
  const headRef = useRef();
  const eyeLeftRef = useRef();
  const eyeRightRef = useRef();
  const mouthRef = useRef();
  const [time, setTime] = useState(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    setTime(t);
    
    // Head floating animation
    if (headRef.current) {
      headRef.current.position.y = Math.sin(t * 2) * 0.1;
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
    }

    // Eye tracking
    if (eyeLeftRef.current && eyeRightRef.current) {
      eyeLeftRef.current.position.x = -0.3 + eyeX * 0.1;
      eyeLeftRef.current.position.y = 0.1 + eyeY * 0.1;
      eyeRightRef.current.position.x = 0.3 + eyeX * 0.1;
      eyeRightRef.current.position.y = 0.1 + eyeY * 0.1;
    }

    // Mouth animation for speaking
    if (mouthRef.current && isSpeaking) {
      mouthRef.current.scale.x = 1 + Math.sin(t * 10) * 0.3;
      mouthRef.current.scale.y = 1 + Math.sin(t * 8) * 0.2;
    }
  });

  const expressions = {
    neutral: { mouthY: -0.2, mouthScale: 1 },
    happy: { mouthY: -0.15, mouthScale: 1.2 },
    focused: { mouthY: -0.25, mouthScale: 0.8 },
    excited: { mouthY: -0.1, mouthScale: 1.4 },
    confused: { mouthY: -0.3, mouthScale: 0.9 }
  };

  const currentExpression = expressions[emotion] || expressions.neutral;

  return (
    <group ref={headRef}>
      {/* Head */}
      <Sphere args={[0.8, 32, 32]} position={[0, 0, 0]}>
        <meshPhongMaterial 
          color="#D4A574" 
          transparent 
          opacity={0.9}
          emissive="#0066ff"
          emissiveIntensity={0.1}
        />
      </Sphere>

      {/* Eyes */}
      <Sphere ref={eyeLeftRef} args={[0.08, 16, 16]} position={[-0.3, 0.1, 0.6]}>
        <meshPhongMaterial color="#2a2a2a" />
      </Sphere>
      <Sphere ref={eyeRightRef} args={[0.08, 16, 16]} position={[0.3, 0.1, 0.6]}>
        <meshPhongMaterial color="#2a2a2a" />
      </Sphere>

      {/* Mouth */}
      <Sphere 
        ref={mouthRef} 
        args={[0.1, 16, 16]} 
        position={[0, currentExpression.mouthY, 0.6]}
        scale={[currentExpression.mouthScale, 1, 1]}
      >
        <meshPhongMaterial color="#2a2a2a" />
      </Sphere>

      {/* Hair */}
      <Sphere args={[0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} position={[0, 0.3, 0]}>
        <meshPhongMaterial color="#1a1a1a" />
      </Sphere>
    </group>
  );
};

// Hologram Particles System
const HologramParticles = ({ count = 1000 }) => {
  const points = useRef();
  const particlesPosition = new Float32Array(count * 3);

  // Generate random particle positions in a sphere
  for (let i = 0; i < count; i++) {
    const distance = Math.random() * 3 + 1;
    const theta = THREE.MathUtils.randFloatSpread(360);
    const phi = THREE.MathUtils.randFloatSpread(360);

    let x = distance * Math.sin(theta) * Math.cos(phi);
    let y = distance * Math.sin(theta) * Math.sin(phi);
    let z = distance * Math.cos(theta);

    particlesPosition.set([x, y, z], i * 3);
  }

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      points.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  return (
    <Points ref={points} positions={particlesPosition}>
      <PointMaterial 
        transparent 
        color="#00aaff" 
        size={0.02} 
        sizeAttenuation={true} 
        opacity={0.6}
      />
    </Points>
  );
};

// Data Stream Effect
const DataStream = ({ position, delay = 0 }) => {
  const streamRef = useRef();
  
  useFrame((state) => {
    if (streamRef.current) {
      const t = state.clock.getElapsedTime() + delay;
      streamRef.current.position.y = -2 + ((t * 2) % 4);
      streamRef.current.material.opacity = Math.sin(t * 3) * 0.5 + 0.5;
    }
  });

  return (
    <Box ref={streamRef} args={[0.02, 0.5, 0.02]} position={position}>
      <meshBasicMaterial color="#00ff88" transparent />
    </Box>
  );
};

// Listening Ring Effect
const ListeningRing = ({ isListening }) => {
  const ringRef = useRef();
  
  useFrame((state) => {
    if (ringRef.current && isListening) {
      const t = state.clock.getElapsedTime();
      ringRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.2);
      ringRef.current.rotation.z = t * 0.5;
    }
  });

  if (!isListening) return null;

  return (
    <Ring ref={ringRef} args={[1.8, 2, 32]} rotation={[0, 0, 0]}>
      <meshBasicMaterial color="#00ff88" transparent opacity={0.6} />
    </Ring>
  );
};

// Main Hologram Avatar Component
const HologramAvatar = ({ isListening, isSpeaking, emotion = 'neutral', message = '' }) => {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  // Simulate eye tracking (could be connected to actual face detection)
  useEffect(() => {
    const interval = setInterval(() => {
      setEyePosition({
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.2
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: -50 }}
        animate={{ 
          opacity: isVisible ? 1 : 0.7, 
          scale: 1, 
          y: 0,
          rotateY: isListening ? [0, 5, -5, 0] : 0
        }}
        transition={{ 
          duration: 1,
          rotateY: { duration: 2, repeat: isListening ? Infinity : 0 }
        }}
        className="relative"
      >
        {/* Holographic Container */}
        <div className="relative bg-gradient-to-br from-blue-900/10 to-purple-900/10 backdrop-blur-sm border border-blue-400/30 rounded-3xl p-6">
          
          {/* Main 3D Canvas */}
          <div className="w-80 h-80 relative">
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              {/* Lighting */}
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#00aaff" />
              <pointLight position={[-10, -10, 10]} intensity={0.5} color="#aa00ff" />

              {/* Hologram Head */}
              <HologramHead 
                emotion={emotion}
                isListening={isListening}
                isSpeaking={isSpeaking}
                eyeX={eyePosition.x}
                eyeY={eyePosition.y}
              />

              {/* Hologram Particles */}
              <HologramParticles count={500} />

              {/* Data Streams */}
              <DataStream position={[-2, 0, 0]} delay={0} />
              <DataStream position={[2, 0, 0]} delay={1} />
              <DataStream position={[0, 0, -2]} delay={2} />
              <DataStream position={[0, 0, 2]} delay={3} />

              {/* Listening Effect */}
              <ListeningRing isListening={isListening} />

              {/* Rotating Wireframe */}
              <Torus args={[2.2, 0.02, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color="#0088ff" transparent opacity={0.3} wireframe />
              </Torus>
            </Canvas>

            {/* Hologram Scan Lines Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-full h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                  style={{ top: `${(i + 1) * 8.33}%` }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scaleX: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            {/* Corner Brackets */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Left */}
              <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-blue-400" />
              {/* Top Right */}
              <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-blue-400" />
              {/* Bottom Left */}
              <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-blue-400" />
              {/* Bottom Right */}
              <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-blue-400" />
            </div>
          </div>

          {/* Status Indicators */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -bottom-3 -right-3 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold border border-green-400"
              >
                <span className="animate-pulse">🎤</span> Listening
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -bottom-3 -left-3 bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold border border-blue-400"
              >
                <span className="animate-bounce">🗣️</span> Speaking
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emotion Display */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-4 py-1 rounded-full text-sm font-medium capitalize border border-gray-600">
            <span className="mr-2">🧠</span>
            {emotion}
          </div>

          {/* Neural Activity Indicator */}
          <div className="absolute top-4 right-4 flex flex-col space-y-1">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-blue-400 rounded-full"
                animate={{
                  height: [4, 16, 4],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        </div>

        {/* Holographic Glow Effect */}
        <div 
          className="absolute inset-0 bg-blue-400/20 rounded-3xl blur-xl -z-10"
          style={{
            filter: 'blur(20px)',
          }}
        />
      </motion.div>
    </div>
  );
};

export default HologramAvatar;