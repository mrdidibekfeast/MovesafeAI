import { useEffect } from 'react';

/*
 * Sets the browser tab title for a page and restores the default when the
 * page unmounts. Titles never include user names, emails, IDs, report IDs,
 * or file names.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | MoveSafe AI`;
    return () => {
      document.title = 'MoveSafe AI';
    };
  }, [title]);
}
