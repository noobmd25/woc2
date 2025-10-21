import { formatISO } from 'date-fns';

export function toISODateString(dateStr: string) {
    // Try to parse the incoming string
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return undefined;
    // Format as ISO string (YYYY-MM-DD or full ISO)
    return formatISO(parsed, { representation: 'date' }); // '2025-11-09'
}

