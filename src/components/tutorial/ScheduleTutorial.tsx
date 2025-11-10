"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit,
    Heart,
    HelpCircle,
    HelpingHand,
    List,
    LucideIcon,
    Plus,
    RefreshCcw,
    Stethoscope,
    Trash2,
    User
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Helper function to render Lucide icons as HTML strings for driver.js
const renderIcon = (Icon: LucideIcon, className = "w-5 h-5") => {
	return renderToStaticMarkup(<Icon className={className} />);
};

interface ScheduleTutorialProps {
	run: boolean;
	onComplete?: () => void;
}

const ScheduleTutorial: React.FC<ScheduleTutorialProps> = ({
	run,
	onComplete,
}) => {
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
						title: "Welcome to Schedule Management!",
						description: `
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    ${renderIcon(Calendar, "w-8 h-8 text-blue-600 dark:text-blue-400")}
                                    <div>
                                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            This tutorial will show you how to manage on-call schedules for different medical specialties.
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
                                    Choose the medical specialty you want to schedule:
                                </p>
                                <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Stethoscope, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Internal Medicine
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Heart, "w-4 h-4 text-red-600 dark:text-red-400")}
                                        Cardiology
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(HelpingHand, "w-4 h-4 text-red-600 dark:text-red-400")}
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
						title: "Step 2: Choose Healthcare Plan",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    For Internal Medicine, select the healthcare plan:
                                </p>
                                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(User, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">MMM</strong> - Medicare</span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(User, "w-4 h-4 text-purple-600 dark:text-purple-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Vital</strong> - Vital Health Plan</span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(User, "w-4 h-4 text-green-600 dark:text-green-400")}
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
					element: '[data-tour="calendar-overview"]',
					popover: {
						title: "Step 3: Calendar Overview",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    This is your schedule calendar. Here's what you can do:
                                </p>
                                <ul class="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-start gap-2">
                                        ${renderIcon(Plus, "w-4 h-4 mt-0.5 text-green-600 dark:text-green-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Click empty dates</strong> - Add new on-call assignments</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        ${renderIcon(Edit, "w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Click existing entries</strong> - Edit provider assignments</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        ${renderIcon(ChevronLeft, "w-4 h-4")}
                                        ${renderIcon(ChevronRight, "w-4 h-4")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Navigation arrows</strong> - Move between months</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        ${renderIcon(RefreshCcw, "w-4 h-4 mt-0.5")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Refresh button</strong> - Reload schedule data</span>
                                    </li>
                                </ul>
                            </div>
                        `,
						side: "top",
						align: "start",
					},
				},
				{
					element: '[data-tour="calendar-entry"]',
					popover: {
						title: "Step 4: Schedule Entries",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Each colored block represents a provider on call:
                                </p>
                                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(User, "w-4 h-4 text-blue-600 dark:text-blue-400")}
                                        Provider's name
                                    </li>
                                    <li class="flex items-center gap-2">
                                        ${renderIcon(Trash2, "w-4 h-4 text-red-600 dark:text-red-400")}
                                        Red X button to remove the entry
                                    </li>
                                    <li class="flex items-center gap-2">
                                        📞
                                        <span>Phone icon indicates secondary phone number</span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        (Cover)
                                        <span>Indicates covering provider assignment</span>
                                    </li>
                                </ul>
                                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                                    <p class="text-sm text-blue-800 dark:text-blue-200 mb-0">
                                        <strong>Pro Tip:</strong> Each date can only have one provider assigned.
                                    </p>
                                </div>
                            </div>
                        `,
						side: "top",
						align: "start",
					},
				},
				{
					element: '[data-tour="add-entry-modal"]',
					popover: {
						title: "Step 5: Adding Schedule Entries",
						description: `
                            <div class="space-y-4">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    When you click on a date, this modal opens to add a provider:
                                </p>
                                <div class="space-y-2.5">
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(User, "w-4 h-4 text-blue-700 dark:text-blue-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">Select Provider</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                Choose from available providers for this specialty
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(Calendar, "w-4 h-4 text-green-700 dark:text-green-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">Additional Dates</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                Select multiple dates to assign the same provider
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div class="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                            ${renderIcon(Edit, "w-4 h-4 text-purple-700 dark:text-purple-400")}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <strong class="text-gray-900 dark:text-gray-100">Advanced Options</strong>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-0">
                                                Configure phone preferences and covering assignments
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `,
						side: "top",
						align: "start",
					},
				},
				{
					element: '[data-tour="clear-month"]',
					popover: {
						title: "Step 6: Bulk Operations",
						description: `
                            <div class="space-y-3">
                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Use these buttons for bulk schedule management:
                                </p>
                                <ul class="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                                    <li class="flex items-start gap-2">
                                        <span class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">Clear Month</span>
                                        <span class="mt-0.5"><strong class="text-gray-900 dark:text-gray-100">Remove all entries</strong> for the current month</span>
                                    </li>
                                    <li class="flex items-start gap-2">
                                        ${renderIcon(RefreshCcw, "w-4 h-4 mt-0.5")}
                                        <span><strong class="text-gray-900 dark:text-gray-100">Reload calendar</strong> - Refresh schedule data</span>
                                    </li>
                                </ul>
                                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p class="text-sm text-amber-800 dark:text-amber-200 mb-0 flex items-start gap-2">
                                        <span class="text-lg mt-0.5">⚠️</span>
                                        <span><strong>Warning:</strong> Clearing a month cannot be undone!</span>
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
                                                Select specialties and healthcare plans
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Plus, "w-4 h-4")}
                                                Add new schedule entries by clicking empty dates
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Edit, "w-4 h-4")}
                                                Edit existing provider assignments
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(Trash2, "w-4 h-4")}
                                                Remove entries using the delete button
                                            </li>
                                            <li class="flex items-center gap-2">
                                                ${renderIcon(RefreshCcw, "w-4 h-4")}
                                                Reload and manage schedule data
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
				localStorage.setItem("schedule-tutorial-completed", "true");
				localStorage.setItem(
					"schedule-tutorial-completed-date",
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

export default ScheduleTutorial;
