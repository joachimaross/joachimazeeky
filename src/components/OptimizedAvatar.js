// Optimized Avatar Component with reduced bundle size and better performance
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Lazy load heavy dependencies only when needed
const loadTensorFlow = () => import('@tensorflow/tfjs');
const loadThreeJS = () => import('three');

const OptimizedZeekyAvatar = ({ 
  isListening = false, 
  isSpeaking = false, 
  emotion = 'neutral', 
  message = '',
  size = 200 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const workerRef = useRef(null);
  
  // Lightweight state management
  const [avatarState, setAvatarState] = useState({
    eyeX: 0,
    eyeY: 0,
    mouthOpen: 0,
    blinking: false,
    headTilt: 0,
    isLoaded: false
  });

  // Optimized avatar configuration
  const avatarConfig = useMemo(() => ({
    size,
    colors: {
      skin: '#8B4513',
      eye: '#FFFFFF',
      pupil: '#000000',
      mouth: '#FF69B4',
      hair: '#000000'
    },
    animations: {
      blinkDuration: 150,
      blinkInterval: 3000 + Math.random() * 2000,
      speechAmplitude: 0.3,
      eyeTrackingSpeed: 0.1
    }
  }), [size]);

  // Memoized drawing functions for better performance
  const drawFunctions = useMemo(() => ({
    drawHead: (ctx, config) => {
      const centerX = config.size / 2;
      const centerY = config.size / 2;
      const radius = config.size * 0.4;

      // Head shape
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 1.1, 0, 0, 2 * Math.PI);
      ctx.fillStyle = config.colors.skin;
      ctx.fill();
      
      // Simple lighting effect
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3, centerY - radius * 0.3, 0,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fill();
    },

    drawEyes: (ctx, config, state) => {
      const centerX = config.size / 2;
      const centerY = config.size / 2;
      const eyeOffset = config.size * 0.15;
      const eyeSize = config.size * 0.08;

      // Left eye
      const leftEyeX = centerX - eyeOffset + state.eyeX;
      const leftEyeY = centerY - config.size * 0.1 + state.eyeY;
      
      if (!state.blinking) {
        ctx.beginPath();
        ctx.ellipse(leftEyeX, leftEyeY, eyeSize, eyeSize * 0.8, 0, 0, 2 * Math.PI);
        ctx.fillStyle = config.colors.eye;
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(leftEyeX + state.eyeX * 0.3, leftEyeY + state.eyeY * 0.3, eyeSize * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = config.colors.pupil;
        ctx.fill();
      }

      // Right eye
      const rightEyeX = centerX + eyeOffset + state.eyeX;
      const rightEyeY = centerY - config.size * 0.1 + state.eyeY;
      
      if (!state.blinking) {
        ctx.beginPath();
        ctx.ellipse(rightEyeX, rightEyeY, eyeSize, eyeSize * 0.8, 0, 0, 2 * Math.PI);
        ctx.fillStyle = config.colors.eye;
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(rightEyeX + state.eyeX * 0.3, rightEyeY + state.eyeY * 0.3, eyeSize * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = config.colors.pupil;
        ctx.fill();
      }
    },

    drawMouth: (ctx, config, state, emotion, isSpeaking) => {
      const centerX = config.size / 2;
      const centerY = config.size / 2 + config.size * 0.2;
      const mouthWidth = config.size * 0.12;
      const mouthHeight = config.size * 0.06;

      ctx.beginPath();
      
      if (isSpeaking && state.mouthOpen > 0) {
        // Speaking animation
        ctx.ellipse(centerX, centerY, mouthWidth, mouthHeight * (0.5 + state.mouthOpen), 0, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF1493';
      } else {
        // Emotion-based mouth shapes
        switch (emotion) {
          case 'happy':
            ctx.arc(centerX, centerY - mouthHeight, mouthWidth, 0, Math.PI);
            break;
          case 'sad':
            ctx.arc(centerX, centerY + mouthHeight, mouthWidth, Math.PI, 2 * Math.PI);
            break;
          default:
            ctx.ellipse(centerX, centerY, mouthWidth * 0.7, mouthHeight * 0.5, 0, 0, 2 * Math.PI);
        }
        ctx.fillStyle = config.colors.mouth;
      }
      
      ctx.fill();
    }
  }), []);

  // Optimized animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw avatar components
    drawFunctions.drawHead(ctx, avatarConfig);
    drawFunctions.drawEyes(ctx, avatarConfig, avatarState);
    drawFunctions.drawMouth(ctx, avatarConfig, avatarState, emotion, isSpeaking);

    animationRef.current = requestAnimationFrame(animate);
  }, [avatarState, avatarConfig, emotion, isSpeaking, drawFunctions]);

  // Speaking animation
  useEffect(() => {
    let speechAnimation;
    
    if (isSpeaking) {
      speechAnimation = setInterval(() => {
        setAvatarState(prev => ({
          ...prev,
          mouthOpen: Math.random() * avatarConfig.animations.speechAmplitude
        }));
      }, 100);
    } else {
      setAvatarState(prev => ({ ...prev, mouthOpen: 0 }));
    }

    return () => {
      if (speechAnimation) clearInterval(speechAnimation);
    };
  }, [isSpeaking, avatarConfig.animations.speechAmplitude]);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setAvatarState(prev => ({ ...prev, blinking: true }));
      
      setTimeout(() => {
        setAvatarState(prev => ({ ...prev, blinking: false }));
      }, avatarConfig.animations.blinkDuration);
    }, avatarConfig.animations.blinkInterval);

    return () => clearInterval(blinkInterval);
  }, [avatarConfig.animations]);

  // Initialize Web Worker for face detection (if needed)
  useEffect(() => {
    if (!isListening && !isSpeaking) return;

    // Only load worker if face tracking is needed
    const initWorker = async () => {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('../workers/faceDetectionWorker.js', import.meta.url)
          );
          
          workerRef.current.onmessage = (event) => {
            const { type, data } = event.data;
            
            if (type === 'FACES_DETECTED' && data.faces?.[0]) {
              const face = data.faces[0];
              const centerX = face.bbox.x + face.bbox.width / 2;
              const centerY = face.bbox.y + face.bbox.height / 2;
              
              // Smooth eye tracking
              setAvatarState(prev => ({
                ...prev,
                eyeX: prev.eyeX + (centerX - prev.eyeX) * avatarConfig.animations.eyeTrackingSpeed,
                eyeY: prev.eyeY + (centerY - prev.eyeY) * avatarConfig.animations.eyeTrackingSpeed
              }));
            }
          };
        }
      } catch (error) {
        console.warn('Face tracking not available:', error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isListening, isSpeaking, avatarConfig.animations.eyeTrackingSpeed]);

  // Start animation
  useEffect(() => {
    animate();
    setAvatarState(prev => ({ ...prev, isLoaded: true }));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, [size]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`
          rounded-full transition-all duration-300 
          ${isListening ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
          ${isSpeaking ? 'ring-4 ring-blue-400 ring-opacity-75' : ''}
          ${!avatarState.isLoaded ? 'opacity-50' : 'opacity-100'}
        `}
      />
      
      {/* Status indicators */}
      {isListening && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      )}
      
      {isSpeaking && (
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
        </div>
      )}
      
      {/* Message bubble */}
      {message && (
        <div className="absolute top-0 left-full ml-4 max-w-xs">
          <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg">
            <div className="text-sm">{message}</div>
            <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
              <div className="w-0 h-0 border-r-8 border-r-gray-800 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export with performance monitoring
export default React.memo(OptimizedZeekyAvatar, (prevProps, nextProps) => {
  // Only re-render if key props change
  return (
    prevProps.isListening === nextProps.isListening &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.emotion === nextProps.emotion &&
    prevProps.message === nextProps.message &&
    prevProps.size === nextProps.size
  );
});