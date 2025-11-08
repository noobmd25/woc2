import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function ErrorsStub() {
	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold mb-4">Error Reports</h2>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
				Track and monitor system errors and exceptions.
			</p>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Timestamp</TableHead>
							<TableHead>Error Type</TableHead>
							<TableHead>Message</TableHead>
							<TableHead>User</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">2024-01-15 14:32</TableCell>
							<TableCell>API Error</TableCell>
							<TableCell className="max-w-xs truncate">
								Failed to fetch schedule data
							</TableCell>
							<TableCell>user@example.com</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
									Unresolved
								</span>
							</TableCell>
							<TableCell>
								<button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
									Details
								</button>
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">2024-01-15 14:25</TableCell>
							<TableCell>Validation</TableCell>
							<TableCell className="max-w-xs truncate">
								Invalid phone number format
							</TableCell>
							<TableCell>admin@example.com</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
									Resolved
								</span>
							</TableCell>
							<TableCell>
								<button className="text-gray-400 cursor-not-allowed text-sm">
									Resolved
								</button>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>

			{/* Mobile Cards */}
			<div className="block md:hidden space-y-4">
				<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="font-bold text-gray-900 dark:text-white">
							API Error
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
							Unresolved
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Failed to fetch schedule data
					</p>
					<div className="space-y-1 text-sm mb-3">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">User:</span>
							<span className="font-medium">user@example.com</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Time:</span>
							<span className="font-medium">2024-01-15 14:32</span>
						</div>
					</div>
					<button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
						View Details
					</button>
				</div>
			</div>
		</div>
	);
}

export default function ErrorsPage() {
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
							Error Reports
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							Track and monitor system errors and exceptions
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<ErrorsStub />
			</div>
		</div>
	);
}
