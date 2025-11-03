'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import React, { useEffect, useState } from 'react';

interface OnCallTutorialProps {
    run: boolean;
    onComplete?: () => void;
}

const OnCallTutorial: React.FC<OnCallTutorialProps> = ({ run, onComplete }) => {
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
        if (!run) return;

        const driverObj = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps: [
                {
                    element: 'body',
                    popover: {
                        title: 'Welcome to the On-Call Schedule! 🏥',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>This quick tutorial will show you how to find and contact doctors on call.</p>
                                <p style="margin-top: 8px; font-size: 0.875rem; opacity: 0.8;">It only takes a minute. Click "Next" to begin!</p>
                            </div>
                        `,
                        side: 'over',
                        align: 'center',
                    },
                },
                {
                    element: '[data-tour="specialty-selector"]',
                    popover: {
                        title: 'Step 1: Select a Specialty',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>Choose the medical specialty you need:</p>
                                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.875rem;">
                                    <li>Internal Medicine</li>
                                    <li>Cardiology</li>
                                    <li>Emergency Medicine</li>
                                    <li>And many more...</li>
                                </ul>
                                ${isMobile ? '<p style="margin-top: 8px; font-size: 0.75rem; color: #3b82f6;">💡 Tap the dropdown to see all options</p>' : ''}
                            </div>
                        `,
                        side: 'bottom',
                        align: 'start',
                    },
                },
                {
                    element: '[data-tour="plan-selector"]',
                    popover: {
                        title: 'Step 2: Choose Medical Plan',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>Select the patient's medical group:</p>
                                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.875rem;">
                                    <li><strong>MMM</strong> - Medicare & Medicaid</li>
                                    <li><strong>Vital</strong> - Vital Health Plan</li>
                                    <li><strong>Triple-S</strong> - Triple-S Salud</li>
                                </ul>
                                <p style="margin-top: 8px; font-size: 0.75rem; opacity: 0.7;">Note: This only appears for Internal Medicine</p>
                            </div>
                        `,
                        side: 'bottom',
                        align: 'start',
                    },
                },
                {
                    element: '[data-tour="date-navigation"]',
                    popover: {
                        title: 'Step 3: Select the Date',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>Navigate to the date you need:</p>
                                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.875rem;">
                                    <li><strong>◀ ▶ Arrows</strong> - ${isMobile ? 'Tap' : 'Click'} to go to previous/next day</li>
                                    <li><strong>${isMobile ? 'Tap' : 'Click'} Date</strong> - Open calendar picker</li>
                                    <li><strong>Today Button</strong> - Jump to current date</li>
                                </ul>
                            </div>
                        `,
                        side: 'bottom',
                        align: 'start',
                    },
                },
                {
                    element: '[data-tour="provider-card"]',
                    popover: {
                        title: 'Step 4: View Provider Information',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>Here you'll see the on-call provider's details:</p>
                                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.875rem;">
                                    <li>Doctor's full name</li>
                                    <li>Medical group/plan affiliation</li>
                                    <li>Contact phone number</li>
                                </ul>
                            </div>
                        `,
                        side: 'top',
                        align: 'start',
                    },
                },
                {
                    element: '[data-tour="contact-buttons"]',
                    popover: {
                        title: 'Step 5: Contact the Provider 📱',
                        description: `
                            <div style="line-height: 1.6;">
                                <p>Three quick ways to reach the on-call doctor:</p>
                                <div style="margin: 12px 0; font-size: 0.875rem;">
                                    <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
                                        <span>📞</span>
                                        <div>
                                            <strong>Call</strong>
                                            <p style="margin: 0; opacity: 0.8;">${isMobile ? 'Tap to call directly' : 'Click to copy number and call'}</p>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
                                        <span>💬</span>
                                        <div>
                                            <strong>Text/SMS</strong>
                                            <p style="margin: 0; opacity: 0.8;">Opens your messaging app</p>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: start; gap: 8px;">
                                        <span>💚</span>
                                        <div>
                                            <strong>WhatsApp</strong>
                                            <p style="margin: 0; opacity: 0.8;">Message directly via WhatsApp</p>
                                        </div>
                                    </div>
                                </div>
                                <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 12px; margin-top: 12px;">
                                    <p style="margin: 0; font-size: 0.875rem; color: #1e3a8a;">
                                        <strong>💡 Pro Tip:</strong> ${isMobile ? 'Tap' : 'Click'} the phone number to copy it to your clipboard!
                                    </p>
                                </div>
                            </div>
                        `,
                        side: 'top',
                        align: 'start',
                    },
                },
                {
                    element: 'body',
                    popover: {
                        title: "You're All Set! ✅",
                        description: `
                            <div style="line-height: 1.6;">
                                <p>You now know how to:</p>
                                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.875rem;">
                                    <li>Select a medical specialty</li>
                                    <li>Choose a medical plan</li>
                                    <li>Navigate to any date</li>
                                    <li>View provider information</li>
                                    <li>Contact providers via call, text, or WhatsApp</li>
                                </ul>
                                <div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 12px; margin-top: 12px;">
                                    <p style="margin: 0; font-size: 0.875rem; color: #065f46;">
                                        <strong>Need help again?</strong> ${isMobile ? 'Tap' : 'Click'} the <strong>?</strong> icon next to the page title anytime to replay this tutorial!
                                    </p>
                                </div>
                            </div>
                        `,
                        side: 'over',
                        align: 'center',
                    },
                },
            ],
            onDestroyStarted: () => {
                // Save completion to localStorage
                localStorage.setItem('oncall-tutorial-completed', 'true');
                localStorage.setItem('oncall-tutorial-completed-date', new Date().toISOString());

                // Call the onComplete callback
                if (onComplete) {
                    onComplete();
                }

                driverObj.destroy();
            },
        });

        driverObj.drive();

        return () => {
            driverObj.destroy();
        };
    }, [run, isMobile, onComplete]);

    return null;
};

export default OnCallTutorial;
