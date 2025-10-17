"use client";

import { Copy, MessageCircle, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneDisplay, generatePhoneLinks } from "@/lib/directory-utils";

interface PhoneActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerName: string;
    phoneNumber: string;
}

export default function PhoneActionsModal({
    isOpen,
    onClose,
    providerName,
    phoneNumber,
}: PhoneActionsModalProps) {
    const [copied, setCopied] = useState(false);

    const phoneLinks = generatePhoneLinks(phoneNumber);
    const hasValidPhone = phoneNumber && phoneNumber.trim().length > 0;
    const formattedPhone = formatPhoneDisplay(phoneNumber);

    const handleCopyPhone = async () => {
        if (!hasValidPhone) return;

        try {
            await navigator.clipboard.writeText(phoneNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy phone number:", error);
        }
    };

    const handleAction = (action: () => void) => {
        action();
        // Don't auto-close the modal to allow multiple actions
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{providerName}</DialogTitle>
                    <DialogDescription>
                        {hasValidPhone ? formattedPhone : "No phone number on record"}
                    </DialogDescription>
                </DialogHeader>

                {hasValidPhone ? (
                    <div className="grid gap-3 py-4">
                        {/* Call */}
                        <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => handleAction(() => window.open(phoneLinks.tel, "_self"))}
                        >
                            <Phone className="mr-3 h-4 w-4" />
                            <div className="text-left">
                                <div className="font-medium">Call</div>
                                <div className="text-sm text-muted-foreground">
                                    Make a phone call
                                </div>
                            </div>
                        </Button>

                        {/* SMS */}
                        <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => handleAction(() => window.open(phoneLinks.sms, "_self"))}
                        >
                            <MessageSquare className="mr-3 h-4 w-4" />
                            <div className="text-left">
                                <div className="font-medium">Send SMS</div>
                                <div className="text-sm text-muted-foreground">
                                    Send a text message
                                </div>
                            </div>
                        </Button>

                        {/* WhatsApp */}
                        <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => handleAction(() => window.open(phoneLinks.whatsapp, "_blank"))}
                        >
                            <MessageCircle className="mr-3 h-4 w-4" />
                            <div className="text-left">
                                <div className="font-medium">WhatsApp</div>
                                <div className="text-sm text-muted-foreground">
                                    Open in WhatsApp
                                </div>
                            </div>
                        </Button>

                        {/* Copy */}
                        <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={handleCopyPhone}
                        >
                            <Copy className="mr-3 h-4 w-4" />
                            <div className="text-left">
                                <div className="font-medium">
                                    {copied ? "Copied!" : "Copy Number"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Copy to clipboard
                                </div>
                            </div>
                        </Button>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No phone number available for this provider.</p>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}