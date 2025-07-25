// Advanced File Upload and Processing System for Zeeky AI
import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploadProcessor = ({ onFileProcessed, maxFileSize = 50 * 1024 * 1024 }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Supported file types and their processors
  const supportedTypes = {
    // Documents
    'application/pdf': { icon: '📄', processor: 'document', color: 'red' },
    'application/msword': { icon: '📝', processor: 'document', color: 'blue' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', processor: 'document', color: 'blue' },
    'text/plain': { icon: '📋', processor: 'text', color: 'gray' },
    'text/csv': { icon: '📊', processor: 'data', color: 'green' },
    'application/vnd.ms-excel': { icon: '📊', processor: 'data', color: 'green' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', processor: 'data', color: 'green' },
    
    // Images
    'image/jpeg': { icon: '🖼️', processor: 'image', color: 'purple' },
    'image/png': { icon: '🖼️', processor: 'image', color: 'purple' },
    'image/gif': { icon: '🖼️', processor: 'image', color: 'purple' },
    'image/webp': { icon: '🖼️', processor: 'image', color: 'purple' },
    'image/svg+xml': { icon: '🖼️', processor: 'image', color: 'purple' },
    
    // Audio
    'audio/mpeg': { icon: '🎵', processor: 'audio', color: 'yellow' },
    'audio/wav': { icon: '🎵', processor: 'audio', color: 'yellow' },
    'audio/ogg': { icon: '🎵', processor: 'audio', color: 'yellow' },
    'audio/mp4': { icon: '🎵', processor: 'audio', color: 'yellow' },
    
    // Video
    'video/mp4': { icon: '🎥', processor: 'video', color: 'indigo' },
    'video/avi': { icon: '🎥', processor: 'video', color: 'indigo' },
    'video/mov': { icon: '🎥', processor: 'video', color: 'indigo' },
    'video/webm': { icon: '🎥', processor: 'video', color: 'indigo' },
    
    // Code
    'text/javascript': { icon: '💻', processor: 'code', color: 'orange' },
    'text/html': { icon: '💻', processor: 'code', color: 'orange' },
    'text/css': { icon: '💻', processor: 'code', color: 'orange' },
    'application/json': { icon: '💻', processor: 'code', color: 'orange' },
    'application/xml': { icon: '💻', processor: 'code', color: 'orange' }
  };

  // File processors
  const processors = {
    document: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/process/document', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Document processing failed');
      return await response.json();
    },

    image: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/process/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Image processing failed');
      return await response.json();
    },

    audio: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/process/audio', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Audio processing failed');
      return await response.json();
    },

    video: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/process/video', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Video processing failed');
      return await response.json();
    },

    text: async (file) => {
      const text = await file.text();
      return {
        type: 'text',
        content: text,
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        analysis: {
          sentiment: 'neutral', // Placeholder - would integrate with sentiment analysis
          topics: [], // Placeholder - would extract topics
          summary: text.substring(0, 200) + '...'
        }
      };
    },

    data: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/process/data', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Data processing failed');
      return await response.json();
    },

    code: async (file) => {
      const code = await file.text();
      return {
        type: 'code',
        content: code,
        language: detectLanguage(file.name, file.type),
        lineCount: code.split('\n').length,
        analysis: {
          complexity: 'medium', // Placeholder
          functions: [], // Placeholder - would extract functions
          imports: [], // Placeholder - would extract imports
          issues: [] // Placeholder - would run linting
        }
      };
    }
  };

  const detectLanguage = (filename, mimeType) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return langMap[ext] || 'text';
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setProcessing(true);
    setProcessingProgress(0);

    const processedFiles = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileType = supportedTypes[file.type] || { icon: '📎', processor: 'text', color: 'gray' };

      try {
        setProcessingProgress(((i + 0.5) / validFiles.length) * 100);

        // Process file based on type
        const processor = processors[fileType.processor] || processors.text;
        const result = await processor(file);

        const processedFile = {
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          icon: fileType.icon,
          color: fileType.color,
          processor: fileType.processor,
          processedAt: new Date().toISOString(),
          result: result,
          status: 'completed'
        };

        processedFiles.push(processedFile);
        setProcessingProgress(((i + 1) / validFiles.length) * 100);

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        
        const errorFile = {
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          icon: '❌',
          color: 'red',
          processor: fileType.processor,
          processedAt: new Date().toISOString(),
          result: null,
          status: 'error',
          error: error.message
        };

        processedFiles.push(errorFile);
      }
    }

    setUploadedFiles(prev => [...prev, ...processedFiles]);
    setProcessing(false);
    setProcessingProgress(0);

    // Callback to parent component
    if (onFileProcessed) {
      onFileProcessed(processedFiles);
    }

  }, [maxFileSize, onFileProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: Object.keys(supportedTypes).reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {})
  });

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getColorClasses = (color) => {
    const colorMap = {
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${processing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="space-y-4">
          <div className="text-6xl">📁</div>
          
          {isDragActive ? (
            <p className="text-lg text-blue-600 font-medium">Drop files here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-700 font-medium mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports documents, images, audio, video, and code files
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Maximum file size: {maxFileSize / 1024 / 1024}MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Processing Progress */}
      {processing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Processing files...</span>
            <span className="text-sm text-gray-500">{Math.round(processingProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Processed Files ({uploadedFiles.length})
          </h3>
          
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`
                  border rounded-lg p-4 ${getColorClasses(file.color)}
                  ${file.status === 'error' ? 'border-red-300 bg-red-50' : ''}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{file.icon}</span>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{file.name}</h4>
                        <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                          {file.processor}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {formatFileSize(file.size)} • {new Date(file.processedAt).toLocaleTimeString()}
                      </p>
                      
                      {file.status === 'error' && (
                        <p className="text-sm text-red-600 mt-2">
                          Error: {file.error}
                        </p>
                      )}
                      
                      {file.result && (
                        <div className="mt-3 text-sm">
                          {file.processor === 'text' && (
                            <div>
                              <p><strong>Words:</strong> {file.result.wordCount}</p>
                              <p><strong>Characters:</strong> {file.result.charCount}</p>
                            </div>
                          )}
                          
                          {file.processor === 'code' && (
                            <div>
                              <p><strong>Language:</strong> {file.result.language}</p>
                              <p><strong>Lines:</strong> {file.result.lineCount}</p>
                            </div>
                          )}
                          
                          {file.result.analysis && (
                            <p className="mt-2 text-gray-600">
                              {file.result.analysis.summary || 'Analysis completed'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supported Types */}
      <div className="mt-8">
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            View supported file types
          </summary>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(supportedTypes).map(([type, info]) => (
              <div key={type} className={`p-2 rounded border ${getColorClasses(info.color)}`}>
                <span className="mr-1">{info.icon}</span>
                {type.split('/')[1] || type}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default FileUploadProcessor;