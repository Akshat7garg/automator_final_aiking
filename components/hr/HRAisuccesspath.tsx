import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Icon Imports from react-icons (Updated for Hiring Theme) ---
import { FaTrophy, FaRobot, FaSyncAlt } from 'react-icons/fa';
import { MdOutlineAnalytics } from "react-icons/md";
import { HiOutlineMail } from 'react-icons/hi';
import { HiMiniArrowDownOnSquareStack } from "react-icons/hi2";
import { FaListCheck } from "react-icons/fa6";

// --- StepBox Component ---
// This component is updated to remove the animation on the 'Hired' state.
interface StepBoxProps {
    id: string;
    icon: React.ReactNode;
    text: React.ReactNode;
    position: { top: string; left: string };
    animationDelay: string;
    isHired: boolean;
    isActive: boolean;
}

const StepBox: React.FC<StepBoxProps> = React.memo(({
    id, icon, text, position, animationDelay, isHired, isActive
}) => {
    const hiredStyles = id === 'hiredBox' && isHired;
    const activeStyles = isActive && !hiredStyles;

    const baseClass = `
        absolute group w-[28%] sm:w-[25%] md:w-[22%] lg:w-[20%] aspect-square bg-[#11011E]
        border rounded-xl flex flex-col justify-center items-center text-center
        font-inter gap-0.5 sm:gap-1 p-1
        transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out z-30
    `;

    // The 'hiredStyles' ternary condition no longer uses an animation.
    // It now applies a static scale and shadow for a non-animated "pop" effect.
    const statefulClass = hiredStyles
        ? '!bg-[#0FAE96] !border-[#0FAE96] !scale-120 !z-40 shadow-[0_0_40px_rgba(15,174,150,0.8)]'
        : activeStyles
        ? 'animate-[activePop_0.3s_ease-out_forwards] border-2 border-[#0FAE96] shadow-[0_0_25px_rgba(15,174,150,0.5)] opacity-100'
        : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/20 hover:scale-105';

    const iconClass = hiredStyles
        ? 'text-white'
        : activeStyles
        ? 'text-[#0FAE96]'
        : 'text-[#ECF1F0]/80 group-hover:text-[#ECF1F0]';

    const textClass = hiredStyles
        ? 'font-semibold text-white'
        : activeStyles
        ? 'text-[#ECF1F0] font-medium'
        : 'text-[#ECF1F0]/80 group-hover:text-[#ECF1F0]';

    return (
        <div
            style={{ ...position, animationDelay }}
            className={`${baseClass} ${statefulClass} animate-[fadeInUp_0.8s_ease-out_forwards]`}
        >
            <div className={`h-[45%] sm:h-1/2 aspect-square transition-colors duration-300 ${iconClass}`}>
                {icon}
            </div>
            <span className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm leading-tight transition-colors duration-300 ${textClass}`}>{text}</span>
        </div>
    );
});

// --- PathLines Component ---
// This component remains unchanged.
interface PathLinesProps {
    steps: { position: { top: string; left: string } }[];
    currentStep: number;
    animationDuration: number;
}

const PathLines: React.FC<PathLinesProps> = React.memo(({ steps, currentStep, animationDuration }) => {
    return (
        <svg className="absolute top-0 left-0 w-full h-full z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {steps.slice(1).map((step, index) => {
                const prevStep = steps[index];
                const x1 = parseFloat(prevStep.position.left);
                const y1 = parseFloat(prevStep.position.top);
                const x2 = parseFloat(step.position.left);
                const y2 = parseFloat(step.position.top);
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                let dashOffset = length;
                let strokeColor = 'rgba(255,255,255,0.1)';

                if (index < currentStep) {
                    dashOffset = 0;
                    strokeColor = '#0FAE96';
                }

                return (
                    <line
                        key={`line-${index}`}
                        x1={x1} y1={y1}
                        x2={x2} y2={y2}
                        stroke={strokeColor}
                        strokeWidth="0.5"
                        strokeDasharray={length}
                        strokeDashoffset={dashOffset}
                        style={{
                            transition: `stroke-dashoffset ${animationDuration}ms ease-in-out, stroke ${animationDuration}ms ease-in-out`,
                        }}
                    />
                );
            })}
        </svg>
    );
});


export default function App() {
    const [animationKey, setAnimationKey] = useState(0);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isHired, setIsHired] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const BALL_TRAVEL_TIME = 1500;
    const STEP_INTERVAL = 1500;

    // MODIFIED: The 'steps' array is now updated for the hiring automation workflow.
    const steps = useMemo(() => [
        { id: "step1", icon: <HiMiniArrowDownOnSquareStack className="h-full w-full" />, text: <>Auto Download</>, position: { top: '15%', left: '50%' } },
        { id: "step2", icon: <FaListCheck className="h-full w-full" />, text: <>AI Shortlisting</>, position: { top: '32%', left: '85%' } },
        { id: "step3", icon: <HiOutlineMail className="h-full w-full" />, text: <>Automated Email</>, position: { top: '68%', left: '85%' } },
        { id: "step4", icon: <FaSyncAlt className="h-full w-full" />, text: <>Auto Follow-ups</>, position: { top: '85%', left: '50%' } },
        { id: "step5", icon: <FaRobot className="h-full w-full" />, text: <>AI Interviews</>, position: { top: '68%', left: '15%' } },
        { id: "hiredBox", icon: <FaTrophy className="h-full w-full" />, text: <>Hire Best</>, position: { top: '32%', left: '15%' } }
    ], []);

    const ballPosition = useMemo(() => {
        if (currentStep >= 0 && currentStep < steps.length) {
            return steps[currentStep].position;
        }
        return steps[0].position;
    }, [currentStep, steps]);

    const restartAnimation = useCallback(() => {
        setIsAnimating(false);
        setAnimationKey(prevKey => prevKey + 1);
        setCurrentStep(-1);
        setIsHired(false);
    }, []);

    useEffect(() => {
        setIsAnimating(true);
        const timeouts: number[] = [];

        steps.forEach((_, index) => {
            const timeout = window.setTimeout(() => {
                setCurrentStep(index);

                if (index === steps.length - 1) {
                    setIsHired(true);
                    const endAnimationTimeout = window.setTimeout(() => {
                        setIsAnimating(false);
                        const restartTimeout = window.setTimeout(restartAnimation, 4000);
                        timeouts.push(restartTimeout);
                    }, BALL_TRAVEL_TIME);
                    timeouts.push(endAnimationTimeout);
                }
            }, index * STEP_INTERVAL + 1000);
            timeouts.push(timeout);
        });

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [animationKey, restartAnimation, steps, BALL_TRAVEL_TIME, STEP_INTERVAL]);

    return (
        <>
            <style>{`
                body { background-color: #11011E; }
                @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
                @keyframes successPulse { 0%, 100% { box-shadow: 0 0 30px rgba(15, 174, 150, 0.6); transform: translate(-50%, -50%) scale(1.15); } 50% { box-shadow: 0 0 60px rgba(15, 174, 150, 1); transform: translate(-50%, -50%) scale(1.2); } }
                @keyframes orbPulse { 0%, 100% { box-shadow: 0 0 20px rgba(15, 174, 150, 0.6); } 50% { box-shadow: 0 0 35px rgba(15, 174, 150, 1); } }
                @keyframes activePop { 0% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.12); } 100% { transform: translate(-50%, -50%) scale(1.1); } }
            `}</style>
            
            <div 
                key={animationKey} 
                className="relative w-full max-w-[600px] mx-auto my-4 sm:my-8 aspect-square flex justify-center items-center font-inter text-[#B6B6B6] bg-transparent overflow-hidden"
            >
                <PathLines steps={steps} currentStep={currentStep} animationDuration={BALL_TRAVEL_TIME} />

                {/* MODIFIED: Central text updated to reflect hiring theme */}
                <div className="w-[30%] sm:w-[28%] aspect-square bg-transparent border border-white/10 rounded-full flex flex-col justify-center items-center text-center font-raleway font-bold text-xs sm:text-sm md:text-base z-30 opacity-0 animate-[fadeInScale_1s_ease-out_0.5s_forwards] shadow-xl shadow-[#7000FF]/20">
                    <div className="leading-tight text-[#ECF1F0]">
                        AI HIRING<br />PLATFORM
                    </div>
                </div>

                {steps.map((step, index) => (
                    <StepBox
                        key={step.id}
                        id={step.id}
                        icon={step.icon}
                        text={step.text}
                        position={step.position}
                        animationDelay={`${0.8 + index * 0.1}s`}
                        isActive={currentStep === index}
                        isHired={isHired && step.id === 'hiredBox'}
                    />
                ))}

                <div
                    className="absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0FAE96] z-20 transform -translate-x-1/2 -translate-y-1/2 animate-[orbPulse_1.5s_infinite]"
                    style={{
                        top: ballPosition.top,
                        left: ballPosition.left,
                        boxShadow: '0 0 25px rgba(15, 174, 150, 0.7)',
                        opacity: isAnimating && currentStep >= 0 ? 1 : 0,
                        transition: `top ${BALL_TRAVEL_TIME}ms ease-in-out, left ${BALL_TRAVEL_TIME}ms ease-in-out, opacity 500ms`,
                    }}
                />
            </div>
        </>
    );
}