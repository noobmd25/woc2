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

function AuditStub() {
	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
				Track all administrative actions and system changes.
			</p>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Timestamp</TableHead>
							<TableHead>User</TableHead>
							<TableHead>Action</TableHead>
							<TableHead>Resource</TableHead>
							<TableHead>Details</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">2024-01-15 14:30</TableCell>
							<TableCell>admin@example.com</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
									Update
								</span>
							</TableCell>
							<TableCell>Provider: Dr. Smith</TableCell>
							<TableCell className="text-sm text-gray-600 dark:text-gray-400">
								Updated specialty
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">2024-01-15 14:25</TableCell>
							<TableCell>admin@example.com</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
									Create
								</span>
							</TableCell>
							<TableCell>Schedule Entry</TableCell>
							<TableCell className="text-sm text-gray-600 dark:text-gray-400">
								Added on-call schedule
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">2024-01-15 14:20</TableCell>
							<TableCell>admin@example.com</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
									Delete
								</span>
							</TableCell>
							<TableCell>Provider: Dr. Jones</TableCell>
							<TableCell className="text-sm text-gray-600 dark:text-gray-400">
								Removed provider
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
							Provider Updated
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
							Update
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Dr. Smith - Updated specialty
					</p>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">User:</span>
							<span className="font-medium">admin@example.com</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Time:</span>
							<span className="font-medium">2024-01-15 14:30</span>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="font-bold text-gray-900 dark:text-white">
							Schedule Created
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
							Create
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Schedule Entry - Added on-call schedule
					</p>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">User:</span>
							<span className="font-medium">admin@example.com</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Time:</span>
							<span className="font-medium">2024-01-15 14:25</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AuditPage() {
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
							Audit Logs
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							Review administrative actions and system changes
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<AuditStub />
			</div>
		</div>
	);
}
