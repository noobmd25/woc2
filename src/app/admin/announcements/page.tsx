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

function AnnouncementsStub() {
	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold mb-4">Announcements</h2>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
				Manage system-wide announcements and notifications.
			</p>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Expires</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">System Maintenance</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
									Info
								</span>
							</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
									Active
								</span>
							</TableCell>
							<TableCell>2024-01-15</TableCell>
							<TableCell>2024-01-20</TableCell>
							<TableCell>
								<button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-2">
									Edit
								</button>
								<button className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm">
									Delete
								</button>
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">New Feature Release</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
									Update
								</span>
							</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
									Scheduled
								</span>
							</TableCell>
							<TableCell>2024-01-14</TableCell>
							<TableCell>2024-01-21</TableCell>
							<TableCell>
								<button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-2">
									Edit
								</button>
								<button className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm">
									Delete
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
							System Maintenance
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
							Active
						</span>
					</div>
					<div className="mb-3">
						<span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
							Info
						</span>
					</div>
					<div className="space-y-1 text-sm mb-3">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Created:</span>
							<span className="font-medium">2024-01-15</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Expires:</span>
							<span className="font-medium">2024-01-20</span>
						</div>
					</div>
					<div className="flex gap-2">
						<button className="flex-1 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
							Edit
						</button>
						<button className="flex-1 px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-sm">
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AnnouncementsPage() {
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
							Announcements
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							Manage system announcements and notifications
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<AnnouncementsStub />
			</div>
		</div>
	);
}
