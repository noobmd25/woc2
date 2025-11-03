'use client';

import React, { useEffect, useState } from 'react';
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step, Styles } from 'react-joyride';

interface OnCallTutorialProps {
    run: boolean;
    onComplete?: () => void;
}

const OnCallTutorial: React.FC<OnCallTutorialProps> = ({ run, onComplete }) => {
    const [runTutorial, setRunTutorial] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect mobile on mount
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        setRunTutorial(run);
        if (run) {
            setStepIndex(0);
        }
    }, [run]);

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Welcome to the On-Call Schedule! 🏥
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        This quick tutorial will show you how to find and contact doctors on call.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        It only takes a minute. Click "Next" to begin!
                    </p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="specialty-selector"]',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Step 1: Select a Specialty
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                        Choose the medical specialty you need:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>Internal Medicine</li>
                        <li>Cardiology</li>
                        <li>Emergency Medicine</li>
                        <li>And many more...</li>
                    </ul>
                    {isMobile && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            💡 Tap the dropdown to see all options
                        </p>
                    )}
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
            spotlightClicks: false,
        },
        {
            target: '[data-tour="plan-selector"]',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Step 2: Choose Medical Plan
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                        Select the patient's medical group:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li><strong>MMM</strong> - Medicare & Medicaid</li>
                        <li><strong>Vital</strong> - Vital Health Plan</li>
                        <li><strong>Triple-S</strong> - Triple-S Salud</li>
                    </ul>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Note: This only appears for Internal Medicine
                    </p>
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
            spotlightClicks: false,
        },
        {
            target: '[data-tour="date-navigation"]',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Step 3: Select the Date
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                        Navigate to the date you need:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li><strong>◀ ▶ Arrows</strong> - {isMobile ? 'Tap' : 'Click'} to go to previous/next day</li>
                        <li><strong>{isMobile ? 'Tap' : 'Click'} Date</strong> - Open calendar picker</li>
                        <li><strong>Today Button</strong> - Jump to current date</li>
                    </ul>
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
            spotlightClicks: false,
        },
        {
            target: '[data-tour="provider-card"]',
            content: (
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Step 4: View Provider Information
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                        Here you'll see the on-call provider's details:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>Doctor's full name</li>
                        <li>Medical group/plan affiliation</li>
                        <li>Contact phone number</li>
                    </ul>
                </div>
            ),
            placement: 'top',
            disableBeacon: true,
        },
        {
            target: '[data-tour="contact-buttons"]',
            content: (
                <div className="space-y-3">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Step 5: Contact the Provider 📱
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                        Three quick ways to reach the on-call doctor:
                    </p>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">📞</span>
                            <div>
                                <strong className="text-gray-900 dark:text-white">Call</strong>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {isMobile ? 'Tap to call directly' : 'Click to copy number and call'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-lg">💬</span>
                            <div>
                                <strong className="text-gray-900 dark:text-white">Text/SMS</strong>
                                <p className="text-gray-600 dark:text-gray-400">Opens your messaging app</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-lg">💚</span>
                            <div>
                                <strong className="text-gray-900 dark:text-white">WhatsApp</strong>
                                <p className="text-gray-600 dark:text-gray-400">Message directly via WhatsApp</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mt-3">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>💡 Pro Tip:</strong> {isMobile ? 'Tap' : 'Click'} the phone number to copy it to your clipboard!
                        </p>
                    </div>
                </div>
            ),
            placement: 'top',
            disableBeacon: true,
            spotlightClicks: false,
        },
        {
            target: 'body',
            content: (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        You're All Set! ✅
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        You now know how to:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>Select a medical specialty</li>
                        <li>Choose a medical plan</li>
                        <li>Navigate to any date</li>
                        <li>View provider information</li>
                        <li>Contact providers via call, text, or WhatsApp</li>
                    </ul>
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mt-3">
                        <p className="text-sm text-green-900 dark:text-green-200">
                            <strong>Need help again?</strong> {isMobile ? 'Tap' : 'Click'} the <strong>?</strong> icon next to the page title anytime to replay this tutorial!
                        </p>
                    </div>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, action, index, type } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRunTutorial(false);
            setStepIndex(0);
            if (onComplete) {
                onComplete();
            }
            // Save to localStorage that user has seen the tutorial
            localStorage.setItem('oncall-tutorial-completed', 'true');
            localStorage.setItem('oncall-tutorial-completed-date', new Date().toISOString());
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            // Update step index
            setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
        }
    };

    const customStyles: Partial<Styles> = {
        options: {
            primaryColor: '#3b82f6',
            textColor: 'var(--joyride-tooltip-color)',
            backgroundColor: 'var(--joyride-tooltip-bg)',
            arrowColor: 'var(--joyride-tooltip-bg)',
            overlayColor: 'var(--joyride-overlay)',
            zIndex: 10000,
        },
        tooltip: {
            borderRadius: 12,
            fontSize: isMobile ? 14 : 15,
            padding: isMobile ? 16 : 24,
            maxWidth: isMobile ? '90vw' : 420,
        },
        tooltipContainer: {
            textAlign: 'left',
        },
        tooltipContent: {
            padding: isMobile ? '8px 0' : '12px 0',
        },
        buttonNext: {
            backgroundColor: '#3b82f6',
            fontSize: isMobile ? 13 : 14,
            borderRadius: 8,
            padding: isMobile ? '8px 16px' : '10px 20px',
            fontWeight: 600,
        },
        buttonBack: {
            color: '#6b7280',
            fontSize: isMobile ? 13 : 14,
            marginRight: 10,
        },
        buttonSkip: {
            color: '#6b7280',
            fontSize: isMobile ? 13 : 14,
        },
        buttonClose: {
            display: 'none',
        },
        spotlight: {
            borderRadius: 8,
        },
        beacon: {
            width: isMobile ? 48 : 36,
            height: isMobile ? 48 : 36,
        },
    };

    return (
        <Joyride
            steps={steps}
            run={runTutorial}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            disableScrolling={isMobile}
            disableOverlayClose={false}
            callback={handleJoyrideCallback}
            styles={customStyles}
            locale={{
                back: isMobile ? 'Back' : '← Back',
                close: 'Close',
                last: 'Finish',
                next: isMobile ? 'Next' : 'Next →',
                skip: 'Skip',
            }}
            floaterProps={{
                disableAnimation: isMobile,
                styles: {
                    arrow: {
                        length: 8,
                        spread: 12,
                    },
                },
            }}
        />
    );
};

export default OnCallTutorial;
