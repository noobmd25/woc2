"use client";

import { MessageCircle, Phone, User } from "lucide-react";
import { toast } from "sonner";

import type { OnCallProvider } from "@/app/hooks/useOnCall";
import { Button } from "@/components/ui/button";
import { SUCCESS_MESSAGES } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/directory-utils";
import { copyToClipboard, toWhatsAppNumber } from "@/lib/oncall-utils";
interface ProviderCardProps {
    provider: OnCallProvider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
    const handleCopyPrimary = async () => {
        if (provider.phoneNumber) {
            await copyToClipboard(provider.phoneNumber);
            toast.success(SUCCESS_MESSAGES.PRIMARY_PHONE_COPIED);
        }
    };

    const handleCopySecondary = async () => {
        if (provider.secondPhone) {
            await copyToClipboard(provider.secondPhone);
            toast.success(SUCCESS_MESSAGES.SECONDARY_PHONE_COPIED);
        }
    };

    // const secondPhoneLabel = getSecondPhoneLabel(provider.secondPhoneSource);
    // const directoryLink = getProviderDirectoryLink(provider.providerName);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200" data-tour="provider-card">
            {/* Provider Info */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {provider.providerName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {provider.specialty}
                    {provider.healthcarePlan && (
                        <>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="font-medium">{provider.healthcarePlan}</span>
                        </>
                    )}
                </p>
            </div>

            {/* Phone Actions */}
            {provider.phoneNumber && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Primary Phone
                        </h4>

                    </div>
                    <div
                        className="flex justify-center"
                    >
                        <a
                            className="text-black text-lg font-mono dark:text-white px-2 py-1 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors select-all"
                            onClick={handleCopyPrimary}
                            title="Click to copy"
                            tabIndex={0}
                            role="button"
                            aria-label="Copy primary phone number"
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleCopyPrimary();
                                }
                            }}
                        >{formatPhoneDisplay(provider.phoneNumber)}</a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-tour="contact-buttons">
                        <a
                            href={`tel:${provider.phoneNumber}`}
                            className="block"
                        >
                            <Button
                                variant="default"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="Call Primary Phone"
                            >
                                <Phone className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">Call</span>
                                <span className="hidden sm:inline">Call</span>
                            </Button>
                        </a>
                        <a
                            href={`sms:${provider.phoneNumber}`}
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="Send SMS to Primary Phone"
                            >
                                <MessageCircle className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">Text</span>
                                <span className="hidden sm:inline">Text</span>
                            </Button>
                        </a>
                        <a
                            href={`https://wa.me/${toWhatsAppNumber(provider.phoneNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="WhatsApp Primary Phone"
                            >
                                <MessageCircle className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">WhatsApp</span>
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        </a>
                    </div>
                </div>
            )}

            {/* Second Phone */}
            {provider.showSecondPhone && provider.secondPhone && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {provider.secondPhoneSource}
                        </h4>

                    </div>
                    <div
                        className="flex justify-center"

                    >
                        <a className="text-lg font-mono text-black dark:text-white px-2 py-1 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors select-all"
                            onClick={handleCopySecondary}
                            title="Click to copy"
                            tabIndex={0}
                            role="button"
                            aria-label="Copy secondary phone number"
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleCopySecondary();
                                }
                            }}
                        >{formatPhoneDisplay(provider.secondPhone)}</a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                        <a
                            href={`tel:${provider.secondPhone}`}
                            className="block"
                        >
                            <Button
                                variant="default"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="Call Secondary Phone"
                            >
                                <Phone className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">Call</span>
                                <span className="hidden sm:inline">Call</span>
                            </Button>
                        </a>
                        <a
                            href={`sms:${provider.secondPhone}`}
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="Send SMS to Secondary Phone"
                            >
                                <MessageCircle className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">Text</span>
                                <span className="hidden sm:inline">Text</span>
                            </Button>
                        </a>
                        <a
                            href={`https://wa.me/${toWhatsAppNumber(provider.secondPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full flex items-center justify-center gap-2 py-4 text-base sm:text-sm sm:py-2 rounded-xl sm:rounded-md"
                                aria-label="WhatsApp Secondary Phone"
                            >
                                <MessageCircle className="w-7 h-7 sm:w-4 sm:h-4" />
                                <span className="sm:hidden">WhatsApp</span>
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        </a>
                    </div>
                </div>
            )}

            {/* Cover Provider */}
            {provider.cover && provider.coverProviderName && (
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Cover Provider: {provider.coverProviderName}
                        </h4>
                        {provider.coverPhone && (
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                                {formatPhoneDisplay(provider.coverPhone)}
                            </span>
                        )}
                    </div>
                    {provider.coverPhone && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <a href={`tel:${provider.coverPhone}`} className="block">
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
                                href={`https://wa.me/${toWhatsAppNumber(provider.coverPhone)}`}
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