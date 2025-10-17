// Directory-specific types for provider and specialty

export interface DirectoryProvider {
    id: string;
    provider_name: string;
    specialty: string;
    phone_number: string;
}

export interface DirectorySpecialty {
    id: string;
    name: string | null;
}
