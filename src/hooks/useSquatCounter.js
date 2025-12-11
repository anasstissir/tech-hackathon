import { useState, useCallback, useRef } from 'react';

export const useSquatCounter = () => {
    const [count, setCount] = useState(0);
    const [angle, setAngle] = useState(180);
    const [stage, setStage] = useState('UP'); // 'UP' or 'DOWN'
    const [feedback, setFeedback] = useState('Prêt pour commencer');
    const [isGoodForm, setIsGoodForm] = useState(true);

    // Use refs for values that need to be accessed in the callback without causing re-creation
    const stageRef = useRef('UP');
    const minAngleInRepRef = useRef(180); // Track lowest angle in current rep

    // Calculate angle between 3 points (in degrees)
    const calculateAngle = (a, b, c) => {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    };

    // Stable callback that uses refs to avoid stale closures
    const processLandmarks = useCallback((landmarks) => {
        if (!landmarks) return;

        // MediaPipe Pose Landmarks:
        // 11, 12: Left/Right Shoulder
        // 23, 24: Left/Right Hip
        // 25, 26: Left/Right Knee
        // 27, 28: Left/Right Ankle

        // Determine which side is more visible (for side profile)
        const leftVis = (landmarks[23].visibility + landmarks[25].visibility + landmarks[27].visibility) / 3;
        const rightVis = (landmarks[24].visibility + landmarks[26].visibility + landmarks[28].visibility) / 3;

        let shoulder, hip, knee, ankle;

        if (leftVis > rightVis) {
            shoulder = landmarks[11];
            hip = landmarks[23];
            knee = landmarks[25];
            ankle = landmarks[27];
        } else {
            shoulder = landmarks[12];
            hip = landmarks[24];
            knee = landmarks[26];
            ankle = landmarks[28];
        }

        // Check visibility of key landmarks
        const hasGoodVisibility = 
            hip.visibility > 0.5 && 
            knee.visibility > 0.5 && 
            ankle.visibility > 0.5 &&
            shoulder.visibility > 0.4;

        if (!hasGoodVisibility) {
            setFeedback('👀 Cannot see you clearly - adjust position');
            return;
        }

        // === CALCULATE KEY ANGLES ===
        
        // 1. Knee angle (Hip-Knee-Ankle) - main squat depth indicator
        const kneeAngle = Math.round(calculateAngle(hip, knee, ankle));
        setAngle(kneeAngle);

        // 2. Torso/Back angle (how upright is the torso)
        // Calculate angle of torso from vertical - shoulder relative to hip
        const torsoLeanX = shoulder.x - hip.x;
        const torsoLeanY = hip.y - shoulder.y; // Inverted because Y increases downward
        const torsoAngleFromVertical = Math.abs(Math.atan2(torsoLeanX, torsoLeanY) * (180 / Math.PI));

        // 3. Knee over toes check (in side profile)
        // If knee X is significantly past ankle X, knees are going too far forward
        const kneeOverToesAmount = (knee.x - ankle.x) * 100; // Positive = knees forward

        // === FORM ERROR DETECTION ===
        let formErrors = [];
        let currentIsGoodForm = true;

        // Error 1: Forward lean (torso leaning too far forward)
        // During squat, some forward lean is normal (up to ~45°), but more is bad
        const MAX_FORWARD_LEAN = 50; // degrees from vertical
        if (torsoAngleFromVertical > MAX_FORWARD_LEAN && kneeAngle < 150) {
            formErrors.push('🔴 BACK: Leaning too far forward! Keep chest up!');
            currentIsGoodForm = false;
        }

        // Error 2: Knees going too far over toes
        // Some forward knee travel is OK, but excessive is bad for knees
        const KNEE_OVER_TOES_THRESHOLD = 15; // threshold in normalized units
        if (kneeOverToesAmount > KNEE_OVER_TOES_THRESHOLD && kneeAngle < 140) {
            formErrors.push('🔴 KNEES: Going too far over toes! Sit back more!');
            currentIsGoodForm = false;
        }

        // Error 3: Too low / butt wink territory
        if (kneeAngle < 60) {
            formErrors.push('🔴 TOO LOW! Rise up to protect your lower back!');
            currentIsGoodForm = false;
        }

        // === THRESHOLDS ===
        const SQUAT_THRESHOLD = 130; // Angle to enter "DOWN" phase
        const STAND_THRESHOLD = 160; // Angle to complete rep
        const GOOD_DEPTH = 100;      // Parallel or below

        // === STATE MACHINE ===
        const currentStage = stageRef.current;

        console.log(`Angle: ${kneeAngle}° | Torso: ${torsoAngleFromVertical.toFixed(0)}° | Knee/Toe: ${kneeOverToesAmount.toFixed(1)} | Stage: ${currentStage}`);

        if (currentStage === 'UP') {
            // Reset min angle tracker for new rep
            minAngleInRepRef.current = 180;

            if (kneeAngle < SQUAT_THRESHOLD) {
                stageRef.current = 'DOWN';
                setStage('DOWN');
                setFeedback('⬇️ Going down... Keep your chest up!');
                setIsGoodForm(true);
                console.log("Stage changed to DOWN");
            } else {
                setFeedback('🏋️ Ready - Squat down with control!');
                setIsGoodForm(true);
            }
        } else if (currentStage === 'DOWN') {
            // Track minimum angle reached
            if (kneeAngle < minAngleInRepRef.current) {
                minAngleInRepRef.current = kneeAngle;
            }

            // Priority: Show form errors first
            if (formErrors.length > 0) {
                setFeedback(formErrors[0]); // Show most important error
                setIsGoodForm(false);
            } 
            // Otherwise give depth feedback
            else if (kneeAngle < 70) {
                setFeedback('⚠️ Very deep! Control the movement!');
                setIsGoodForm(true);
            } else if (kneeAngle < GOOD_DEPTH) {
                setFeedback('✅ Perfect depth! Great form! Push up!');
                setIsGoodForm(true);
            } else if (kneeAngle < 120) {
                setFeedback('👇 Go a bit lower for full range!');
                setIsGoodForm(true);
            } else if (kneeAngle < STAND_THRESHOLD) {
                setFeedback('⬆️ Push through your heels!');
                setIsGoodForm(true);
            }

            // Rep completion
            if (kneeAngle > STAND_THRESHOLD) {
                stageRef.current = 'UP';
                setStage('UP');
                setCount(c => c + 1);
                
                // Give feedback on the completed rep
                const depthReached = minAngleInRepRef.current;
                if (depthReached > GOOD_DEPTH) {
                    setFeedback(`🎉 Rep done! But go deeper next time (${depthReached}°)`);
                    setIsGoodForm(false); // Not ideal depth
                } else {
                    setFeedback(`🎉 Excellent rep! Great depth (${depthReached}°)`);
                    setIsGoodForm(true);
                }
                console.log("Rep completed! Min angle was:", depthReached);
            }
        }
    }, []); // Empty deps - callback is stable, uses refs for mutable state

    return {
        count,
        angle,
        stage,
        feedback,
        isGoodForm,
        processLandmarks
    };
};
