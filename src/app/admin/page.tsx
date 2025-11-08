"use client";

import {
	AlertTriangle,
	BarChart3,
	FileText,
	Megaphone,
	Settings,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useUserCounts } from "@/app/hooks/useUsers";

type TabKey =
	| "user-management"
	| "integrity"
	| "errors"
	| "audit"
	| "announcements"
	| "usage"
	| "specialties";

const tabs = [
	{ key: "user-management" as TabKey, label: "User Management", icon: Users },
	{ key: "specialties" as TabKey, label: "Manage Specialties", icon: Settings },
	{ key: "integrity" as TabKey, label: "Data Integrity", icon: ShieldCheck },
	{ key: "errors" as TabKey, label: "Error Logs", icon: AlertTriangle },
	{ key: "audit" as TabKey, label: "Audit Logs", icon: FileText },
	{ key: "announcements" as TabKey, label: "Announcements", icon: Megaphone },
	{ key: "usage" as TabKey, label: "Usage Stats", icon: BarChart3 },
];

function PageContent() {
	const router = useRouter();
	const { pending } = useUserCounts();

	const handleTabClick = (tabKey: TabKey) => {
		router.push(`/admin/${tabKey}`);
	};

	return (
		<div className="app-container px-4 py-6 max-w-6xl mx-auto dark:bg-black">
			<div className="space-y-6">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
						Admin Dashboard
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Manage users, monitor system health, and view analytics
					</p>
				</div>

				{/* Admin Sections */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="p-6">
						<h2 className="text-xl font-semibold mb-4">Administration</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{tabs.map((tab) => (
								<button
									key={tab.key}
									onClick={() => handleTabClick(tab.key)}
									className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left group"
								>
									<div className="text-2xl mr-3">
										<tab.icon className="h-6 w-6" />
									</div>
									<div>
										<h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
											{tab.label}
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
											{tab.key === "user-management" &&
												`${pending} pending requests`}
											{tab.key === "integrity" && "Monitor data integrity"}
											{tab.key === "errors" && "View system errors"}
											{tab.key === "audit" && "Review admin actions"}
											{tab.key === "announcements" && "Manage announcements"}
											{tab.key === "usage" && "View usage analytics"}
											{tab.key === "specialties" && "Configure specialties"}
										</p>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AdminPage() {
	return <PageContent />;
}
