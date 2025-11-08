"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const UserManagement = dynamic(
	() => import("@/components/admin/UserManagement"),
	{
		ssr: false,
		loading: () => (
			<div className="p-4 text-gray-600">Loading user management...</div>
		),
	}
);

export default function UserManagementPage() {
	return (
		<div className="container mx-auto px-2 py-6 max-w-4xl">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div className="flex items-center gap-4">
					<Link href="/admin">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="w-5 h-5" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
							User Management
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							Manage user accounts, roles, and access permissions
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<UserManagement />
			</div>
		</div>
	);
}
