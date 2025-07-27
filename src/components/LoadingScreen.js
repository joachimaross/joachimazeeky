import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ onLoadComplete }) => {
  const [loadingStage, setLoadingStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hologramActive, setHologramActive] = useState(false);

  const loadingStages = [
    'Initializing Zeeky AI Core Systems...',
    'Loading Neural Networks...',
    'Establishing Secure Connections...',
    'Calibrating Holographic Projectors...',
    'Synchronizing AI Modules...',
    'Finalizing Interface Components...',
    'Welcome to Zeeky AI!'
  ];

  useEffect(() => {
    setHologramActive(true);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        
        // Update loading stage based on progress
        const stageIndex = Math.floor((newProgress / 100) * loadingStages.length);
        setLoadingStage(Math.min(stageIndex, loadingStages.length - 1));
        
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onLoadComplete();
          }, 1500);
        }
        
        return Math.min(newProgress, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onLoadComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 150, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 150, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              animation: 'gridMove 20s linear infinite'
            }}
          />
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 text-center">
          {/* 3D Hologram Avatar Container */}
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: hologramActive ? 1 : 0.5, 
                opacity: hologramActive ? 1 : 0,
                rotateY: hologramActive ? [0, 360] : 0
              }}
              transition={{ 
                duration: 2,
                rotateY: { duration: 8, repeat: Infinity, ease: "linear" }
              }}
              className="relative w-64 h-64 mx-auto"
            >
              {/* Holographic Frame */}
              <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-pulse">
                <div className="absolute inset-2 border border-blue-300 rounded-full opacity-60" />
                <div className="absolute inset-4 border border-blue-200 rounded-full opacity-40" />
              </div>

              {/* Hologram Scanlines */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                    style={{ top: `${(i + 1) * 12.5}%` }}
                    animate={{
                      opacity: [0, 1, 0],
                      scaleX: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>

              {/* Avatar Head */}
              <div className="absolute inset-8 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="relative"
                >
                  {/* Head Shape */}
                  <div className="w-32 h-40 bg-gradient-to-b from-amber-100 to-amber-200 rounded-full relative">
                    {/* Eyes */}
                    <motion.div
                      animate={{
                        scaleY: [1, 0.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                      className="absolute top-12 left-8 w-3 h-3 bg-gray-800 rounded-full"
                    />
                    <motion.div
                      animate={{
                        scaleY: [1, 0.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                      className="absolute top-12 right-8 w-3 h-3 bg-gray-800 rounded-full"
                    />
                    
                    {/* Mouth */}
                    <motion.div
                      animate={{
                        scaleX: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-gray-700 rounded-full"
                    />

                    {/* Hair */}
                    <div className="absolute -top-2 left-2 right-2 h-16 bg-gray-900 rounded-t-full" />
                  </div>

                  {/* Holographic Glow */}
                  <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 animate-pulse" />
                </motion.div>
              </div>

              {/* Rotating Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 border border-blue-300 rounded-full opacity-30" />
                <div className="absolute top-4 left-4 right-4 bottom-4 border border-purple-300 rounded-full opacity-30" />
              </motion.div>
            </motion.div>

            {/* Data Streams */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-px h-12 bg-blue-400"
                style={{
                  left: `${25 + i * 16.67}%`,
                  top: '100%',
                }}
                animate={{
                  opacity: [0, 1, 0],
                  height: [0, 48, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Zeeky AI Logo and Title */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mb-8"
          >
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              ZEEKY AI
            </h1>
            <p className="text-xl text-blue-300 font-light">
              Advanced AI Assistant Platform
            </p>
            <div className="mt-2 text-sm text-gray-400">
              Version 2.0 • Enterprise Edition
            </div>
          </motion.div>

          {/* Loading Progress */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="w-full max-w-md mx-auto"
          >
            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
              
              {/* Progress Glow */}
              <motion.div
                className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                animate={{
                  x: [-100, 400],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            {/* Loading Text */}
            <motion.div
              key={loadingStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-blue-300 text-lg font-medium"
            >
              {loadingStages[loadingStage]}
            </motion.div>

            {/* Progress Percentage */}
            <div className="mt-2 text-gray-400 text-sm">
              {Math.round(progress)}% Complete
            </div>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-8 left-8 text-left"
          >
            <div className="text-green-400 text-sm">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Neural Networks: Online
              </div>
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Security Protocols: Active
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Holographic Engine: Ready
              </div>
            </div>
          </motion.div>

          {/* Version Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-8 right-8 text-right text-gray-500 text-xs"
          >
            <div>Build: {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}</div>
            <div>© 2024 Joachima Ross Jr.</div>
          </motion.div>
        </div>

        {/* CSS for grid animation */}
        <style jsx>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(40px, 40px); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingScreen;