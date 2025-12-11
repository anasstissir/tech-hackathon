import { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

export const CameraView = ({ onPoseDetected }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    // Use a ref to always access the latest onPoseDetected callback
    const onPoseDetectedRef = useRef(onPoseDetected);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onPoseDetectedRef.current = onPoseDetected;
    }, [onPoseDetected]);

    useEffect(() => {
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            },
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        const onResults = (results) => {
            if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;

            const videoWidth = webcamRef.current.video.videoWidth;
            const videoHeight = webcamRef.current.video.videoHeight;

            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;

            const canvasCtx = canvasRef.current.getContext('2d');
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Check if we have landmarks
            if (results.poseLandmarks) {
                // Use the ref to always call the latest callback
                onPoseDetectedRef.current(results.poseLandmarks);

                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                    { color: '#00FF00', lineWidth: 4 });
                drawLandmarks(canvasCtx, results.poseLandmarks,
                    { color: '#FF0000', lineWidth: 2 });
            }
            canvasCtx.restore();
        };

        pose.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current && webcamRef.current.video) {
                        await pose.send({ image: webcamRef.current.video });
                    }
                },
                width: 1280,
                height: 720,
            });
            camera.start();
        }
    }, []);

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700">
            <Webcam
                ref={webcamRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                mirrored={true} // Important for fitness mirrors
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} // Mirror canvas to match webcam
            />
        </div>
    );
};
