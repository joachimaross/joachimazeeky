// Face Detection Web Worker for optimized performance
// Runs in background thread to avoid blocking main UI

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

let model = null;
let isModelLoaded = false;

// Load face detection model
async function loadModel() {
  if (isModelLoaded) return model;
  
  try {
    // Use smaller, optimized model for better performance
    model = await tf.loadGraphModel('/models/face_detection_short_range.tflite', {
      fromTFHub: false
    });
    
    // Warm up the model with dummy data
    const dummyInput = tf.zeros([1, 128, 128, 3]);
    await model.executeAsync(dummyInput);
    dummyInput.dispose();
    
    isModelLoaded = true;
    self.postMessage({ type: 'MODEL_LOADED', success: true });
    
    return model;
  } catch (error) {
    console.error('Failed to load face detection model:', error);
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: false, 
      error: error.message 
    });
    return null;
  }
}

// Optimized face detection function
async function detectFaces(imageData, width, height) {
  if (!isModelLoaded || !model) {
    await loadModel();
    if (!model) return { faces: [], performance: null };
  }

  const startTime = performance.now();
  
  try {
    // Convert ImageData to tensor with optimization
    const tensor = tf.browser.fromPixels({ data: imageData, width, height })
      .resizeNearestNeighbor([128, 128]) // Reduce resolution for speed
      .expandDims(0)
      .div(255.0); // Normalize

    // Run detection
    const predictions = await model.executeAsync(tensor);
    
    // Process predictions
    const faces = await processPredictions(predictions);
    
    // Cleanup tensors
    tensor.dispose();
    if (Array.isArray(predictions)) {
      predictions.forEach(p => p.dispose());
    } else {
      predictions.dispose();
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    return {
      faces,
      performance: {
        processingTime,
        fps: 1000 / processingTime,
        memoryUsage: tf.memory()
      }
    };

  } catch (error) {
    console.error('Face detection error:', error);
    return { 
      faces: [], 
      performance: null, 
      error: error.message 
    };
  }
}

// Process model predictions into face data
async function processPredictions(predictions) {
  try {
    // Extract face landmarks and bounding boxes
    const boxes = await predictions[0].data();
    const scores = await predictions[1].data();
    const landmarks = predictions[2] ? await predictions[2].data() : null;

    const faces = [];
    const scoreThreshold = 0.5;

    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > scoreThreshold) {
        const face = {
          bbox: {
            x: boxes[i * 4],
            y: boxes[i * 4 + 1],
            width: boxes[i * 4 + 2] - boxes[i * 4],
            height: boxes[i * 4 + 3] - boxes[i * 4 + 1]
          },
          confidence: scores[i]
        };

        // Add landmarks if available
        if (landmarks) {
          face.landmarks = [];
          for (let j = 0; j < 6; j++) { // 6 key points
            face.landmarks.push({
              x: landmarks[i * 12 + j * 2],
              y: landmarks[i * 12 + j * 2 + 1]
            });
          }
        }

        faces.push(face);
      }
    }

    return faces;
  } catch (error) {
    console.error('Error processing predictions:', error);
    return [];
  }
}

// Performance monitoring
let lastFrameTime = 0;
let frameCount = 0;
let avgFPS = 0;

function updatePerformanceStats(processingTime) {
  const currentTime = performance.now();
  
  if (lastFrameTime > 0) {
    const deltaTime = currentTime - lastFrameTime;
    const currentFPS = 1000 / deltaTime;
    
    frameCount++;
    avgFPS = (avgFPS * (frameCount - 1) + currentFPS) / frameCount;
    
    // Reset stats every 100 frames to prevent overflow
    if (frameCount >= 100) {
      frameCount = 50;
      avgFPS = avgFPS;
    }
  }
  
  lastFrameTime = currentTime;
  
  return {
    currentProcessingTime: processingTime,
    averageFPS: avgFPS,
    memoryUsage: tf.memory()
  };
}

// Worker message handler
self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'INIT':
      await loadModel();
      break;

    case 'DETECT_FACES':
      const { imageData, width, height, frameId } = data;
      const result = await detectFaces(imageData, width, height);
      
      // Add performance stats
      result.performance = updatePerformanceStats(result.performance?.processingTime || 0);
      result.frameId = frameId;
      
      self.postMessage({
        type: 'FACES_DETECTED',
        data: result
      });
      break;

    case 'CLEANUP':
      // Cleanup resources
      if (model) {
        model.dispose();
        model = null;
        isModelLoaded = false;
      }
      tf.disposeVariables();
      self.postMessage({ type: 'CLEANUP_COMPLETE' });
      break;

    case 'GET_STATS':
      self.postMessage({
        type: 'STATS',
        data: {
          isModelLoaded,
          memoryUsage: tf.memory(),
          averageFPS: avgFPS,
          frameCount
        }
      });
      break;

    default:
      console.warn('Unknown worker message type:', type);
  }
};

// Handle worker errors
self.onerror = (error) => {
  console.error('Face detection worker error:', error);
  self.postMessage({
    type: 'ERROR',
    error: error.message
  });
};

// Initialize TensorFlow.js backend
tf.ready().then(() => {
  console.log('TensorFlow.js backend initialized in worker');
  self.postMessage({ type: 'WORKER_READY' });
});