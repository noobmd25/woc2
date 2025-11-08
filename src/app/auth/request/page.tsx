"use client";

import { useAuthActions } from "@/app/hooks/useAuthActions";
import { useSpecialties } from "@/app/hooks/useSpecialties";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { type SignupFormData, signupFormSchema } from "@/lib/validations/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export default function RequestPage() {
	// You can extract the signup form logic from HomeClient into a separate component
	// and use it here directly, or copy the relevant JSX and handlers.
	const router = useRouter();

	const [phoneInput, setPhoneInput] = useState("");
	const [showPasswordFields, setShowPasswordFields] = useState(false);
	const { specialties, loading: loadingSpecialties } = useSpecialties(1, 1000);
	const { signup, isLoading: isSigningUp } = useAuthActions();

	const {
		register,
		handleSubmit,
		setValue,
		control,
		formState: { errors, isSubmitting },
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupFormSchema),
		defaultValues: {
			full_name: "",
			email: "",
			phone: "",
			position: undefined,
			specialty_attending: "",
			specialty_resident: "",
			specialty_non_clinical: "",
			pgy_year: "1",
			password: "",
			confirm_password: "",
		},
	});

	const watchedPosition = useWatch({ control, name: "position" });
	const watchedSpecialtyAttending = useWatch({
		control,
		name: "specialty_attending",
	});
	const watchedSpecialtyResident = useWatch({
		control,
		name: "specialty_resident",
	});

	// Specialties are loaded automatically by the hook

	const formatPhone = (value: string) => {
		const digits = value.replace(/\D/g, "").slice(0, 10);
		const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
		if (!match) return digits;
		const [, area, prefix, line] = match;
		return [
			area ? `(${area}` : "",
			area && prefix ? `) ${prefix}` : "",
			prefix && line ? `-${line}` : "",
		].join("");
	};

	const handleSignupSubmit = async (data: SignupFormData) => {
		const result = await signup(data);

		if (result.success) {
			router.push("/auth/pending");
		}
		// Error handling is done in the hook
	};
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
						Create Account
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Join our medical team by filling out your information below
					</p>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
					<form
						className="space-y-6"
						onSubmit={handleSubmit(handleSignupSubmit)}
					>
						{/* Personal Information Section */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
								Personal Information
							</h2>

							<div className="grid grid-cols-1 gap-4">
								<div>
									<label
										htmlFor="full_name"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
									>
										Full Name
									</label>
									<input
										{...register("full_name")}
										id="full_name"
										placeholder="e.g., John Doe"
										autoComplete="name"
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
										onBlur={() => setShowPasswordFields(true)}
									/>
									{errors.full_name && (
										<p className="mt-1 text-sm text-red-600 dark:text-red-400">
											{errors.full_name.message}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
									>
										Email Address
									</label>
									<input
										{...register("email")}
										id="email"
										type="email"
										placeholder="e.g., john.doe@example.com"
										autoComplete="email"
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
										onBlur={() => setShowPasswordFields(true)}
									/>
									{errors.email && (
										<p className="mt-1 text-sm text-red-600 dark:text-red-400">
											{errors.email.message}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="phone"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
									>
										Phone Number
									</label>
									<input
										{...register("phone")}
										id="phone"
										placeholder="e.g., (787) 123-4567"
										autoComplete="tel"
										value={phoneInput}
										onChange={(e) => {
											const formatted = formatPhone(e.target.value);
											setPhoneInput(formatted);
											setValue("phone", formatted);
										}}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
									/>
									{errors.phone && (
										<p className="mt-1 text-sm text-red-600 dark:text-red-400">
											{errors.phone.message}
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Position Section */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
								Position
							</h2>

							<div>
								<fieldset className="space-y-3">
									<legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Select your position
									</legend>
									<RadioGroup
										value={watchedPosition || ""}
										onValueChange={(value) => {
											setValue(
												"position",
												value as "Resident" | "Attending" | "Non-Clinical"
											);
											setShowPasswordFields(true);
										}}
										className="grid grid-cols-1 sm:grid-cols-2 gap-3"
									>
										<label className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none hover:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-400">
											<RadioGroupItem value="Resident" className="mt-0.5" />
											<span className="ml-3 flex flex-1">
												<span className="flex flex-col">
													<span className="block text-sm font-medium text-gray-900 dark:text-white">
														Resident
													</span>
													<span className="block text-sm text-gray-500 dark:text-gray-400">
														Medical resident in training
													</span>
												</span>
											</span>
										</label>

										<label className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none hover:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-400">
											<RadioGroupItem value="Attending" className="mt-0.5" />
											<span className="ml-3 flex flex-1">
												<span className="flex flex-col">
													<span className="block text-sm font-medium text-gray-900 dark:text-white">
														Attending
													</span>
													<span className="block text-sm text-gray-500 dark:text-gray-400">
														Attending physician
													</span>
												</span>
											</span>
										</label>

										<label className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none hover:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-400">
											<RadioGroupItem value="Non-Clinical" className="mt-0.5" />
											<span className="ml-3 flex flex-1">
												<span className="flex flex-col">
													<span className="block text-sm font-medium text-gray-900 dark:text-white">
														Non-Clinical
													</span>
													<span className="block text-sm text-gray-500 dark:text-gray-400">
														Administrative, research, or other non-clinical
														roles
													</span>
												</span>
											</span>
										</label>
									</RadioGroup>
									{errors.position && (
										<p className="mt-2 text-sm text-red-600 dark:text-red-400">
											{errors.position.message}
										</p>
									)}
								</fieldset>
							</div>
						</div>

						{/* Custom Position Section */}
						{watchedPosition === "Non-Clinical" && (
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
									Non-Clinical Information
								</h2>

								<div>
									<label
										htmlFor="specialty_non_clinical"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
									>
										Non-Clinical Specialty / Role
									</label>
									<input
										{...register("specialty_non_clinical")}
										id="specialty_non_clinical"
										placeholder="e.g., Research Coordinator, Medical Librarian, etc."
										autoComplete="organization-title"
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
									/>
									{errors.specialty_non_clinical && (
										<p className="mt-1 text-sm text-red-600 dark:text-red-400">
											{errors.specialty_non_clinical.message}
										</p>
									)}
								</div>
							</div>
						)}

						{/* Specialty Section */}
						{watchedPosition === "Attending" && (
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
									Department Information
								</h2>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
										Service / Department
									</label>
									<SearchableSelect
										options={specialties}
										value={watchedSpecialtyAttending || ""}
										onChange={(value) => setValue("specialty_attending", value)}
										placeholder="Type to search departments..."
										loading={loadingSpecialties}
										name="specialty_attending"
									/>
									{errors.specialty_attending && (
										<p className="mt-1 text-sm text-red-600 dark:text-red-400">
											{errors.specialty_attending.message}
										</p>
									)}
								</div>
							</div>
						)}

						{watchedPosition === "Resident" && (
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
									Residency Information
								</h2>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Residency Specialty
										</label>
										<SearchableSelect
											options={specialties.filter((s) => s.hasResidency)}
											value={watchedSpecialtyResident || ""}
											onChange={(value) =>
												setValue("specialty_resident", value)
											}
											placeholder="Type to search specialties..."
											loading={loadingSpecialties}
											name="specialty_resident"
										/>
										{errors.specialty_resident && (
											<p className="mt-1 text-sm text-red-600 dark:text-red-400">
												{errors.specialty_resident.message}
											</p>
										)}
									</div>

									<div>
										<label
											htmlFor="pgy_year"
											className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
										>
											Year of Training
										</label>
										<div className="flex items-center">
											<span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md dark:bg-gray-600 dark:border-gray-600 dark:text-gray-300">
												PGY-
											</span>
											<select
												{...register("pgy_year")}
												id="pgy_year"
												className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
											>
												{Array.from({ length: 7 }, (_, i) => String(i + 1)).map(
													(yr) => (
														<option key={yr} value={yr}>
															{yr}
														</option>
													)
												)}
											</select>
										</div>
										{errors.pgy_year && (
											<p className="mt-1 text-sm text-red-600 dark:text-red-400">
												{errors.pgy_year.message}
											</p>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Password Section */}
						{showPasswordFields && (
							<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
									Account Security
								</h2>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="password"
											className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
										>
											Password
										</label>
										<input
											{...register("password")}
											id="password"
											type="password"
											placeholder="Create password"
											autoComplete="new-password"
											className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
										/>
										{errors.password && (
											<p className="mt-1 text-sm text-red-600 dark:text-red-400">
												{errors.password.message}
											</p>
										)}
									</div>

									<div>
										<label
											htmlFor="confirm_password"
											className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
										>
											Confirm Password
										</label>
										<input
											{...register("confirm_password")}
											id="confirm_password"
											type="password"
											placeholder="Confirm password"
											autoComplete="new-password"
											className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400"
										/>
										{errors.confirm_password && (
											<p className="mt-1 text-sm text-red-600 dark:text-red-400">
												{errors.confirm_password.message}
											</p>
										)}
									</div>
								</div>

								<div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
									<div className="flex">
										<div className="ml-3">
											<p className="text-sm text-blue-700 dark:text-blue-300">
												<strong>Password Requirements:</strong> Must include
												upper & lower case letters and a number. You cannot log
												in until an admin approves your account.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Form Actions */}
						<div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
							<button
								type="button"
								onClick={() => router.push("/auth/login")}
								className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || isSigningUp}
								className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSigningUp ? "Creating Account..." : "Create Account"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
