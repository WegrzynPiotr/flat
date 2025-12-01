import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'dd.MM.yyyy', { locale: pl });
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl });
};

export const formatTimeAgo = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
};
