import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RotateCw, Check, AlertCircle, RefreshCw, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'unsupported' | 'other' | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [shutterFlashing, setShutterFlashing] = useState<boolean>(false);

  // Camera devices & facing mode
  const [availableDevices, setAvailableDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping stream tracks:', err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setAvailableDevices(videoInputs);
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
    }
  }, []);

  // Attach stream to video element and handle playback safely
  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    // Set playsinline and muted explicitly
    video.playsInline = true;
    video.muted = true;

    // Handle loadedmetadata
    video.onloadedmetadata = () => {
      video.play().catch((playErr) => {
        console.warn('video.play() rejected:', playErr);
      });
    };

    // When frames start playing
    video.onplaying = () => {
      setIsStreaming(true);
      setIsInitializing(false);
    };

    // Immediate play attempt
    video.play().catch((err) => {
      // Autoplay might be deferred until user gesture or metadata loaded
      console.log('Immediate play attempt deferred:', err?.message);
    });
  }, []);

  // Start camera with progressive fallback constraints
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setErrorType(null);
    setIsInitializing(true);
    setIsStreaming(false);

    // Verify browser support
    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setIsInitializing(false);
      setErrorType('unsupported');
      setCameraError(
        'Webcam access (getUserMedia) is not supported or is restricted in this browser frame. You can still use your device camera or upload an image below.'
      );
      return;
    }

    // Helper to identify permission or security denials
    const isPermissionError = (err: any) =>
      err?.name === 'NotAllowedError' ||
      err?.name === 'PermissionDeniedError' ||
      err?.name === 'SecurityError' ||
      (typeof err?.message === 'string' && (
        err.message.toLowerCase().includes('permission denied') ||
        err.message.toLowerCase().includes('not allowed') ||
        err.message.toLowerCase().includes('permission') ||
        err.message.toLowerCase().includes('denied')
      ));

    // Fast-path permission check if supported by browser
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permStatus.state === 'denied') {
          console.warn('Camera permission is already denied in browser permissions state.');
          setIsInitializing(false);
          setErrorType('permission');
          setCameraError(
            'Camera permission is denied or blocked by your browser. Please allow camera permissions in your browser address bar, or use the Native Camera button below.'
          );
          return;
        }
      } catch {
        // navigator.permissions.query({ name: 'camera' }) may reject on some browsers; continue to getUserMedia
      }
    }

    // Attempt 1: Targeted constraints
    try {
      const videoConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;
      attachStreamToVideo(stream);
      await updateDeviceList();
      return;
    } catch (err: any) {
      if (isPermissionError(err)) {
        console.warn('Camera access denied by user or browser policy:', err?.message || err);
        setIsInitializing(false);
        setErrorType(err?.name === 'SecurityError' ? 'unsupported' : 'permission');
        setCameraError(
          err?.name === 'SecurityError'
            ? 'Camera access is restricted in this window or iframe by security policy. Use the Native Camera button below.'
            : 'Camera permission was denied. Please allow camera permissions in your browser address bar, or use the Native Camera button below.'
        );
        return;
      }

      console.warn('Targeted camera constraint failed, attempting fallback...', err?.message || err);

      // Attempt 2: Relaxed resolution with facingMode ideal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
          },
          audio: false,
        });

        streamRef.current = stream;
        attachStreamToVideo(stream);
        await updateDeviceList();
        return;
      } catch (err2: any) {
        if (isPermissionError(err2)) {
          console.warn('Camera permission not granted on secondary attempt:', err2?.message || err2);
          setIsInitializing(false);
          setErrorType('permission');
          setCameraError(
            'Camera permission was denied. Please allow camera permissions in your browser address bar, or use the Native Camera button below.'
          );
          return;
        }

        console.warn('Relaxed facingMode camera failed, attempting generic video: true...', err2?.message || err2);

        // Attempt 3: Bare minimum { video: true }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          streamRef.current = stream;
          attachStreamToVideo(stream);
          await updateDeviceList();
          return;
        } catch (finalErr: any) {
          console.warn('Webcam stream could not be acquired (permissions, in use, or unsupported):', finalErr?.name, finalErr?.message);
          setIsInitializing(false);

          if (isPermissionError(finalErr)) {
            setErrorType('permission');
            setCameraError(
              'Camera permission was denied. Please allow camera permissions in your browser address bar, or use the Native Camera button below.'
            );
          } else if (finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError') {
            setErrorType('device');
            setCameraError('No camera device was detected on your system. You can snap a photo using the Native Camera or file upload below.');
          } else if (finalErr.name === 'NotReadableError' || finalErr.name === 'TrackStartError') {
            setErrorType('device');
            setCameraError(
              'Your webcam appears to be currently in use by another application (e.g. Zoom, Google Meet) or blocked by system privacy settings.'
            );
          } else if (finalErr.name === 'SecurityError') {
            setErrorType('unsupported');
            setCameraError('Camera access is restricted in this window or iframe by security policy. Use the Native Camera button below.');
          } else {
            setErrorType('other');
            setCameraError(
              finalErr.message || 'Unable to connect to camera. Please use the Native Device Camera option below.'
            );
          }
        }
      }
    }
  }, [stopCamera, attachStreamToVideo, selectedDeviceId, facingMode, updateDeviceList]);

  // Start webcam when opened, stop on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, facingMode, startCamera, stopCamera]);

  // Capture high-res frame from video stream
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger visual flash
    setShutterFlashing(true);
    setTimeout(() => setShutterFlashing(false), 200);

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing user camera for mirror natural feel
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Create high-clarity JPEG for Gemma / Gemini OCR
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Handle native camera capture or image selection
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCapturedImage(base64);
        setCameraError(null);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    // If device selector has devices, we can cycle
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedDeviceId(''); // clear exact ID so facingMode takes precedence
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide block">
                {capturedImage ? 'Review Invoice Photo' : 'Invoice Camera Scanner'}
              </span>
              <span className="text-[11px] text-slate-400">
                {capturedImage ? 'Ensure text and numbers are clearly legible' : 'Live optical bill & invoice capture'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close webcam scanner modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Preview Box */}
        <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Shutter white flash effect */}
          {shutterFlashing && (
            <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Captured Image Review Mode */}
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured invoice preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-emerald-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold">Snapshot Ready for AI Scan</span>
              </div>
            </div>
          ) : (
            <>
              {/* Always keep video in DOM so videoRef is never null on retry */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isStreaming && !cameraError ? 'opacity-100' : 'opacity-0'
                } ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Connecting / Initializing Spinner */}
              {isInitializing && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300 space-y-3 z-10">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs font-medium text-slate-300">Connecting to camera stream...</p>
                  <p className="text-[11px] text-slate-500">Checking device permissions</p>
                </div>
              )}

              {/* Framing guidelines overlay when active */}
              {isStreaming && !cameraError && (
                <div className="absolute inset-6 border-2 border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-4 z-10">
                  <div className="text-[11px] font-semibold text-emerald-300 bg-slate-950/75 px-3 py-1 rounded-full self-center backdrop-blur-xs border border-emerald-500/30">
                    Align bill or invoice inside frame
                  </div>
                  <div className="text-[10px] text-slate-300 bg-slate-950/70 px-2.5 py-0.5 rounded-md self-center">
                    Hold paper steady • Ensure good lighting
                  </div>
                </div>
              )}

              {/* Error overlay with actionable options */}
              {cameraError && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/95 z-20 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>

                  <div className="max-w-md space-y-1">
                    <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
                    <p className="text-xs text-rose-300 leading-relaxed">{cameraError}</p>
                  </div>

                  {/* Action buttons on error */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      onClick={startCamera}
                      className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>

                    {/* Native Camera Button */}
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo with Native Camera</span>
                    </button>

                    {/* Upload File Button */}
                    <button
                      onClick={() => fileUploadInputRef.current?.click()}
                      className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hidden file inputs for Native Camera & File Pick */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeFileChange}
            className="hidden"
          />
          <input
            ref={fileUploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleNativeFileChange}
            className="hidden"
          />
        </div>

        {/* Controls footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 flex flex-col space-y-3">
          {!capturedImage ? (
            <div className="flex items-center justify-between">
              {/* Left: Device Switcher / Flip Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFacingMode}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 transition cursor-pointer border border-slate-700/60"
                  title="Switch front/back camera"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                  </span>
                </button>

                {availableDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="text-xs bg-slate-800 text-slate-200 rounded-xl px-2.5 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="">Default Camera</option>
                    {availableDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Center: Shutter Capture Button */}
              <button
                onClick={takePhoto}
                disabled={!isStreaming || !!cameraError}
                aria-label="Capture invoice photo"
                className="w-16 h-16 rounded-full border-4 border-emerald-400/40 p-1 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                <div className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
                  <Camera className="w-5 h-5 text-slate-950" />
                </div>
              </button>

              {/* Right: Quick Native Camera / Cancel */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="hidden sm:flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                  title="Take photo directly with native device camera"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Native App</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Review & Action State */
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready to extract inventory items</span>
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer border border-slate-700"
                >
                  Retake Photo
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Process with AI</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom subtle fallback hint */}
          {!capturedImage && !cameraError && (
            <div className="pt-2 border-t border-slate-900 flex items-center justify-center space-x-3 text-[11px] text-slate-500">
              <span>Having trouble with webcam?</span>
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
              >
                Snap with phone camera
              </button>
              <span>•</span>
              <button
                onClick={() => fileUploadInputRef.current?.click()}
                className="text-slate-400 hover:text-slate-300 underline cursor-pointer"
              >
                Upload image file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
