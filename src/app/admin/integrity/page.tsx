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

function IntegrityStub() {
	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold mb-4">Data Integrity Issues</h2>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
				Monitor and resolve data consistency issues across the system.
			</p>

			{/* Desktop Table */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Issue Type</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Affected Records</TableHead>
							<TableHead>Severity</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">Missing Data</TableCell>
							<TableCell>Providers without specialty assignment</TableCell>
							<TableCell>3</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
									Medium
								</span>
							</TableCell>
							<TableCell>Open</TableCell>
							<TableCell>
								<button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
									Review
								</button>
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">Duplicate Entries</TableCell>
							<TableCell>Duplicate schedule entries for same date</TableCell>
							<TableCell>2</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
									High
								</span>
							</TableCell>
							<TableCell>Open</TableCell>
							<TableCell>
								<button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
									Review
								</button>
							</TableCell>
						</TableRow>
						<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<TableCell className="font-medium">Orphaned Records</TableCell>
							<TableCell>Schedule entries with deleted providers</TableCell>
							<TableCell>1</TableCell>
							<TableCell>
								<span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
									Medium
								</span>
							</TableCell>
							<TableCell>Resolved</TableCell>
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
							Missing Data
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
							Medium
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Providers without specialty assignment
					</p>
					<div className="flex justify-between text-sm mb-3">
						<span className="text-gray-600 dark:text-gray-400">Affected:</span>
						<span className="font-medium">3 records</span>
					</div>
					<button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
						Review
					</button>
				</div>

				<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="font-bold text-gray-900 dark:text-white">
							Duplicate Entries
						</div>
						<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
							High
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Duplicate schedule entries for same date
					</p>
					<div className="flex justify-between text-sm mb-3">
						<span className="text-gray-600 dark:text-gray-400">Affected:</span>
						<span className="font-medium">2 records</span>
					</div>
					<button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
						Review
					</button>
				</div>
			</div>
		</div>
	);
}

export default function IntegrityPage() {
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
							Data Integrity
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							Monitor and resolve data consistency issues across the system
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<IntegrityStub />
			</div>
		</div>
	);
}
