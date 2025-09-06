export const DIRECTORY_SPECIALTY_MAP: Record<string, string> = {
  'Interventional Cardiology': 'Cardiology',
};

export function resolveDirectorySpecialty(specialty: string): string {
  return DIRECTORY_SPECIALTY_MAP[specialty] || specialty;
}
