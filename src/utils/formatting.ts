/**
 * Shared formatting utilities for the application.
 */

/**
 * Formats a number as a currency string.
 * @param amount - The amount to format.
 * @param currency - The currency code (default: 'DKK').
 * @param locale - The locale to use for formatting (default: 'en-DK').
 * @returns The formatted currency string.
 */
export const formatCurrency = (
    amount: number,
    currency: string = 'DKK',
    locale: string = 'en-DK'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

/**
 * Formats a date string into a readable date.
 * @param dateString - The date string to format.
 * @param locale - The locale to use for formatting (default: 'en-DK').
 * @returns The formatted date string, or 'Invalid date' if the input is invalid.
 */
export const formatDate = (dateString: string, locale: string = 'en-DK'): string => {
    if (!dateString) return 'No date';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        console.warn('Invalid date format:', dateString);
        return 'Invalid date';
    }
};

/**
 * Formats a date string into a readable date with time.
 * @param dateString - The date string to format.
 * @param locale - The locale to use for formatting (default: 'en-DK').
 * @returns The formatted date string with time.
 */
export const formatDateTime = (dateString: string, locale: string = 'en-DK'): string => {
    if (!dateString) return 'No date';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        console.warn('Invalid date format:', dateString);
        return 'Invalid date';
    }
};
