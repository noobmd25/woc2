"use client";

import { useOnCall } from "@/app/hooks/useOnCall";
import { useOnCallSpecialties } from "@/app/hooks/useSpecialties";
import { useAuth } from "@/components/AuthProvider";
import MGLookupModal from "@/components/lookup/MGLookupModal";
import DateNavigation from "@/components/oncall/DateNavigation";
import DebugInfo from "@/components/oncall/DebugInfo";
import ProviderCard from "@/components/oncall/ProviderCard";
import SpecialtyPlanSelector from "@/components/oncall/SpecialtyPlanSelector";
import OnCallTutorial from "@/components/tutorial/OnCallTutorial";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import {
	MEDICAL_GROUP,
	MedicalGroup,
	PLANS,
	SPECIALTIES,
} from "@/lib/constants";
import { getNextDay, getPreviousDay, getToday } from "@/lib/oncall-utils";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function OnCallPage() {
	const { user, isLoading } = useAuth();
	const [specialty, setSpecialty] = useState(SPECIALTIES.INTERNAL_MEDICINE);
	const [plan, setPlan] = useState(PLANS[0].name);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [medicalGroup, setMedicalGroup] = useState<MedicalGroup>(
		MEDICAL_GROUP.MMM
	);
	const [runTutorial, setRunTutorial] = useState(false);
	const role = useMemo(() => user?.profile?.role || "viewer", [user]);

	// Track page analytics
	usePageAnalytics("oncall", {
		specialty,
		plan,
		user_role: role,
	});

	// Fetch specialties
	const { specialties, loading: specialtyLoading } = useOnCallSpecialties(
		1,
		100,
		""
	);

	// Fetch on-call data
	const {
		providerData,
		debugInfo,
		loading: onCallLoading,
	} = useOnCall(specialty, plan, currentDate);

	// Date navigation handlers
	const handlePrevDay = useCallback(() => {
		setCurrentDate(getPreviousDay);
	}, []);

	const handleNextDay = useCallback(() => {
		setCurrentDate(getNextDay);
	}, []);

	const handleToday = useCallback(() => {
		setCurrentDate(getToday());
	}, []);

	// Form handlers
	const handleSpecialtyChange = useCallback((value: string) => {
		setSpecialty(value);
		// Reset plan when specialty changes
		if (value !== SPECIALTIES.INTERNAL_MEDICINE) {
			setPlan("");
		}
	}, []);

	const handlePlanChange = useCallback((value: string) => {
		setPlan(value);
	}, []);

	const showNoProviderMessage = useMemo(
		() => !onCallLoading && !providerData && debugInfo?.rows === 0,
		[onCallLoading, providerData, debugInfo]
	);
	const showPlanGuidance = useMemo(
		() => specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan,
		[specialty, plan]
	);

	useEffect(() => {
		// Check if tutorial should run (for first-time users)
		if (typeof window !== "undefined") {
			const hasSeenTutorial = localStorage.getItem("oncall-tutorial-completed");
			if (!hasSeenTutorial) {
				// Delay to ensure page is fully rendered
				setTimeout(() => {
					setRunTutorial(true);
				}, 1500);
			}
		}
	}, []);

	if (specialtyLoading || isLoading) {
		return (
			<div className="app-container px-4 py-6 max-w-lg mx-auto dark:bg-black">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						On-Call Viewer
					</h1>
				</div>
				<div className="flex justify-center py-8">
					<LoadingSpinner />
				</div>
			</div>
		);
	}

	return (
		<div className="app-container px-4 py-6 max-w-lg mx-auto dark:bg-black">
			{/* Tutorial Component */}
			<OnCallTutorial
				run={runTutorial}
				onComplete={() => setRunTutorial(false)}
			/>

			<div className="space-y-6">
				{/* Title with Help Button */}
				<div className="text-center relative">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						On-Call Viewer
					</h1>
					<button
						type="button"
						onClick={() => setRunTutorial(true)}
						className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md transition-colors"
						title="Show tutorial"
						aria-label="Show tutorial"
					>
						<HelpCircle />
					</button>
				</div>

				{/* Specialty and Plan Selector */}
				<SpecialtyPlanSelector
					specialty={specialty}
					plan={plan}
					specialties={specialties}
					specialtyLoading={specialtyLoading}
					onSpecialtyChange={handleSpecialtyChange}
					onPlanChange={handlePlanChange}
				/>
				{specialty === SPECIALTIES.INTERNAL_MEDICINE && (
					<>
						<div className="flex justify-center gap-4">
							<button
								type="button"
								onClick={() => {
									setIsModalOpen(true);
									setMedicalGroup(MEDICAL_GROUP.MMM);
								}}
								className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#009c94] hover:bg-[#007F77] rounded shadow-sm"
							>
								MMM Group Lookup
							</button>
							<button
								type="button"
								onClick={() => {
									setIsModalOpen(true);
									setMedicalGroup(MEDICAL_GROUP.VITAL);
								}}
								className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#5c5ca2] hover:bg-[#4a4a88] rounded shadow-sm"
							>
								Vital Group Lookup
							</button>
						</div>
						<MGLookupModal
							isOpen={isModalOpen}
							onClose={() => setIsModalOpen(false)}
							medicalGroup={medicalGroup}
							setPlan={setPlan}
						/>
					</>
				)}
				{onCallLoading ? (
					<div className="flex justify-center py-8">
						<LoadingSpinner />
					</div>
				) : (
					<>
						<DateNavigation
							currentDate={currentDate}
							onPreviousDay={handlePrevDay}
							onNextDay={handleNextDay}
							onToday={handleToday}
						/>

						{/* Provider Card */}
						{providerData && <ProviderCard provider={providerData} />}

						{/* No Provider Message */}
						{showNoProviderMessage && !showPlanGuidance && (
							<div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
								<p className="text-gray-600 dark:text-gray-400">
									No provider found for this selection.
								</p>
							</div>
						)}
						{providerData && (
							<>
								{/* Debug Info */}
								<DebugInfo debugInfo={debugInfo} role={role} />
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
