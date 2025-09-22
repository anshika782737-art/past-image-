/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CameraViewProps {
    onClose: () => void;
    onPhotoTaken: (imageDataUrl: string) => void;
}

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

const CameraView: React.FC<CameraViewProps> = ({ onClose, onPhotoTaken }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [error, setError] = useState<string | null>(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    useEffect(() => {
        // Check for multiple cameras to decide if we show the switch button
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoInputs = devices.filter(device => device.kind === 'videoinput');
            if (videoInputs.length > 1) {
                setHasMultipleCameras(true);
            }
        });
    }, []);

    useEffect(() => {
        // Stop any existing stream before starting a new one
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                setStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setError(null);
            })
            .catch(err => {
                console.error("Error accessing camera:", err);
                if (err instanceof Error) {
                  if (err.name === 'NotAllowedError') {
                      setError("Camera permission denied. Please enable it in your browser settings and refresh.");
                  } else {
                      setError("Could not access camera. Please make sure it's not being used by another app.");
                  }
                }
            });

        // Cleanup function
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]); // Rerun effect when facingMode changes

    const handleTakePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Match canvas dimensions to the video's actual dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if(context){
                // Flip the image horizontally if it's the front camera
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(dataUrl);
            }
        }
    };

    const handleConfirm = () => {
        if (capturedImage) {
            onPhotoTaken(capturedImage);
        }
    };
    
    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden relative shadow-2xl">
                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center text-red-400 p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-semibold">Camera Error</p>
                        <p>{error}</p>
                    </div>
                ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured photo" className="w-full h-full object-contain" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-8 w-full max-w-3xl flex items-center justify-center gap-6">
                {error ? (
                     <button onClick={onClose} className={primaryButtonClasses}>
                        Go Back
                    </button>
                ) : capturedImage ? (
                    <>
                        <button onClick={handleRetake} className={secondaryButtonClasses}>Retake</button>
                        <button onClick={handleConfirm} className={primaryButtonClasses}>Use Photo</button>
                    </>
                ) : (
                    <>
                        {/* Left placeholder for balance */}
                        <div className="w-20 h-20" /> 
                        
                        {/* Shutter Button */}
                        <button onClick={handleTakePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-offset-4 ring-offset-black/50 ring-white/50 transform transition-transform hover:scale-110 focus:outline-none" aria-label="Take Photo">
                            <div className="w-16 h-16 rounded-full bg-white ring-2 ring-black"></div>
                        </button>

                        {/* Switch Camera Button */}
                        <div className="w-20 h-20 flex items-center justify-center">
                            {hasMultipleCameras && (
                                <button onClick={handleSwitchCamera} className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transform transition-transform hover:scale-110 focus:outline-none" aria-label="Switch Camera">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"></path>
                                        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path>
                                     </svg>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
             {/* Always show a close button unless an image is captured */}
            {!capturedImage && !error && (
                <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/75" aria-label="Close camera">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </motion.div>
    );
};

export default CameraView;
