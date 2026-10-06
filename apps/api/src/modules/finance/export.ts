/** Plain decimal TND for spreadsheets (e.g. 12.5). */
export const csvTnd = (millimes: number) => (millimes / 1000).toFixed(3);
