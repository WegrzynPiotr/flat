export const capitalize = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const capitalizeFullName = (firstName?: string, lastName?: string): string => {
  const first = capitalize(firstName);
  const last = capitalize(lastName);
  return `${first} ${last}`.trim();
};
