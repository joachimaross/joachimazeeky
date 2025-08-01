import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Box, Text } from '@react-three/drei';
import * as THREE from 'three';

const ZeekyAvatar = ({ isListening, isSpeaking, emotion = 'neutral', message = '' }) => {
  const canvasRef = useRef(null);
  const webcamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [avatarState, setAvatarState] = useState({
    eyeX: 0,
    eyeY: 0,
    mouthOpen: 0,
    eyebrowRaise: 0,
    expression: 'neutral',
    blinking: false
  });

  // Avatar expressions and animations
  const expressions = {
    neutral: { eyebrowRaise: 0, mouthCurve: 0, eyeWidth: 1 },
    happy: { eyebrowRaise: 0.3, mouthCurve: 0.8, eyeWidth: 0.8 },
    confused: { eyebrowRaise: 0.6, mouthCurve: -0.2, eyeWidth: 1.2 },
    focused: { eyebrowRaise: -0.2, mouthCurve: 0, eyeWidth: 0.6 },
    excited: { eyebrowRaise: 0.8, mouthCurve: 1, eyeWidth: 1.4 },
    concerned: { eyebrowRaise: 0.4, mouthCurve: -0.4, eyeWidth: 1.1 }
  };

  // Initialize face detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const faceModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          refineLandmarks: true,
        };
        const detector = await faceLandmarksDetection.createDetector(faceModel, detectorConfig);
        setModel(detector);
      } catch (error) {
        console.error('Error loading face detection model:', error);
      }
    };
    loadModel();
  }, []);

  // Detect user's face and emotions
  const detectFace = useCallback(async () => {
    if (model && webcamRef.current?.video?.readyState === 4) {
      const video = webcamRef.current.video;
      const predictions = await model.estimateFaces(video);
      
      if (predictions.length > 0) {
        const face = predictions[0];
        // Analyze facial landmarks for emotion detection
        analyzeFacialExpression(face.keypoints);
      }
    }
  }, [model]);

  // Analyze facial expression from landmarks
  const analyzeFacialExpression = (keypoints) => {
    if (!keypoints || keypoints.length === 0) return;

    // Calculate eye positions for avatar to track user
    const leftEye = keypoints[33]; // Left eye landmark
    const rightEye = keypoints[263]; // Right eye landmark
    const nose = keypoints[1]; // Nose tip
    
    if (leftEye && rightEye && nose) {
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      
      setAvatarState(prev => ({
        ...prev,
        eyeX: (eyeCenterX - nose.x) * 0.01,
        eyeY: (eyeCenterY - nose.y) * 0.01
      }));
    }
  };

  // Animate avatar based on speech
  useEffect(() => {
    if (isSpeaking && message) {
      const words = message.split(' ');
      let wordIndex = 0;
      
      const speechAnimation = setInterval(() => {
        setAvatarState(prev => ({
          ...prev,
          mouthOpen: Math.random() * 0.8 + 0.2,
          eyebrowRaise: Math.random() * 0.3
        }));
        
        wordIndex++;
        if (wordIndex >= words.length) {
          clearInterval(speechAnimation);
          setAvatarState(prev => ({ ...prev, mouthOpen: 0 }));
        }
      }, 200);
      
      return () => clearInterval(speechAnimation);
    }
  }, [isSpeaking, message]);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setAvatarState(prev => ({ ...prev, blinking: true }));
      setTimeout(() => {
        setAvatarState(prev => ({ ...prev, blinking: false }));
      }, 150);
    }, 3000 + Math.random() * 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Web Worker-based face detection for optimal performance
  useEffect(() => {
    let worker = null;
    let rafId = null;
    let isDetecting = false;
    let frameId = 0;
    const DETECTION_INTERVAL = 200; // 5 FPS for better performance

    // Initialize Web Worker
    const initWorker = () => {
      try {
        worker = new Worker(new URL('../workers/faceDetectionWorker.js', import.meta.url));
        
        worker.onmessage = (event) => {
          const { type, data } = event.data;
          
          switch (type) {
            case 'WORKER_READY':
              console.log('Face detection worker ready');
              worker.postMessage({ type: 'INIT' });
              break;
              
            case 'MODEL_LOADED':
              if (data.success) {
                console.log('Face detection model loaded in worker');
                startDetection();
              } else {
                console.error('Failed to load model:', data.error);
              }
              break;
              
            case 'FACES_DETECTED':
              handleFaceDetectionResult(data);
              isDetecting = false;
              break;
              
            case 'ERROR':
              console.error('Worker error:', data.error);
              isDetecting = false;
              break;
          }
        };
        
        worker.onerror = (error) => {
          console.error('Face detection worker error:', error);
          isDetecting = false;
        };
        
      } catch (error) {
        console.warn('Web Workers not supported, falling back to main thread:', error);
        // Fallback to original detection method
        startMainThreadDetection();
      }
    };

    const handleFaceDetectionResult = (result) => {
      if (result.faces && result.faces.length > 0) {
        const primaryFace = result.faces[0];
        
        // Update avatar state based on face detection
        if (primaryFace.landmarks) {
          updateFaceTracking(primaryFace);
        }
        
        // Performance monitoring
        if (result.performance) {
          // Only log performance issues if FPS drops significantly
          if (result.performance.averageFPS < 2) {
            console.warn('Face detection performance degraded:', result.performance);
          }
        }
      }
    };

    const updateFaceTracking = (face) => {
      // Update avatar eye tracking and head position
      const centerX = face.bbox.x + face.bbox.width / 2;
      const centerY = face.bbox.y + face.bbox.height / 2;
      
      // Smooth interpolation for natural movement
      setFacePosition(prev => ({
        x: prev ? lerp(prev.x, centerX, 0.3) : centerX,
        y: prev ? lerp(prev.y, centerY, 0.3) : centerY,
        confidence: face.confidence
      }));
    };

    const lerp = (start, end, factor) => {
      return start + (end - start) * factor;
    };

    const startDetection = () => {
      if (!worker || isDetecting) return;
      
      let lastDetectionTime = 0;
      
      const performDetection = () => {
        const now = performance.now();
        
        if (now - lastDetectionTime < DETECTION_INTERVAL || isDetecting) {
          rafId = requestAnimationFrame(performDetection);
          return;
        }
        
        if (videoRef.current && (isListening || isSpeaking)) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const video = videoRef.current;
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = 320; // Reduced resolution for performance
            canvas.height = 240;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            isDetecting = true;
            lastDetectionTime = now;
            frameId++;
            
            worker.postMessage({
              type: 'DETECT_FACES',
              data: {
                imageData: imageData.data,
                width: canvas.width,
                height: canvas.height,
                frameId
              }
            });
          }
        }
        
        rafId = requestAnimationFrame(performDetection);
      };
      
      rafId = requestAnimationFrame(performDetection);
    };

    const startMainThreadDetection = () => {
      // Fallback to original detection method with throttling
      let lastDetectionTime = 0;
      
      const performDetection = async () => {
        const now = performance.now();
        
        if (now - lastDetectionTime < DETECTION_INTERVAL || isDetecting) {
          rafId = requestAnimationFrame(performDetection);
          return;
        }
        
        if (model && (isListening || isSpeaking)) {
          isDetecting = true;
          lastDetectionTime = now;
          
          try {
            await detectFace();
          } catch (error) {
            console.warn('Main thread face detection error:', error);
          } finally {
            isDetecting = false;
          }
        }
        
        rafId = requestAnimationFrame(performDetection);
      };
      
      if (model) {
        rafId = requestAnimationFrame(performDetection);
      }
    };

    // Initialize detection system
    if (isListening || isSpeaking) {
      initWorker();
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (worker) {
        worker.postMessage({ type: 'CLEANUP' });
        worker.terminate();
      }
    };
  }, [isListening, isSpeaking, model]);

  // Draw avatar on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set canvas size
    canvas.width = 300;
    canvas.height = 300;
    
    // Draw holographic effect
    const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
    gradient.addColorStop(0, 'rgba(0, 150, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 100, 200, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 300);
    
    // Avatar colors - Black male with medium brown skin
    const skinColor = '#8B4513';
    const hairColor = '#2F1B14';
    const eyeColor = '#4A4A4A';
    
    // Draw face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(150, 160, 80, 100, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw hair (low fade)
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(150, 100, 85, 60, 0, 0, Math.PI);
    ctx.fill();
    
    // Draw eyes
    const currentExpression = expressions[emotion] || expressions.neutral;
    const eyeWidth = 20 * currentExpression.eyeWidth;
    const eyeHeight = avatarState.blinking ? 2 : 15;
    
    // Left eye
    ctx.fillStyle = 'white';
    ctx.fillRect(120 + avatarState.eyeX, 140 + avatarState.eyeY, eyeWidth, eyeHeight);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(125 + avatarState.eyeX, 142 + avatarState.eyeY, 10, eyeHeight - 4);
    
    // Right eye
    ctx.fillStyle = 'white';
    ctx.fillRect(160 + avatarState.eyeX, 140 + avatarState.eyeY, eyeWidth, eyeHeight);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(165 + avatarState.eyeX, 142 + avatarState.eyeY, 10, eyeHeight - 4);
    
    // Draw eyebrows
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 4;
    const browRaise = avatarState.eyebrowRaise + currentExpression.eyebrowRaise;
    
    // Left eyebrow
    ctx.beginPath();
    ctx.moveTo(115, 125 - browRaise * 10);
    ctx.lineTo(145, 120 - browRaise * 10);
    ctx.stroke();
    
    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(155, 120 - browRaise * 10);
    ctx.lineTo(185, 125 - browRaise * 10);
    ctx.stroke();
    
    // Draw nose
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(150, 170, 8, 12, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw mouth
    const mouthY = 200;
    const mouthOpen = avatarState.mouthOpen;
    const mouthCurve = currentExpression.mouthCurve;
    
    ctx.fillStyle = '#2F1B14';
    ctx.beginPath();
    if (mouthOpen > 0.1) {
      // Open mouth (speaking)
      ctx.ellipse(150, mouthY, 15, 8 + mouthOpen * 10, 0, 0, 2 * Math.PI);
    } else {
      // Closed mouth with expression
      ctx.ellipse(150, mouthY + mouthCurve * 5, 20, 3, 0, 0, 2 * Math.PI);
    }
    ctx.fill();
    
    // Draw listening indicator
    if (isListening) {
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(150, 150, 120, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Pulsing effect
      const pulseRadius = 120 + Math.sin(Date.now() * 0.01) * 10;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(150, 150, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
  }, [avatarState, emotion, isListening, isSpeaking]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Holographic container */}
        <div className="relative bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-lg border border-blue-400/30 rounded-full p-4">
          {/* Avatar Canvas */}
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-full"
            style={{ 
              filter: 'drop-shadow(0 0 20px rgba(0, 150, 255, 0.5))',
              background: 'radial-gradient(circle, rgba(0,150,255,0.1) 0%, rgba(0,100,200,0.05) 100%)'
            }}
          />
          
          {/* Status indicators */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -bottom-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold"
              >
                👂 Listening
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -bottom-2 -left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold"
              >
                🗣️ Speaking
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Emotion indicator */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium capitalize">
            {emotion}
          </div>
        </div>
        
        {/* Hidden webcam for face detection */}
        <Webcam
          ref={webcamRef}
          className="hidden"
          mirrored={true}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: "user"
          }}
        />
      </motion.div>
    </div>
  );
};

export default ZeekyAvatar;