/** Joins truthy class names */
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
