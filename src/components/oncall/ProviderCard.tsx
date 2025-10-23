"use client";

import { Copy, MessageCircle, Phone, User } from "lucide-react";
import { toast } from "sonner";

import type { OnCallProvider } from "@/app/hooks/useOnCall";
import { Button } from "@/components/ui/button";
import { SUCCESS_MESSAGES } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/directory-utils";
import { copyToClipboard, getSecondPhoneLabel, toWhatsAppNumber } from "@/lib/oncall-utils";
interface ProviderCardProps {
    provider: OnCallProvider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
    const handleCopyPrimary = async () => {
        if (provider.phone_number) {
            await copyToClipboard(provider.phone_number);
            toast.success(SUCCESS_MESSAGES.PRIMARY_PHONE_COPIED);
        }
    };

    const handleCopySecondary = async () => {
        if (provider.second_phone) {
            await copyToClipboard(provider.second_phone);
            toast.success(SUCCESS_MESSAGES.SECONDARY_PHONE_COPIED);
        }
    };

    const secondPhoneLabel = getSecondPhoneLabel(provider._second_phone_source);
    // const directoryLink = getProviderDirectoryLink(provider.provider_name);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Provider Info */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {provider.provider_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {provider.specialty}
                    {provider.healthcare_plan && (
                        <>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="font-medium">{provider.healthcare_plan}</span>
                        </>
                    )}
                </p>
            </div>

            {/* Phone Actions */}
            {provider.phone_number && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Primary Phone
                        </h4>

                    </div>
                    <div className="flex justify-center text-lg font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                        {formatPhoneDisplay(provider.phone_number)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyPrimary}
                            className="flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copy</span>
                        </Button>
                        <a
                            href={`tel:${provider.phone_number}`}
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full flex items-center gap-2"
                            >
                                <Phone className="w-4 h-4" />
                                <span className="hidden sm:inline">Call</span>
                            </Button>
                        </a>
                        <a
                            href={`https://wa.me/${toWhatsAppNumber(provider.phone_number)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        </a>
                    </div>
                </div>
            )}

            {/* Second Phone */}
            {provider.second_phone && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {secondPhoneLabel} Phone
                        </h4>

                    </div>
                    <div className="flex justify-center text-lg font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                        {formatPhoneDisplay(provider.second_phone)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopySecondary}
                            className="flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copy</span>
                        </Button>
                        <a
                            href={`tel:${provider.second_phone}`}
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full flex items-center gap-2"
                            >
                                <Phone className="w-4 h-4" />
                                <span className="hidden sm:inline">Call</span>
                            </Button>
                        </a>
                        <a
                            href={`https://wa.me/${toWhatsAppNumber(provider.second_phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        </a>
                    </div>
                </div>
            )}

            {/* Cover Provider */}
            {provider.cover && provider.cover_provider_name && (
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Cover Provider: {provider.cover_provider_name}
                        </h4>
                        {provider.cover_phone && (
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                                {formatPhoneDisplay(provider.cover_phone)}
                            </span>
                        )}
                    </div>
                    {provider.cover_phone && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <a href={`tel:${provider.cover_phone}`} className="block">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full flex items-center gap-2"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="hidden sm:inline">Call Cover</span>
                                    <span className="sm:hidden">Call</span>
                                </Button>
                            </a>
                            <a
                                href={`https://wa.me/${toWhatsAppNumber(provider.cover_phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full flex items-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">WhatsApp Cover</span>
                                    <span className="sm:hidden">WhatsApp</span>
                                </Button>
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Directory Link
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <Link
                    href={directoryLink}
                    className="flex items-center justify-center gap-2 w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                >
                    <ExternalLink className="w-4 h-4" />
                    View in Directory
                </Link>
            </div> */}
        </div>
    );
}