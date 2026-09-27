import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, SwitchCamera, Clock, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface WebcamCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (file: File) => void;
}

export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Start webcam stream
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCapturedDataUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const triggerCountdownAndCapture = () => {
    setCountdown(3);
    let current = 3;

    timerRef.current = window.setInterval(() => {
      current -= 1;
      if (current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(null);
        takeSnapshot();
      } else {
        setCountdown(current);
      }
    }, 1000);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontal if selfie camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedDataUrl(dataUrl);
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedDataUrl) return;

    fetch(capturedDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'Webcam_Passport_Photo.jpg', { type: 'image/jpeg' });
        onCapturePhoto(file);
        onClose();
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Take Live Passport Photo with Camera"
      contentClassName="max-w-xl"
    >
      <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        <p className="text-slate-600 dark:text-slate-400 text-xs">
          Align your head and eyes inside the green oval guide. Keep both ears visible and look directly into the camera.
        </p>

        {/* Video / Snapshot Viewport */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center shadow-md">
          {capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="Captured Snapshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Biometric Face Framing Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full text-emerald-400/80" viewBox="0 0 100 130">
                  <ellipse
                    cx="50"
                    cy="52"
                    rx="26"
                    ry="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  {/* Eye line */}
                  <line x1="30" y1="46" x2="70" y2="46" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-6xl font-black text-white animate-ping">
                    {countdown}
                  </span>
                </div>
              )}
            </>
          )}

          {hasPermission === false && (
            <div className="absolute inset-0 bg-slate-900/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-bold">Camera Access Denied or Unavailable</p>
              <p className="text-xs text-slate-300 max-w-xs">
                Please allow camera access in your browser address bar permissions or upload an existing photo from your storage.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          {!capturedDataUrl ? (
            <>
              <button
                type="button"
                onClick={switchCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4 text-slate-600" />
                <span>Switch Camera</span>
              </button>

              <button
                type="button"
                onClick={triggerCountdownAndCapture}
                disabled={hasPermission !== true || countdown !== null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{countdown !== null ? `Capturing in ${countdown}...` : 'Capture (3s Timer)'}</span>
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleRetake} className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </Button>

              <Button variant="primary" size="sm" onClick={handleConfirm} className="flex items-center gap-1.5 shadow-sm">
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
