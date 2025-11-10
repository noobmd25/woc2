"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    List,
    LucideIcon,
    MessageCircle,
    Phone,
    Shield,
    Stethoscope,
    User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Helper function to render Lucide icons as HTML strings for driver.js
const renderIcon = (Icon: LucideIcon, className = "w-5 h-5") => {
	return renderToStaticMarkup(<Icon className={className} />);
};

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
		window.addEventListener("resize", checkMobile);

		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (!run) return;

		const driverObj = driver({
			showProgress: true,
			showButtons: ["next", "previous", "close"],
			steps: [
				{
					element: "body",
					popover: {
						title: "Welcome to the On-Call Schedule!",
						description: `
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    ${renderIcon(Stethoscope, "w-8 h-8 text-blue-600 dark:text-blue-400")}
                                    <div>
                                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            This quick tutorial will show you how to find and contact doctors on call.
                                        </p>
                                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            It only takes a minute. Click "Next" to begin!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `,
						side: "over",
						align: "center",
					},
				},
				{
					element: '[data-tour="specialty-selector"]',
					popover: {
						title: "Step 1: Select a Specialty",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Choose the medical specialty you need:
                                </p>
                                <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Stethoscope, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Internal Medicine
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Stethoscope, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Cardiology
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Stethoscope, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Vascular Surgery
                                    </li>
                                    <li class="text-gray-500 dark:text-gray-500 ml-6">And many more...</li>
                                </ul>
                                ${isMobile ? '<div class="flex items-center gap-2 mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><span class="text-xl">💡</span><p class="text-sm text-blue-700 dark:text-blue-300 mb-0">Tap the dropdown to see all options</p></div>' : ""}
                            </div>
                        `,
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="plan-selector"]',
					popover: {
						title: "Step 2: Choose Medical Plan",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Select the patient's medical group:
                                </p>
                                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Shield, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">MMM</strong> - Medicare</span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Shield, "w-4 h-4 text-green-600 dark:text-green-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Vital</strong> - Vital Health Plan</span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Shield, "w-4 h-4 text-purple-600 dark:text-purple-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">MCS</strong> - MCS Classicare</span>
                                    </li>
                                </ul>
                                <p class="text-xs text-gray-500 dark:text-gray-400 italic border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                                    Note: This only appears for Internal Medicine
                                </p>
                            </div>
                        `,
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="date-navigation"]',
					popover: {
						title: "Step 3: Select the Date",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Navigate to the date you need:
                                </p>
                                <ul class="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-start gap-2">
                                        <div class="flex items-center gap-1 mt-0.5">
                                            ${renderIcon(ChevronLeft, "w-4 h-4")}
                                            ${renderIcon(ChevronRight, "w-4 h-4")}
                                        </div>
                                        <span><strong class="text-gray-900 dark:text-gray-100">Arrows</strong> - ${isMobile ? "Tap" : "Click"} to go to previous/next day</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">Today</span>
                                        <span class="mt-0.5"><strong class="text-gray-900 dark:text-gray-100">Button</strong> - Jump to current date</span>
                                    </li>
                                </ul>
                            </div>
                        `,
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="provider-card"]',
					popover: {
						title: "Step 4: View Provider Information",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Here you'll see the on-call provider's details:
                                </p>
                                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(User, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Doctor's full name
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Shield, "w-4 h-4 text-green-600 dark:text-green-400")}
                                        Medical group/plan affiliation
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Phone, "w-4 h-4 text-gray-600 dark:text-gray-400")}
                                        Contact phone number
                                    </li>
                                </ul>
                            </div>
                        `,
						side: "top",
						align: "start",
					},
				},
				{
					element: '[data-tour="contact-buttons"]',
					popover: {
						title: "Step 5: Contact the Provider",
						description: `
                            <div class="space-y-4">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Three quick ways to reach the on-call physician:
                                </p>
                                <div class="space-y-2.5">
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(Phone, "w-4 h-4 text-green-700 dark:text-green-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">Call</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                ${isMobile ? "Tap to call directly" : "Click to copy number and call"}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(MessageCircle, "w-4 h-4 text-blue-700 dark:text-blue-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">Text/SMS</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                Opens your messaging app
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(MessageCircle, "w-4 h-4 text-green-700 dark:text-green-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">WhatsApp</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                Message directly via WhatsApp
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                    <p class="text-sm text-blue-800 dark:text-blue-200 mb-0 flex items-start gap-2">
                                        <span class="text-lg mt-0.5">💡</span>
                                        <span><strong>Pro Tip:</strong> ${isMobile ? "Tap" : "Click"} the phone number to copy it to your clipboard!</span>
                                    </p>
                                </div>
                            </div>
                        `,
						side: "top",
						align: "start",
					},
				},
				{
					element: "body",
					popover: {
						title: "You're All Set!",
						description: `
                            <div class="space-y-4">
                                <div class="flex items-start gap-3">
                                    ${renderIcon(CheckCircle2, "w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1")}
                                    <div>
                                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                                            You now know how to:
                                        </p>
                                        <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(List, "w-4 h-4")}
                                                Select a medical specialty
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Shield, "w-4 h-4")}
                                                Choose a medical plan
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Calendar, "w-4 h-4")}
                                                Navigate to any date
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(User, "w-4 h-4")}
                                                View provider information
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Phone, "w-4 h-4")}
                                                ${renderIcon(MessageCircle, "w-4 h-4")}
                                                Contact providers via call, text, or WhatsApp
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                    <p class="text-sm text-green-800 dark:text-green-200 mb-0 flex items-start gap-2">
                                        ${renderIcon(HelpCircle, "w-5 h-5 flex-shrink-0 mt-0.5")}
                                        <span><strong>Need help again?</strong> ${isMobile ? "Tap" : "Click"} the help icon next to the page title anytime to replay this tutorial!</span>
                                    </p>
                                </div>
                            </div>
                        `,
						side: "over",
						align: "center",
					},
				},
			],
			onDestroyStarted: () => {
				// Save completion to localStorage
				localStorage.setItem("oncall-tutorial-completed", "true");
				localStorage.setItem(
					"oncall-tutorial-completed-date",
					new Date().toISOString()
				);

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
